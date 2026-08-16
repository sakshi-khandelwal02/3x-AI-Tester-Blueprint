import type { Job, MatchResult, ProfessionalProfile, SkillGap, SkillLevel } from "@/types";
import { analyzePrioritizedSkillGaps } from "@/lib/skills/analyzeGaps";
import { getLearningResourcesForSkill } from "@/lib/skills/learningResources";

export function analyzeSkillGapsForJob(
  profile: ProfessionalProfile,
  job: Job,
  allJobs: Job[],
  allMatches: Record<string, MatchResult>,
  marketDemand: Record<string, number> = {}
): SkillGap[] {
  const prioritized = analyzePrioritizedSkillGaps(profile, allJobs.length ? allJobs : [job], allMatches);
  const jobSkills = new Set(job.skills);

  const relevant = prioritized.filter(
    (g) => jobSkills.has(g.skill) || job.description.toLowerCase().includes(g.skill.toLowerCase())
  );

  const gaps = (relevant.length ? relevant : prioritized).slice(0, 6);

  return gaps.map((g) => ({
    skill: g.skill,
    candidateLevel: (g.gapType === "adjacent" ? "BEGINNER" : "NONE") as SkillLevel,
    requiredLevel: g.isMandatory ? "INTERMEDIATE" : "BEGINNER",
    importance: g.importance,
    marketDemand: marketDemand[g.skill] ?? g.jobPercentage,
    recommendedTopics: [`${g.skill} fundamentals`, `${g.skill} in production`],
    learningResources: getLearningResourcesForSkill(g.skill),
    explanation: `${g.whyItMatters} ${g.opportunityImpact}${
      g.relatedSkills.length ? ` Related experience: ${g.relatedSkills.join(", ")}.` : ""
    }`,
  }));
}

/** @deprecated use analyzeSkillGapsForJob — kept for API compat */
export function analyzeSkillGaps(
  profile: ProfessionalProfile,
  job: Job,
  marketDemand: Record<string, number> = {}
): SkillGap[] {
  return analyzeSkillGapsForJob(profile, job, [job], {}, marketDemand);
}
