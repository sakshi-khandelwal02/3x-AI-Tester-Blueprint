import type { Job, MatchCategory, MatchResult, ProfessionalProfile } from "@/types";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";
import { extractSkillsFromText, profileHasSkill, normalizeSkillCanonical } from "@/lib/skills/normalize";
import { stripHtml } from "@/lib/utils";
import { collectJobSkillsEnhanced, filterRelevantProfileSkills } from "@/lib/jobs/inferJobSkills";
import { skillsMatch } from "@/lib/skills/normalize";

function calculateRoleRelevance(job: Job, targetRole?: string): number {
  if (!targetRole) return 70;
  const title = job.title.toLowerCase();
  const role = targetRole.toLowerCase();
  if (title.includes(role) || role.includes(title.split(" ")[0])) return 94;
  const related = [
    "quality", "qa", "test", "automation", "engineer", "developer",
    "backend", "platform", "cloud", "devops", "sre",
  ];
  const jobWords = title.split(/\s+/);
  const roleWords = role.split(/\s+/);
  const overlap = jobWords.filter((w) => roleWords.includes(w) || related.includes(w)).length;
  if (overlap >= 2) return 85;
  if (title.includes("marketing") || title.includes("sales")) return 4;
  return Math.max(25, overlap * 25);
}

function categorize(score: number): MatchCategory {
  if (score >= 85) return "EXCELLENT_MATCH";
  if (score >= 70) return "GOOD_MATCH";
  if (score >= 50) return "STRETCH_OPPORTUNITY";
  return "LOW_MATCH";
}

function getRecommendation(category: MatchCategory): MatchResult["recommendation"] {
  switch (category) {
    case "EXCELLENT_MATCH": return "APPLY_NOW";
    case "GOOD_MATCH": return "PREPARE_THEN_APPLY";
    case "STRETCH_OPPORTUNITY": return "CONSIDER";
    default: return "SKIP";
  }
}

/** Collect skills required by the job from description + title + role inference */
export function collectJobSkills(job: Job): string[] {
  return collectJobSkillsEnhanced(job).skills;
}

export interface JobSkillAnalysis {
  jobSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  profileSkills: string[];
  relevantProfileSkills: string[];
  matchedRelevantSkills: string[];
  extraProfileSkills: string[];
  skillsInferred?: boolean;
  skillSummary?: string;
}

export interface ScoreBreakdown {
  skills: number;
  role: number;
  experience: number;
  location: number;
  overall: number;
}

export function analyzeJobSkills(profile: ProfessionalProfile, job: Job): JobSkillAnalysis {
  const inventory = extractResumeSkills(profile);
  const { skills: jobSkills, inferred } = collectJobSkillsEnhanced(job);
  const matchedSkills = jobSkills.filter((js) => profileHasSkill(inventory.skillSet, js));
  const missingSkills = jobSkills.filter((js) => !profileHasSkill(inventory.skillSet, js));
  const relevantProfileSkills = filterRelevantProfileSkills(inventory.allSkills, jobSkills, job);
  const matchedRelevantSkills = relevantProfileSkills.filter((s) =>
    matchedSkills.some((m) => skillsMatch(s, m))
  );
  const extraProfileSkills = inventory.allSkills.filter((s) => !relevantProfileSkills.includes(s));

  return {
    jobSkills,
    matchedSkills,
    missingSkills,
    profileSkills: inventory.allSkills,
    relevantProfileSkills,
    matchedRelevantSkills,
    extraProfileSkills,
    skillsInferred: inferred,
  };
}

export function enrichJobRecord(job: Job): Job {
  const description = stripHtml(job.description);
  const skills = collectJobSkills({ ...job, description });
  const descriptionPartial =
    job.descriptionPartial ??
    (description.endsWith("…") ||
      description.endsWith("...") ||
      description.length >= 498);

  return {
    ...job,
    description,
    skills,
    descriptionPartial,
  };
}

function isMandatoryInContext(skill: string, description: string): boolean {
  const descLower = description.toLowerCase();
  const idx = descLower.indexOf(skill.toLowerCase());
  if (idx === -1) return false;
  const context = descLower.slice(Math.max(0, idx - 60), idx + 60);
  return ["required", "must have", "mandatory", "must-have", "essential"].some((k) =>
    context.includes(k)
  );
}

