import type { Job } from "@/types";
import { normalizeSkillCanonical, extractSkillsFromText } from "@/lib/skills/normalize";

export interface RoleSkillDemandStat {
  skill: string;
  percentage: number;
  jobCount: number;
  barWidth: number;
}

export interface RoleSkillDemandResult {
  targetRole: string;
  windowLabel: string;
  windowHours: number;
  jobsAnalyzed: number;
  skills: RoleSkillDemandStat[];
}

function jobMatchesRole(job: Job, targetRole: string): boolean {
  const roleWords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const text = `${job.title} ${job.description}`.toLowerCase();
  return roleWords.some((w) => text.includes(w));
}

function collectJobSkills(job: Job): string[] {
  if (job.skills.length > 0) return job.skills.map(normalizeSkillCanonical);
  return extractSkillsFromText(job.description);
}

/**
 * Skill demand for a specific target role from retrieved jobs in a time window.
 * Percentages = (jobs mentioning skill / jobs analyzed) × 100
 */
export function computeRoleSkillDemand(
  jobs: Job[],
  targetRole: string,
  windowHours = 48
): RoleSkillDemandResult {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;

  const roleJobs = jobs.filter((job) => {
    const posted = new Date(job.postedAt).getTime();
    const inWindow = !Number.isNaN(posted) && posted >= cutoff;
    return inWindow && jobMatchesRole(job, targetRole);
  });

  // If no jobs in window for role, widen to all role-matching jobs (any time)
  const analyzed =
    roleJobs.length > 0
      ? roleJobs
      : jobs.filter((j) => jobMatchesRole(j, targetRole));

  const skillCounts: Record<string, number> = {};
  for (const job of analyzed) {
    const skills = collectJobSkills(job);
    const seen = new Set<string>();
    for (const skill of skills) {
      if (seen.has(skill)) continue;
      seen.add(skill);
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  }

  const total = analyzed.length || 1;
  const maxPct = Math.max(...Object.values(skillCounts).map((c) => (c / total) * 100), 1);

  const skills: RoleSkillDemandStat[] = Object.entries(skillCounts)
    .map(([skill, count]) => {
      const percentage = Math.round((count / total) * 100);
      return {
        skill,
        percentage,
        jobCount: count,
        barWidth: Math.round((percentage / maxPct) * 100),
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10);

  return {
    targetRole,
    windowLabel: `Last ${windowHours} hours`,
    windowHours,
    jobsAnalyzed: analyzed.length,
    skills,
  };
}

/** Role-specific skill hints when no jobs loaded yet (fallback for demo) */
export const ROLE_SKILL_HINTS: Record<string, string[]> = {
  qa: ["Playwright", "Selenium", "API Testing", "Java", "Cypress", "AWS", "Docker", "Kubernetes"],
  "quality assurance": ["Playwright", "Selenium", "API Testing", "Java", "TestNG", "Cypress"],
  sdet: ["Playwright", "Selenium", "Java", "API Testing", "CI/CD", "Python"],
  backend: ["Java", "Spring Boot", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Microservices", "REST APIs"],
  frontend: ["React", "TypeScript", "JavaScript", "CSS", "Node.js", "GraphQL", "AWS"],
  devops: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD", "Jenkins", "Linux"],
  cloud: ["AWS", "Terraform", "Kubernetes", "Docker", "Python", "Linux"],
  data: ["Python", "SQL", "Spark", "AWS", "ETL", "Airflow", "Kafka"],
  ml: ["Python", "TensorFlow", "PyTorch", "Machine Learning", "AWS", "MLOps"],
  security: ["SIEM", "Network Security", "Python", "AWS", "Linux", "Incident Response"],
};

export function getRoleSkillHints(targetRole: string): string[] {
  const lower = targetRole.toLowerCase();
  for (const [key, skills] of Object.entries(ROLE_SKILL_HINTS)) {
    if (lower.includes(key)) return skills;
  }
  return ["Python", "AWS", "Docker", "SQL", "Git", "Kubernetes", "React", "Java"];
}
