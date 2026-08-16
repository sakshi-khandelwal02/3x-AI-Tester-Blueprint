import type { ProfessionalProfile } from "@/types";
import { extractSkillsFromText, normalizeSkillCanonical, buildProfileSkillSet } from "./normalize";

export interface ResumeSkillInventory {
  allSkills: string[];
  listedSkills: string[];
  experienceSkills: string[];
  projectSkills: string[];
  contextualSkills: string[];
  skillSet: Set<string>;
  sourceText: string;
}

/** Extract skills from profile — uses merged profile.skills when present (current resume only) */
export function extractResumeSkills(profile: ProfessionalProfile): ResumeSkillInventory {
  const sourceText = profile.rawResumeText ?? "";

  if (profile.skills.length > 0) {
    const allSkills = profile.skills.map(normalizeSkillCanonical);
    return {
      allSkills,
      listedSkills: allSkills,
      experienceSkills: [],
      projectSkills: [],
      contextualSkills: [],
      skillSet: buildProfileSkillSet(allSkills),
      sourceText,
    };
  }

  const listedSkills = [
    ...profile.programmingLanguages,
    ...profile.frameworks,
    ...profile.libraries,
    ...profile.cloudTechnologies,
    ...profile.databases,
    ...profile.devOpsTools,
    ...profile.testingTools,
    ...profile.dataTechnologies,
    ...profile.aiMlTechnologies,
  ].map(normalizeSkillCanonical);

  const experienceTexts = profile.roles.flatMap((r) => [
    r.title,
    ...r.responsibilities,
    ...r.technologies,
  ]);
  const experienceSkills = extractSkillsFromText(experienceTexts.join(" "));
  const projectSkills = extractSkillsFromText(
    profile.projects.map((p) => `${p.name} ${p.description} ${p.technologies.join(" ")}`).join(" ")
  );
  const contextualSkills = extractSkillsFromText(
    [profile.professionalSummary, ...profile.achievements, ...profile.certifications, sourceText].join(" ")
  );

  const allSkills = Array.from(
    new Set([...listedSkills, ...experienceSkills, ...projectSkills, ...contextualSkills].map(normalizeSkillCanonical))
  ).filter(Boolean);

  return {
    allSkills,
    listedSkills: Array.from(new Set(listedSkills)),
    experienceSkills,
    projectSkills,
    contextualSkills,
    skillSet: buildProfileSkillSet(allSkills),
    sourceText,
  };
}

export function getResumeEvidenceForSkill(
  inventory: ResumeSkillInventory,
  skill: string
): string | null {
  const canonical = normalizeSkillCanonical(skill).toLowerCase();

  for (const s of inventory.listedSkills) {
    if (s.toLowerCase() === canonical) return `Listed in Skills section`;
  }
  for (const role of inventory.experienceSkills) {
    if (role.toLowerCase() === canonical) return `Demonstrated in work experience`;
  }
  for (const p of inventory.projectSkills) {
    if (p.toLowerCase() === canonical) return `Used in projects`;
  }
  for (const c of inventory.contextualSkills) {
    if (c.toLowerCase() === canonical) return `Mentioned in summary or certifications`;
  }
  return null;
}

const ADJACENT_SKILLS: Record<string, string[]> = {
  Kubernetes: ["Docker", "AWS", "CI/CD", "Terraform"],
  Terraform: ["AWS", "Docker", "CI/CD"],
  "CI/CD": ["Docker", "Jenkins", "Git"],
  React: ["JavaScript", "TypeScript"],
  "Node.js": ["JavaScript", "REST APIs"],
  Spark: ["Python", "SQL", "ETL"],
  Kafka: ["Java", "Microservices"],
};

export function isAdjacentSkill(
  inventory: ResumeSkillInventory,
  requiredSkill: string
): { adjacent: boolean; relatedSkills: string[] } {
  const canonical = normalizeSkillCanonical(requiredSkill);
  const related = ADJACENT_SKILLS[canonical] ?? [];
  const demonstrated = related.filter((r) =>
    inventory.skillSet.has(normalizeSkillCanonical(r).toLowerCase())
  );
  return {
    adjacent: demonstrated.length > 0,
    relatedSkills: demonstrated,
  };
}