export function calculateMatch(
  profile: ProfessionalProfile,
  job: Job,
  targetRole?: string
): MatchResult {
  const inventory = extractResumeSkills(profile);
  const plainDescription = stripHtml(job.description);
  const jobSkills = collectJobSkills(job);

  const matchedSkills = jobSkills.filter((js) => profileHasSkill(inventory.skillSet, js));
  const missingSkills = jobSkills.filter((js) => !profileHasSkill(inventory.skillSet, js));

  const missingMandatory = missingSkills.filter((s) =>
    isMandatoryInContext(s, plainDescription)
  );
  const missingPreferred = missingSkills.filter((s) => !missingMandatory.includes(s));

  const displayMissingMandatory = missingMandatory.length > 0 ? missingMandatory : [];
  const displayMissingPreferred =
    missingPreferred.length > 0
      ? missingPreferred
      : missingSkills.slice(0, 6);

  const skillScore =
    jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 50;

  const roleRelevance = calculateRoleRelevance(job, targetRole);
  const expRequired = parseExperience(job.experience || plainDescription);
  const expMatch = expRequired === null || profile.experienceYears >= expRequired * 0.8;
  const expScore =
    expRequired === null ? 80 : expMatch ? 100 : Math.max(20, (profile.experienceYears / expRequired) * 100);

  const locationMatch =
    job.remoteType === "REMOTE" || job.location.toLowerCase().includes("remote");
  const locationScore = locationMatch ? 100 : 70;

  const overall = Math.round(
    roleRelevance * 0.2 +
      skillScore * 0.45 +
      expScore * 0.2 +
      locationScore * 0.1 +
      (100 - displayMissingMandatory.length * 10) * 0.05
  );

  let clampedScore = Math.max(0, Math.min(100, overall));

  if (jobSkills.length >= 3 && matchedSkills.length / jobSkills.length < 0.35) {
    clampedScore = Math.min(clampedScore, 58);
  }
  if (jobSkills.length >= 5 && matchedSkills.length / jobSkills.length < 0.25) {
    clampedScore = Math.min(clampedScore, 45);
  }

  const scoreBreakdown: ScoreBreakdown = {
    skills: Math.round(skillScore),
    role: Math.round(roleRelevance),
    experience: Math.round(expScore),
    location: Math.round(locationScore),
    overall: clampedScore,
  };
  const category = categorize(clampedScore);

  const strengths = [
    ...matchedSkills.slice(0, 6).map((s) => `${s} — on your resume`),
    roleRelevance >= 70 ? `Role aligns with your target (${targetRole || profile.currentRole})` : "",
    expMatch ? `${profile.experienceYears}+ years experience meets requirement` : "",
  ].filter(Boolean);

  const concerns = [
    ...displayMissingMandatory.map((s) => `Required skill not on resume: ${s}`),
    ...displayMissingPreferred.slice(0, 4).map((s) => `Skill gap: ${s}`),
    !expMatch && expRequired
      ? `Experience: ${profile.experienceYears} years vs ${expRequired}+ preferred`
      : "",
  ].filter(Boolean);

  return {
    jobId: job.id,
    matchScore: clampedScore,
    category,
    recommendation: getRecommendation(category),
    roleRelevance,
    matchedSkills,
    missingMandatorySkills: displayMissingMandatory,
    missingPreferredSkills: displayMissingPreferred,
    experienceMatch: {
      required: job.experience,
      candidate: profile.experienceYears,
      match: expMatch,
      note: expMatch
        ? `You have ${profile.experienceYears}+ years — requirement met`
        : expRequired
          ? `Job prefers ${expRequired}+ years; you have ${profile.experienceYears}`
          : "No explicit experience requirement found",
    },
    locationMatch: {
      match: locationMatch,
      note: locationMatch
        ? "Remote-friendly role"
        : `Location: ${job.location}`,
    },
    roleMatch: {
      match: roleRelevance >= 70,
      note:
        roleRelevance >= 70
          ? "Job title aligns with your career path"
          : "Job title may be outside your primary focus",
    },
    industryMatch: { match: true, note: "Review company domain in job description" },
    strengths,
    concerns,
    reasoningSummary: buildReasoning(category, matchedSkills, displayMissingMandatory, jobSkills.length, job.descriptionPartial),
    whyMatch: strengths,
    whyNotMatch: concerns,
    applyAdvice: buildApplyAdvice(category, matchedSkills, displayMissingMandatory, displayMissingPreferred, jobSkills.length),
    scoreBreakdown,
  };
}

