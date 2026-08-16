import type { ProfessionalProfile } from "@/types";
import { extractSkillsFromText, normalizeSkillCanonical, textContainsSkillTerm } from "./normalize";

const EMPTY_SKILL_CATEGORIES = {
  programmingLanguages: [] as string[],
  frameworks: [] as string[],
  libraries: [] as string[],
  cloudTechnologies: [] as string[],
  databases: [] as string[],
  devOpsTools: [] as string[],
  testingTools: [] as string[],
  dataTechnologies: [] as string[],
  aiMlTechnologies: [] as string[],
};

const TESTING_TOOL_SKILLS = new Set([
  "Selenium", "Playwright", "Cypress", "TestNG", "JUnit", "Jest", "Appium",
  "Postman", "API Testing", "Manual Testing", "Automation Testing",
  "Performance Testing", "Load Testing", "Cucumber", "BDD",
]);

function categorizeSkills(skills: string[]): Pick<
  ProfessionalProfile,
  | "programmingLanguages"
  | "frameworks"
  | "testingTools"
  | "cloudTechnologies"
  | "databases"
  | "devOpsTools"
> {
  const programmingLanguages = skills.filter((s) =>
    ["Java", "Python", "JavaScript", "TypeScript", "Go", "C++", "C#", "Ruby", "Rust", "Kotlin", "Swift"].includes(s)
  );
  const frameworks = skills.filter((s) =>
    ["Spring Boot", "React", "Node.js", "Angular", "Vue", "Django", "Flask", ".NET"].includes(s)
  );
  const testingTools = skills.filter((s) => TESTING_TOOL_SKILLS.has(s));
  const cloudTechnologies = skills.filter((s) =>
    ["AWS", "Azure", "GCP", "EC2", "S3", "RDS"].includes(s)
  );
  const databases = skills.filter((s) =>
    ["PostgreSQL", "MySQL", "MongoDB", "SQL", "Redis"].includes(s)
  );
  const devOpsTools = skills.filter((s) =>
    ["Docker", "Kubernetes", "Jenkins", "Terraform", "CI/CD"].includes(s)
  );

  return { programmingLanguages, frameworks, testingTools, cloudTechnologies, databases, devOpsTools };
}

/**
 * Build skills ONLY from the current resume text — no carry-over from prior uploads.
 * Parser category fields are kept only when the term appears in rawResumeText.
 */
export function mergeProfileSkillFields(profile: ProfessionalProfile): ProfessionalProfile {
  const rawText = profile.rawResumeText ?? "";
  const fromResumeText = extractSkillsFromText(rawText);

  const parserListed = [
    ...profile.skills,
    ...profile.programmingLanguages,
    ...profile.frameworks,
    ...profile.libraries,
    ...profile.cloudTechnologies,
    ...profile.databases,
    ...profile.devOpsTools,
    ...profile.testingTools,
    ...profile.dataTechnologies,
    ...profile.aiMlTechnologies,
  ]
    .map(normalizeSkillCanonical)
    .filter(Boolean);

  const verifiedFromParser = parserListed.filter(
    (skill) =>
      fromResumeText.some((t) => t.toLowerCase() === skill.toLowerCase()) ||
      textContainsSkillTerm(rawText, skill)
  );

  const skills = Array.from(new Set([...fromResumeText, ...verifiedFromParser]));
  const categories = categorizeSkills(skills);

  return {
    ...profile,
    skills,
    ...EMPTY_SKILL_CATEGORIES,
    ...categories,
    libraries: [],
    dataTechnologies: skills.filter((s) => ["Spark", "Airflow", "ETL", "Kafka"].includes(s)),
    aiMlTechnologies: skills.filter((s) =>
      ["TensorFlow", "PyTorch", "Machine Learning", "LLM", "OpenAI"].includes(s)
    ),
  };
}

/** Skills to show as chips — always from the current profile's merged skills list */
export function getDisplaySkills(profile: ProfessionalProfile): string[] {
  return profile.skills.length > 0
    ? profile.skills
    : extractSkillsFromText(profile.rawResumeText ?? "");
}
