import { callAI, hasAI } from "./client";
import type { Job, ProfessionalProfile } from "@/types";
import {
  collectJobSkillsEnhanced,
  filterRelevantProfileSkills,
} from "@/lib/jobs/inferJobSkills";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";
import { profileHasSkill } from "@/lib/skills/normalize";
import type { JobSkillAnalysis } from "@/lib/matching/engine";

interface AIJobSkillResult {
  requiredSkills: string[];
  preferredSkills: string[];
  summary: string;
}

function buildSkillAnalysis(
  profile: ProfessionalProfile,
  job: Job,
  jobSkills: string[],
  inferred: boolean,
  aiSummary?: string
): JobSkillAnalysis {
  const inventory = extractResumeSkills(profile);
  const matchedSkills = jobSkills.filter((js) => profileHasSkill(inventory.skillSet, js));
  const missingSkills = jobSkills.filter((js) => !profileHasSkill(inventory.skillSet, js));
  const relevantProfileSkills = filterRelevantProfileSkills(
    inventory.allSkills,
    jobSkills,
    job
  );
  const matchedRelevantSkills = relevantProfileSkills.filter((s) =>
    profileHasSkill(inventory.skillSet, s)
  );
  const extraProfileSkills = inventory.allSkills.filter(
    (s) => !relevantProfileSkills.includes(s)
  );

  return {
    jobSkills,
    matchedSkills,
    missingSkills,
    profileSkills: inventory.allSkills,
    relevantProfileSkills,
    matchedRelevantSkills,
    extraProfileSkills,
    skillsInferred: inferred,
    skillSummary: aiSummary,
  };
}

/** AI-powered skill extraction when OpenAI is available; rule-based fallback otherwise */
export async function extractJobSkillsForMatch(
  profile: ProfessionalProfile,
  job: Job
): Promise<JobSkillAnalysis> {
  const { skills: ruleSkills, inferred } = collectJobSkillsEnhanced(job);

  if (!hasAI()) {
    return buildSkillAnalysis(profile, job, ruleSkills, inferred);
  }

  const inventory = extractResumeSkills(profile);
  const systemPrompt = `You extract job-required technical skills from job postings and compare them to a candidate resume.
Return JSON: {
  "requiredSkills": string[] (must-have technical skills for this role),
  "preferredSkills": string[] (nice-to-have skills),
  "summary": string (1 sentence explaining the skill fit)
}
Include testing tools, languages, frameworks, and platforms explicitly or strongly implied by the job title and description.
Do not include soft skills. Use standard names (e.g. "Selenium", "API Testing", "Java").`;

  const userPrompt = `Job title: ${job.title}
Company: ${job.company}
Description (${job.descriptionPartial ? "PARTIAL PREVIEW" : "full"}):
${job.description.slice(0, 4000)}

Candidate resume skills: ${inventory.allSkills.join(", ") || "none listed"}

Extract all technical skills this job likely requires based on title + description. For QA/testing roles include typical tools even if not every tool is in the partial description.`;

  const { data } = await callAI<AIJobSkillResult>(
    systemPrompt,
    userPrompt,
    () => ({
      requiredSkills: ruleSkills,
      preferredSkills: [],
      summary: "",
    })
  );

  const aiSkills = Array.from(
    new Set([...(data.requiredSkills || []), ...(data.preferredSkills || [])])
  ).filter(Boolean);

  const jobSkills =
    aiSkills.length >= ruleSkills.length ? aiSkills : ruleSkills;

  return buildSkillAnalysis(
    profile,
    job,
    jobSkills,
    inferred || job.descriptionPartial === true,
    data.summary || undefined
  );
}
