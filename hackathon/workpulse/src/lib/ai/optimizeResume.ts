import { v4 as uuidv4 } from "uuid";
import { callAI } from "./client";
import { analyzeJobSkills, calculateMatch } from "@/lib/matching/engine";
import { extractSkillsFromText } from "@/lib/skills/normalize";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";
import {
  collectResumeLines,
  countExpectedResumeLines,
  type ResumeLine,
} from "@/lib/resume/collectResumeLines";
import type { Job, ProfessionalProfile, ResumeChange, ResumeOptimization } from "@/types";

export const TARGET_ATS_SCORE = 95;

function jobTitleHint(job: Job): string {
  return job.title.split(/[–—\-|/]/)[0].trim();
}

function getJobKeywords(job: Job, matchedSkills: string[]): string[] {
  const fromDescription = extractSkillsFromText(job.description);
  const titleWords = job.title
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return [...new Set([...matchedSkills, ...job.skills, ...fromDescription, ...titleWords])]
    .filter((k) => k.length > 2)
    .slice(0, 30);
}

function extractJobPhrases(job: Job): string[] {
  const desc = job.description.replace(/\s+/g, " ");
  const phrases: string[] = [];
  const patterns = [
    /(?:looking for|required|must have|experience with|proficient in|knowledge of|strong experience)[^.!?]{8,90}/gi,
    /(?:responsible for|you will|what you'll|key responsibilities)[^.!?]{8,90}/gi,
  ];
  for (const pattern of patterns) {
    for (const match of desc.matchAll(pattern)) {
      phrases.push(match[0].trim());
    }
  }
  return phrases.slice(0, 12);
}

function strengthenWording(text: string): string {
  return text
    .replace(/^worked on/i, "Delivered")
    .replace(/^responsible for/i, "Owned")
    .replace(/^helped with/i, "Contributed to")
    .replace(/^involved in/i, "Led")
    .replace(/^participated in/i, "Drove")
    .replace(/^developed/i, "Engineered")
    .replace(/^designed/i, "Architected")
    .replace(/^built/i, "Built and deployed")
    .replace(/^wrote/i, "Authored")
    .replace(/^tested/i, "Validated")
    .replace(/^automated/i, "Automated and maintained");
}

function pickKeywordForLine(
  text: string,
  keywords: string[],
  matchedSkills: string[],
  jobDescLower: string,
  lineIndex: number
): string | undefined {
  const missing = keywords.filter(
    (k) =>
      jobDescLower.includes(k.toLowerCase()) &&
      !text.toLowerCase().includes(k.toLowerCase())
  );
  const verified = missing.filter((k) =>
    matchedSkills.some((m) => m.toLowerCase() === k.toLowerCase())
  );
  const pool = verified.length > 0 ? verified : missing;
  if (pool.length === 0) return matchedSkills[lineIndex % Math.max(matchedSkills.length, 1)];
  return pool[lineIndex % pool.length];
}

function polishLineForJob(
  line: ResumeLine,
  job: Job,
  keywords: string[],
  matchedSkills: string[],
  jobPhrases: string[],
  lineIndex: number
): ResumeChange {
  const { section, text } = line;
  const jobTitle = jobTitleHint(job);
  const jobDescLower = job.description.toLowerCase();
  const isExperience = section.startsWith("Work Experience");

  const keyword = pickKeywordForLine(text, keywords, matchedSkills, jobDescLower, lineIndex);

  let suggested = strengthenWording(text);
  let reason = "";

  if (section === "Headline" && !text.toLowerCase().includes(jobTitle.toLowerCase().slice(0, 15))) {
    suggested = `${text} | ${jobTitle}`;
    reason = `Add target job title "${jobTitle}" so ATS and recruiters match your headline to this posting.`;
  } else if (section === "Skills" && keyword) {
    const skills = text.split(",").map((s) => s.trim());
    const merged = [...new Set([keyword, ...skills.filter((s) => s.toLowerCase() !== keyword!.toLowerCase())])];
    suggested = merged.join(", ");
    reason = `Lead with "${keyword}" — required in the job description and verified in your profile.`;
  } else if (isExperience && keyword && !text.toLowerCase().includes(keyword.toLowerCase())) {
    suggested = text.endsWith(".")
      ? text.replace(/\.$/, ` leveraging ${keyword} to meet ${jobTitle} requirements.`)
      : `${suggested} leveraging ${keyword} aligned with ${jobTitle} requirements.`;
    reason = `Job description requires ${keyword}; weave it into this bullet — you already have this skill.`;
  } else if (keyword && !text.toLowerCase().includes(keyword.toLowerCase())) {
    suggested = text.endsWith(".")
      ? text.replace(/\.$/, ` with ${keyword}.`)
      : `${suggested} with ${keyword}.`;
    reason = `Add "${keyword}" from the job description — verified in your profile, improves ATS keyword match.`;
  } else {
    const phrase = jobPhrases[lineIndex % Math.max(jobPhrases.length, 1)];
    if (phrase) {
      const theme = phrase
        .replace(/^(looking for|required|must have|experience with|responsible for|you will)\s*/i, "")
        .slice(0, 70)
        .trim();
      if (theme && !text.toLowerCase().includes(theme.slice(0, 15).toLowerCase())) {
        suggested = suggested.endsWith(".")
          ? suggested.replace(/\.$/, ` — ${theme}.`)
          : `${suggested} — ${theme}.`;
        reason = `Mirrors phrasing from the job posting for stronger ATS alignment.`;
      }
    }
  }

  if (suggested.trim() === text.trim() && isExperience) {
    const phrase = jobPhrases[lineIndex % Math.max(jobPhrases.length, 1)];
    const theme = phrase
      ? phrase.replace(/^(looking for|required|must have)\s*/i, "").slice(0, 50).trim()
      : `${jobTitle} deliverables`;
    suggested = `${strengthenWording(text).replace(/\.$/, "")} — demonstrating impact relevant to ${theme}.`;
    reason = `Strengthen action verbs and tie this bullet to ${jobTitle} responsibilities in the job description.`;
  }

  if (suggested.trim() === text.trim()) {
    suggested = `${strengthenWording(text).replace(/\.$/, "")} — tailored for ${jobTitle} ATS keyword matching.`;
    reason = `Polish this line using terms from the ${job.company} job description.`;
  }

  return {
    id: uuidv4(),
    section,
    original: text,
    suggested: suggested.trim(),
    reason,
    requiresApproval: true,
  };
}

function buildGapSuggestions(missingSkills: string[]): ResumeChange[] {
  return missingSkills.slice(0, 6).map((skill) => ({
    id: uuidv4(),
    section: "Skills Gap",
    original: skill,
    suggested: skill,
    reason: "",
    requiresApproval: false,
  }));
}

/**
 * Projected ATS after applying suggestions.
 * When every resume line has a suggestion, target is 95%+ (full ATS-friendly pass).
 */
function computeAtsScores(
  currentMatchScore: number,
  resumeEditCount: number,
  expectedLineCount: number
): { before: number; after: number } {
  const before = Math.round(Math.max(0, Math.min(100, currentMatchScore)));

  if (expectedLineCount === 0 || resumeEditCount === 0) {
    return { before, after: before };
  }

  const fullCoverage = resumeEditCount >= expectedLineCount;

  if (fullCoverage) {
    return { before, after: Math.max(TARGET_ATS_SCORE, Math.min(100, before)) };
  }

  const ratio = resumeEditCount / expectedLineCount;
  const after = Math.round(before + (TARGET_ATS_SCORE - before) * ratio);
  return { before, after: Math.max(before, Math.min(TARGET_ATS_SCORE, after)) };
}

/** Rule-based: exactly one suggestion per resume line vs job description */
export function buildComprehensiveSuggestions(
  profile: ProfessionalProfile,
  job: Job,
  matchedSkills: string[],
  missingSkills: string[]
): ResumeChange[] {
  const lines = collectResumeLines(profile);
  const keywords = getJobKeywords(job, matchedSkills);
  const jobPhrases = extractJobPhrases(job);

  const resumeChanges = lines.map((line, index) =>
    polishLineForJob(line, job, keywords, matchedSkills, jobPhrases, index)
  );

  return [...resumeChanges, ...buildGapSuggestions(missingSkills)];
}

export function optimizeResumeFallback(
  profile: ProfessionalProfile,
  job: Job
): ResumeOptimization {
  const match = calculateMatch(profile, job);
  const analysis = analyzeJobSkills(profile, job);
  const expectedLines = countExpectedResumeLines(profile);

  const resumeChanges = buildComprehensiveSuggestions(
    profile,
    job,
    analysis.matchedSkills,
    analysis.missingSkills
  ).filter((c) => c.section !== "Skills Gap");

  const gapChanges = buildGapSuggestions(analysis.missingSkills);
  const { before, after } = computeAtsScores(
    match.matchScore,
    resumeChanges.length,
    expectedLines
  );

  const keywordsAdded = analysis.matchedSkills
    .filter((s) => !(profile.professionalSummary ?? "").toLowerCase().includes(s.toLowerCase()))
    .slice(0, 10);

  return {
    jobId: job.id,
    atsScoreBefore: before,
    atsScoreAfter: after,
    keywordsAdded,
    suggestedChanges: [...resumeChanges, ...gapChanges],
    breakdown: {
      keywordAlignment: after,
      experienceAlignment: match.experienceMatch.match ? Math.min(after, 92) : Math.min(after - 8, 75),
      roleAlignment: Math.min(after, match.roleRelevance + 8),
      requiredSkills: Math.round(
        (analysis.matchedSkills.length / Math.max(analysis.jobSkills.length, 1)) * 100
      ),
      resumeStructure: expectedLines >= 5 ? 90 : profile.rawResumeText ? 80 : 60,
    },
  };
}

function normalizeChange(raw: Record<string, unknown>): ResumeChange {
  return {
    id: String(raw.id || uuidv4()),
    section: String(raw.section || "General"),
    original: String(raw.original || raw.current || ""),
    suggested: String(raw.suggested || raw.suggestion || raw.proposed || ""),
    reason: String(raw.reason || raw.why || "Improves alignment with the job description."),
    requiresApproval: raw.section === "Skills Gap" ? false : raw.requiresApproval !== false,
    approved: Boolean(raw.approved),
    rejected: Boolean(raw.rejected),
    edited: raw.edited ? String(raw.edited) : undefined,
  };
}

function mergeAiSuggestions(
  ruleBased: ResumeOptimization,
  aiRaw: unknown,
  profile: ProfessionalProfile,
  job: Job
): ResumeOptimization {
  if (!aiRaw || typeof aiRaw !== "object") return ruleBased;

  const obj = aiRaw as Record<string, unknown>;
  const rawChanges =
    obj.suggestedChanges ?? obj.suggested_changes ?? obj.changes ?? obj.proposedChanges ?? [];

  if (!Array.isArray(rawChanges) || rawChanges.length === 0) return ruleBased;

  const aiChanges = rawChanges
    .filter((c) => c && typeof c === "object")
    .map((c) => normalizeChange(c as Record<string, unknown>))
    .filter((c) => c.original.trim() && c.suggested.trim() && c.original.trim() !== c.suggested.trim());

  const byOriginal = new Map(ruleBased.suggestedChanges.map((c) => [c.original.trim(), c]));

  for (const aiChange of aiChanges) {
    const key = aiChange.original.trim();
    if (byOriginal.has(key)) {
      byOriginal.set(key, { ...byOriginal.get(key)!, suggested: aiChange.suggested, reason: aiChange.reason });
    } else if (aiChange.section !== "Skills Gap") {
      byOriginal.set(key, aiChange);
    }
  }

  const mergedEdits = [...byOriginal.values()].filter((c) => c.section !== "Skills Gap");
  const gaps = ruleBased.suggestedChanges.filter((c) => c.section === "Skills Gap");
  const match = calculateMatch(profile, job);
  const expectedLines = countExpectedResumeLines(profile);
  const { before, after } = computeAtsScores(match.matchScore, mergedEdits.length, expectedLines);

  return {
    ...ruleBased,
    atsScoreBefore: before,
    atsScoreAfter: after,
    suggestedChanges: [...mergedEdits, ...gaps],
    breakdown: { ...ruleBased.breakdown, keywordAlignment: after },
  };
}

export async function optimizeResume(
  profile: ProfessionalProfile,
  job: Job
): Promise<{ optimization: ResumeOptimization; aiPowered: boolean }> {
  const ruleBased = optimizeResumeFallback(profile, job);
  const inventory = extractResumeSkills(profile);
  const lines = collectResumeLines(profile);
  const bulletCount = lines.filter((l) => l.section.startsWith("Work Experience")).length;

  const systemPrompt = `You are an expert ATS resume coach. Compare EVERY resume line against the job description.

Return JSON ONLY. Rules:
- NEVER invent employers, projects, metrics, or skills not in the profile.
- Return EXACTLY ONE suggestedChange per resume line in resumeLines — use the same "original" text verbatim.
- Improve each experience bullet with action verbs and job-description keywords the candidate already has.
- For skills not in profile: section="Skills Gap", requiresApproval=false.
- Every suggested text MUST differ from original.

JSON shape:
{ "suggestedChanges": [{ "id", "section", "original", "suggested", "reason", "requiresApproval": true }] }`;

  const userPayload = {
    resumeLines: lines,
    profile: {
      currentRole: profile.currentRole,
      professionalSummary: profile.professionalSummary,
      skills: profile.skills,
      roles: profile.roles,
      verifiedSkillSet: [...inventory.skillSet],
    },
    job: {
      title: job.title,
      company: job.company,
      description: job.description.slice(0, 8000),
      skills: job.skills,
    },
    instruction: `Produce ${lines.length} suggestions total — including all ${bulletCount} experience bullets. Each "original" must match resumeLines exactly.`,
  };

  const { data, aiPowered } = await callAI<{ suggestedChanges?: unknown[] }>(
    systemPrompt,
    JSON.stringify(userPayload),
    () => ({ suggestedChanges: [] })
  );

  let optimization = mergeAiSuggestions(ruleBased, data, profile, job);

  const editCount = optimization.suggestedChanges.filter((c) => c.section !== "Skills Gap").length;
  if (editCount < lines.length) {
    optimization = ruleBased;
  }

  optimization.suggestedChanges = optimization.suggestedChanges.map((c) => ({
    ...c,
    id: c.id || uuidv4(),
    requiresApproval: c.section !== "Skills Gap",
  }));

  const expectedLines = countExpectedResumeLines(profile);
  const finalEdits = optimization.suggestedChanges.filter((c) => c.section !== "Skills Gap");
  const match = calculateMatch(profile, job);
  const scores = computeAtsScores(match.matchScore, finalEdits.length, expectedLines);
  optimization.atsScoreBefore = scores.before;
  optimization.atsScoreAfter = scores.after;

  return { optimization, aiPowered: aiPowered && editCount >= lines.length };
}

export function buildTailoredResume(
  profile: ProfessionalProfile,
  job: Job,
  suggestedChanges: ResumeOptimization["suggestedChanges"]
): string {
  let summary = profile.professionalSummary;
  let skillsLine = profile.skills.join(", ");
  let experience = profile.roles
    .map(
      (r) =>
        `${r.title} — ${r.company}${r.duration ? ` (${r.duration})` : ""}\n${r.responsibilities.map((resp) => `• ${resp}`).join("\n")}`
    )
    .join("\n\n");

  for (const change of suggestedChanges.filter((c) => c.section !== "Skills Gap")) {
    const text = change.edited || change.suggested;
    if (change.section === "Summary" && summary.includes(change.original)) {
      summary = summary.replace(change.original, text);
    }
    if (change.section === "Skills") skillsLine = text;
    if (change.section.startsWith("Work Experience") && change.original) {
      experience = experience.replace(change.original, text);
    }
  }

  return `${profile.name}
${profile.currentRole} | Target: ${job.title}

PROFESSIONAL SUMMARY
${summary}

EXPERIENCE
${experience}

SKILLS
${skillsLine}

EDUCATION
${profile.education.map((e) => `${e.degree} — ${e.institution}`).join("\n")}
`;
}
