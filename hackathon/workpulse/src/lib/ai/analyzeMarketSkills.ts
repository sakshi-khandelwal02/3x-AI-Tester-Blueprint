import type {
  CareerGapInsight,
  CareerReadiness,
  Job,
  MarketSkillStat,
  PrioritizedSkillGap,
  ProfessionalProfile,
  StrongestMarketOpportunity,
} from "@/types";
import type { MatchResult } from "@/types";
import { analyzePrioritizedSkillGaps, getConfirmedStrengths } from "@/lib/skills/analyzeGaps";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";
import { normalizeSkillCanonical, profileHasSkill, extractSkillsFromText } from "@/lib/skills/normalize";
import { computeStrongestMarketOpportunity } from "@/lib/market/opportunity";
import { computeRoleSkillDemand } from "@/lib/market/roleSkillDemand";

export function analyzeMarketSkills(
  jobs: Job[],
  profile: ProfessionalProfile,
  matches: Record<string, MatchResult> = {},
  targetRole?: string
): {
  skills: MarketSkillStat[];
  gaps: CareerGapInsight[];
  readiness: CareerReadiness;
  totalJobsAnalyzed: number;
  strongestOpportunity: StrongestMarketOpportunity;
  prioritizedGaps: PrioritizedSkillGap[];
  roleSkillDemand: ReturnType<typeof computeRoleSkillDemand>;
} {
  const relevantJobs = targetRole
    ? jobs.filter((j) => {
        const text = `${j.title} ${j.description}`.toLowerCase();
        const roleWords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        return roleWords.some((w) => text.includes(w));
      })
    : jobs;

  const analyzed = relevantJobs.length > 0 ? relevantJobs : jobs;
  const inventory = extractResumeSkills(profile);
  const skillCounts: Record<string, number> = {};

  for (const job of analyzed) {
    const skills = job.skills.length > 0 ? job.skills : extractSkillsFromText(job.description);
    for (const skill of skills) {
      const key = normalizeSkillCanonical(skill);
      skillCounts[key] = (skillCounts[key] || 0) + 1;
    }
  }

  const total = analyzed.length || 1;
  const skills: MarketSkillStat[] = Object.entries(skillCounts)
    .map(([skill, count]) => ({
      skill,
      jobCount: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 15);

  const prioritizedGaps = analyzePrioritizedSkillGaps(profile, jobs, matches);

  const gaps: CareerGapInsight[] = prioritizedGaps
    .filter((g) => g.gapType === "actual_gap")
    .slice(0, 5)
    .map((g) => ({
      skill: g.skill,
      marketPercentage: g.jobPercentage,
      inProfile: false,
      recommendation: `${g.skill} appears in ${g.jobCount} relevant opportunities (${g.jobPercentage}%). ${g.opportunityImpact}`,
    }));

  const topStrengths = getConfirmedStrengths(profile, jobs, matches, 4);
  const topGaps = prioritizedGaps.filter((g) => g.gapType !== "confirmed_strength").map((g) => g.skill).slice(0, 3);
  const highestImpact = topGaps[0] || prioritizedGaps[0]?.skill || "—";
  const highestGap = prioritizedGaps.find((g) => g.skill === highestImpact);

  const matchedCount = skills.filter((s) => profileHasSkill(inventory.skillSet, s.skill)).length;
  const readinessScore = Math.min(95, Math.round(50 + (matchedCount / Math.max(skills.length, 1)) * 45));

  const strongestOpportunity = computeStrongestMarketOpportunity(profile, jobs, matches, topGaps);
  const roleSkillDemand = computeRoleSkillDemand(jobs, targetRole || profile.currentRole, 48);

  return {
    skills,
    gaps,
    readiness: {
      targetRole: targetRole || profile.currentRole,
      readinessScore,
      topStrengths: topStrengths.length ? topStrengths : inventory.allSkills.slice(0, 4),
      topGaps: topGaps.length ? topGaps : [],
      highestImpactImprovement: highestImpact,
      reason: highestGap
        ? highestGap.whyItMatters
        : "Based on market analysis of retrieved job listings.",
    },
    totalJobsAnalyzed: analyzed.length,
    strongestOpportunity,
    prioritizedGaps,
    roleSkillDemand,
  };
}