function parseExperience(text: string): number | null {
  const match = text.match(/(\d+)\+?\s*years?/i);
  return match ? parseInt(match[1], 10) : null;
}

function buildReasoning(
  category: MatchCategory,
  matched: string[],
  missingMandatory: string[],
  totalJobSkills: number,
  descriptionPartial?: boolean
): string {
  const matchedList = matched.slice(0, 5).join(", ");
  const count = matched.length;
  const partialNote = descriptionPartial
    ? " (Skill list inferred from job title + preview — open the full posting for complete requirements.)"
    : "";

  if (count === 0 && totalJobSkills === 0) {
    return "Match score is based mainly on role title and experience. No technical skills were detected in the available job text.";
  }

  if (category === "EXCELLENT_MATCH") {
    return count > 0
      ? `You match ${count} of ${totalJobSkills} skills detected${matchedList ? `: ${matchedList}` : ""}.${partialNote}`
      : `Strong role and experience alignment.${partialNote}`;
  }
  if (category === "GOOD_MATCH") {
    return count > 0
      ? `Good fit — ${count} of ${totalJobSkills} required skills match${matchedList ? ` (${matchedList})` : ""}.${missingMandatory.length ? ` Gaps: ${missingMandatory.slice(0, 2).join(", ")}.` : ""}${partialNote}`
      : `Good role alignment — review skill gaps below.${partialNote}`;
  }
  if (category === "STRETCH_OPPORTUNITY") {
    return count > 0
      ? `Partial fit — ${count} of ${totalJobSkills} skills match${matchedList ? ` (${matchedList})` : ""}. ${totalJobSkills - count} skill gap${totalJobSkills - count !== 1 ? "s" : ""} remain.${partialNote}`
      : `Role title fits your direction, but ${totalJobSkills} skill gap${totalJobSkills !== 1 ? "s" : ""} vs this posting.${partialNote}`;
  }
  return `Low skill overlap (${count}/${totalJobSkills} matched). Consider upskilling before applying.${partialNote}`;
}

function buildApplyAdvice(
  category: MatchCategory,
  matched: string[],
  missingMandatory: string[],
  missingPreferred: string[],
  totalJobSkills: number
): string {
  const topMissing = missingMandatory[0] || missingPreferred[0];
  switch (category) {
    case "EXCELLENT_MATCH":
      return matched.length
        ? `Strong match on ${matched.length} of ${totalJobSkills} skills — optimize your resume and apply.`
        : "Profile aligns well — tailor your resume to this job description before applying.";
    case "GOOD_MATCH":
      if (missingMandatory.length) {
        return `Address ${missingMandatory.slice(0, 2).join(" and ")} to strengthen your application.`;
      }
      if (missingPreferred.length) {
        return `Consider building ${missingPreferred.slice(0, 2).join(" or ")} to stand out.`;
      }
      return "Good match — highlight relevant experience on your resume and apply.";
    case "STRETCH_OPPORTUNITY":
      if (topMissing) {
        return `You match ${matched.length} of ${totalJobSkills} skills. Build ${topMissing}${missingPreferred.length > 1 ? ` and ${missingPreferred.slice(1, 3).join(", ")}` : ""} before applying, or apply with a strong cover letter highlighting ${matched.slice(0, 2).join(" and ") || "transferable experience"}.`;
      }
      return "Stretch role — close skill gaps first or apply with a targeted cover letter.";
    default:
      return `Only ${matched.length} of ${totalJobSkills} skills match — use the learning plan to close gaps first.`;
  }
}

export function calculateRelevance(job: Job, targetRole?: string): number {
  return calculateRoleRelevance(job, targetRole);
}

export function filterRelevantJobs(jobs: Job[], targetRole?: string, threshold = 30): Job[] {
  return jobs.filter((j) => calculateRoleRelevance(j, targetRole) >= threshold);
}
