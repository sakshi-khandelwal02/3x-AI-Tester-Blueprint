import type { Job, MatchCategory, MatchResult, ProfessionalProfile } from "@/types";
import { extractResumeSkills, isAdjacentSkill } from "@/lib/skills/resumeSkills";
import { normalizeSkillCanonical, profileHasSkill } from "@/lib/skills/normalize";
import { extractSkillsFromText } from "@/lib/skills/normalize";

export type SkillGapType = "confirmed_strength" | "adjacent" | "actual_gap";

export interface PrioritizedSkillGap {
  skill: string;
  gapType: SkillGapType;
  importance: "HIGH" | "MEDIUM" | "LOW";
  jobCount: number;
  jobPercentage: number;
  isMandatory: boolean;
  resumeEvidence: string | null;
  relatedSkills: string[];
  whyItMatters: string;
  opportunityImpact: string;
  priorityScore: number;
}

const RELEVANT_CATEGORIES: MatchCategory[] = [
  "EXCELLENT_MATCH",
  "GOOD_MATCH",
  "STRETCH_OPPORTUNITY",
];

function collectJobSkills(job: Job): string[] {
  if (job.skills.length > 0) return job.skills;
  return extractSkillsFromText(job.description);
}

function isMandatoryInJob(skill: string, description: string): boolean {
  const lower = description.toLowerCase();
  const skillLower = skill.toLowerCase();
  const idx = lower.indexOf(skillLower);
  if (idx < 0) return false;
  const context = lower.slice(Math.max(0, idx - 60), idx + 60);
  return /required|must have|mandatory|essential/.test(context);
}

export function analyzePrioritizedSkillGaps(
  profile: ProfessionalProfile,
  jobs: Job[],
  matches: Record<string, MatchResult>
): PrioritizedSkillGap[] {
  const inventory = extractResumeSkills(profile);

  const relevantJobs = jobs.filter((j) => {
    const cat = matches[j.id]?.category;
    return cat && RELEVANT_CATEGORIES.includes(cat);
  });

  if (relevantJobs.length === 0) return [];

  const skillStats: Record<
    string,
    { jobCount: number; mandatoryCount: number; categories: Set<MatchCategory> }
  > = {};

  for (const job of relevantJobs) {
    const jobSkills = collectJobSkills(job);
    const category = matches[job.id]?.category;
    for (const skill of jobSkills) {
      const canonical = normalizeSkillCanonical(skill);
      if (!skillStats[canonical]) {
        skillStats[canonical] = { jobCount: 0, mandatoryCount: 0, categories: new Set() };
      }
      skillStats[canonical].jobCount++;
      if (category) skillStats[canonical].categories.add(category);
      if (isMandatoryInJob(skill, job.description)) {
        skillStats[canonical].mandatoryCount++;
      }
    }
  }

  const totalRelevant = relevantJobs.length;
  const gaps: PrioritizedSkillGap[] = [];

  for (const [skill, stats] of Object.entries(skillStats)) {
    const hasSkill = profileHasSkill(inventory.skillSet, skill);
    if (hasSkill) continue;

    const { adjacent, relatedSkills } = isAdjacentSkill(inventory, skill);
    const gapType: SkillGapType = adjacent ? "adjacent" : "actual_gap";
    const jobPercentage = Math.round((stats.jobCount / totalRelevant) * 100);
    const isMandatory = stats.mandatoryCount > stats.jobCount * 0.3;

    const importance: "HIGH" | "MEDIUM" | "LOW" =
      isMandatory && jobPercentage >= 30
        ? "HIGH"
        : jobPercentage >= 20
          ? "MEDIUM"
          : "LOW";

    const priorityScore =
      jobPercentage * 0.4 +
      (isMandatory ? 30 : 10) +
      (gapType === "actual_gap" ? 20 : 10) +
      stats.jobCount * 2;

    gaps.push({
      skill,
      gapType,
      importance,
      jobCount: stats.jobCount,
      jobPercentage,
      isMandatory,
      resumeEvidence: null,
      relatedSkills,
      whyItMatters: buildWhyItMatters(skill, stats.jobCount, jobPercentage, relevantJobs.length),
      opportunityImpact: buildOpportunityImpact(skill, stats.jobCount, gapType, relatedSkills),
      priorityScore,
    });
  }

  return gaps
    .filter((g) => g.gapType === "actual_gap" || (g.gapType === "adjacent" && g.jobPercentage >= 15))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);
}

function buildWhyItMatters(
  skill: string,
  jobCount: number,
  percentage: number,
  totalJobs: number
): string {
  return `${skill} appears in ${jobCount} of ${totalJobs} relevant opportunities (${percentage}% of Excellent, Good, and Stretch matches).`;
}

function buildOpportunityImpact(
  skill: string,
  jobCount: number,
  gapType: SkillGapType,
  relatedSkills: string[]
): string {
  if (gapType === "adjacent" && relatedSkills.length > 0) {
    return `You demonstrate ${relatedSkills.join(", ")} experience. Adding ${skill} could unlock ${jobCount} additional aligned roles.`;
  }
  return `Learning ${skill} could improve alignment with ${jobCount} currently relevant opportunities.`;
}

export function getConfirmedStrengths(
  profile: ProfessionalProfile,
  jobs: Job[],
  matches: Record<string, MatchResult>,
  limit = 6
): string[] {
  const inventory = extractResumeSkills(profile);
  const relevantJobs = jobs.filter((j) => matches[j.id]?.category && RELEVANT_CATEGORIES.includes(matches[j.id]!.category));

  const demandCounts: Record<string, number> = {};
  for (const job of relevantJobs) {
    for (const skill of collectJobSkills(job)) {
      const canonical = normalizeSkillCanonical(skill);
      if (profileHasSkill(inventory.skillSet, canonical)) {
        demandCounts[canonical] = (demandCounts[canonical] || 0) + 1;
      }
    }
  }

  return Object.entries(demandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([skill]) => skill);
}
