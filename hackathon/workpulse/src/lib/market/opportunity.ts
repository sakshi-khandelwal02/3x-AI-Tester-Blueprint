import type { Job, MatchResult, ProfessionalProfile } from "@/types";
import { getConfirmedStrengths } from "@/lib/skills/analyzeGaps";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";

export interface StrongestMarketOpportunity {
  /** Career cluster label, e.g. "Cloud & Platform Engineering" */
  cluster: string;
  strongestSkills: string[];
  matchingOpportunities: number;
  why: string;
  highValueSkillToDevelop: string;
  relatedRoles: string[];
}

const ROLE_CLUSTERS: { label: string; keywords: string[]; developSkill: string }[] = [
  { label: "Cloud & Platform Engineering", keywords: ["platform", "cloud", "devops", "sre", "infrastructure"], developSkill: "Kubernetes" },
  { label: "Backend Engineering", keywords: ["backend", "java", "spring", "api", "microservices"], developSkill: "Kubernetes" },
  { label: "Full Stack Development", keywords: ["full stack", "fullstack", "frontend", "react", "node"], developSkill: "TypeScript" },
  { label: "Data Engineering", keywords: ["data engineer", "etl", "spark", "pipeline", "analytics"], developSkill: "Spark" },
  { label: "AI & Machine Learning", keywords: ["machine learning", "ml engineer", "ai engineer", "llm", "data science"], developSkill: "MLOps" },
  { label: "QA & Test Automation", keywords: ["qa", "test automation", "sdet", "selenium"], developSkill: "CI/CD" },
  { label: "Cybersecurity", keywords: ["security", "cyber", "soc", "siem"], developSkill: "Cloud Security" },
];

export function computeStrongestMarketOpportunity(
  profile: ProfessionalProfile,
  jobs: Job[],
  matches: Record<string, MatchResult>,
  topGaps: string[] = []
): StrongestMarketOpportunity {
  const inventory = extractResumeSkills(profile);
  const strengths = getConfirmedStrengths(profile, jobs, matches, 8);
  const strengthSet = new Set(strengths.map((s) => s.toLowerCase()));

  // Score each cluster by job overlap + skill alignment
  const clusterScores = ROLE_CLUSTERS.map((cluster) => {
    const matchingJobs = jobs.filter((j) => {
      const text = `${j.title} ${j.description}`.toLowerCase();
      const match = matches[j.id];
      const isRelevant =
        match?.category === "EXCELLENT_MATCH" ||
        match?.category === "GOOD_MATCH" ||
        match?.category === "STRETCH_OPPORTUNITY";
      const clusterMatch = cluster.keywords.some((k) => text.includes(k));
      return isRelevant && clusterMatch;
    });

    const skillOverlap = strengths.filter((s) =>
      cluster.keywords.some((k) => s.toLowerCase().includes(k))
    ).length;

    return {
      ...cluster,
      score: matchingJobs.length * 3 + skillOverlap * 5 + strengths.length,
      matchingJobs: matchingJobs.length,
      relatedRoles: [...new Set(matchingJobs.map((j) => j.title))].slice(0, 3),
    };
  });

  clusterScores.sort((a, b) => b.score - a.score);
  const best = clusterScores[0];

  const developSkill =
    topGaps.find((g) => !strengthSet.has(g.toLowerCase())) ??
    best?.developSkill ??
    "Kubernetes";

  const targetRole = profile.currentRole;
  const matchingCount = best?.matchingJobs ?? jobs.filter((j) => {
    const m = matches[j.id];
    return m?.category === "EXCELLENT_MATCH" || m?.category === "GOOD_MATCH";
  }).length;

  return {
    cluster: best?.label ?? inferClusterFromRole(targetRole),
    strongestSkills: strengths.length ? strengths.slice(0, 5) : inventory.allSkills.slice(0, 5),
    matchingOpportunities: matchingCount,
    why: `Your experience with ${(strengths.slice(0, 3).join(", ") || inventory.allSkills.slice(0, 3).join(", "))} aligns strongly with ${best?.label ?? targetRole} roles in the current job market.`,
    highValueSkillToDevelop: developSkill,
    relatedRoles: best?.relatedRoles ?? [targetRole],
  };
}

function inferClusterFromRole(role: string): string {
  const lower = role.toLowerCase();
  for (const cluster of ROLE_CLUSTERS) {
    if (cluster.keywords.some((k) => lower.includes(k))) return cluster.label;
  }
  return `${role} & Related Roles`;
}
