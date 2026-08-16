import { v4 as uuidv4 } from "uuid";
import { callAI } from "./client";
import { ProfessionalProfileSchema } from "@/lib/schemas";
import { DEMO_PROFILE } from "@/lib/jobs/mock-data";
import { mergeProfileSkillFields } from "@/lib/skills/profileSkills";
import { sanitizeRoleTitle } from "@/lib/ai/roleTitleUtils";
import {
  extractCurrentRoleFromResumeText,
  extractEmailFromText,
  extractNameFromResumeText,
  isContactOrAddressLine,
  normalizeResumeText,
} from "@/lib/resume/parseResumeHeader";
import type { ProfessionalProfile } from "@/types";

const SKILL_CANDIDATES = [
  "Java", "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "Spring Boot", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "PostgreSQL", "SQL",
  "Terraform", "Git", "Microservices", "REST APIs", "Go", "C++",
  "Playwright", "Selenium", "Cypress", "TestNG", "JUnit", "Jest",
  "API Testing", "Postman", "Manual Testing", "Automation Testing",
  "Performance Testing", "Load Testing", "Appium", "BDD", "Cucumber",
  "Angular", "Vue", "GraphQL", "Redis", "MongoDB",
  "Jenkins", "CI/CD", "Ansible", "Linux", "Spinnaker", "GitHub Actions",
  "Helm", "ELK", "SumoLogic", "Dynatrace", "Snowflake", "DynamoDB",
  "EKS", "ECS", "Lambda", "Shell", "Bash",
];

function parseResumeFallback(text: string): ProfessionalProfile {
  const now = new Date().toISOString();
  const isDemo = text.includes("Alex Morgan") || text.includes("TechNova");

  if (isDemo) {
    return { ...DEMO_PROFILE, rawResumeText: text, updatedAt: now };
  }

  const skills = extractList(text, SKILL_CANDIDATES);
  const roles = extractRolesFromExperience(text);
  const name = extractNameFromResumeText(text);
  const email = extractEmailFromText(text);
  const currentRole =
    extractCurrentRoleFromResumeText(text) || roles[0]?.title || "Software Engineer";

  return {
    id: uuidv4(),
    name: name || "Candidate",
    email,
    currentRole,
    professionalSummary: extractSummary(text) || "IT professional with relevant experience.",
    experienceYears: extractExperienceYears(text) || 3,
    skills,
    programmingLanguages: skills.filter((s) =>
      ["Java", "Python", "JavaScript", "TypeScript", "Go", "C++", "C#", "Ruby", "Rust", "Shell", "Bash"].includes(s)
    ),
    frameworks: skills.filter((s) =>
      ["Spring Boot", "React", "Node.js", "Angular", "Vue", "Django", "Flask", ".NET"].includes(s)
    ),
    libraries: [],
    cloudTechnologies: skills.filter((s) =>
      ["AWS", "Azure", "GCP", "EC2", "S3", "RDS", "EKS", "ECS", "Lambda"].includes(s)
    ),
    databases: skills.filter((s) =>
      ["PostgreSQL", "MySQL", "MongoDB", "SQL", "Redis", "Snowflake", "DynamoDB"].includes(s)
    ),
    devOpsTools: skills.filter((s) =>
      ["Docker", "Kubernetes", "Jenkins", "Terraform", "CI/CD", "Spinnaker", "GitHub Actions", "Helm"].includes(s)
    ),
    testingTools: skills.filter((s) =>
      ["JUnit", "Selenium", "TestNG", "Cypress", "Jest"].includes(s)
    ),
    dataTechnologies: skills.filter((s) =>
      ["Spark", "Airflow", "ETL", "Kafka"].includes(s)
    ),
    aiMlTechnologies: skills.filter((s) =>
      ["TensorFlow", "PyTorch", "Machine Learning", "LLM", "OpenAI"].includes(s)
    ),
    certifications: extractSectionItems(text, "CERTIFICATION"),
    education: extractEducation(text),
    projects: [],
    achievements: [],
    domainExperience: [],
    roles,
    industries: ["Technology"],
    rawResumeText: text,
    confirmed: false,
    createdAt: now,
    updatedAt: now,
  };
}

function extractRolesFromExperience(text: string): ProfessionalProfile["roles"] {
  const expMatch = text.match(
    /(?:^|\n)(?:PROFESSIONAL\s+)?(?:EXPERIENCE|EMPLOYMENT|WORK\s+HISTORY|WORK\s+EXPERIENCE)[^\n]*\n([\s\S]*?)(?=\n(?:PROJECTS|EDUCATION|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|KEY\s+SKILLS)\b|$)/im
  );
  if (!expMatch) return [];

  const roles: ProfessionalProfile["roles"] = [];
  let current: ProfessionalProfile["roles"][number] | null = null;
  let pendingCompany = "";

  const titleDatePattern =
    /^((?:Senior|Lead|Staff|Principal|Junior|Associate)?\s*[\w\s\/-]*(?:Engineer|Developer|Designer|Analyst|Architect|Tester|SDET|Manager|Consultant|Specialist|Administrator))\s*[|–—-]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).+|\d{4}.+)$/i;

  for (const line of expMatch[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const titleDate = trimmed.match(titleDatePattern);
    if (titleDate) {
      if (current) roles.push(current);
      current = {
        title: titleDate[1].trim(),
        company: pendingCompany.replace(/,.*$/, "").trim() || "Unknown",
        duration: titleDate[2].trim(),
        responsibilities: [],
        technologies: [],
      };
      pendingCompany = "";
      continue;
    }

    if (/^[A-Za-z][\w\s&.,]+,\s*[A-Za-z\s,]+$/.test(trimmed) && !titleDatePattern.test(trimmed) && trimmed.length < 100) {
      pendingCompany = trimmed.split(",")[0].trim();
      continue;
    }

    const roleLine = trimmed.match(/^(.+?)\s*[—–\-|@]\s*(.+?)(?:\s*\([^)]*\))?\s*$/);
    const atLine = trimmed.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*\([^)]*\))?\s*$/i);
    const header = roleLine ?? atLine;

    if (header && !/^[•\-*]\s/.test(trimmed) && trimmed.length < 140) {
      if (current) roles.push(current);
      current = {
        title: header[1].trim(),
        company: header[2].trim().replace(/[(\[].*$/, "").trim() || pendingCompany || "Unknown",
        responsibilities: [],
        technologies: [],
      };
      pendingCompany = "";
      continue;
    }

    const bullet = trimmed.replace(/^[•\-*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    if (current && bullet.length >= 15 && !/^technologies:/i.test(bullet)) {
      current.responsibilities.push(bullet);
    }
  }

  if (current) roles.push(current);
  return roles.slice(0, 6);
}

function extractSummary(text: string): string | undefined {
  const match = text.match(
    /(?:PROFESSIONAL SUMMARY|CAREER SUMMARY|SUMMARY)\s*\n([\s\S]*?)(?=\n(?:KEY SKILLS|SKILLS|EXPERIENCE|EDUCATION|CERTIFICATIONS)\b|\n\n)/i
  );
  return match?.[1]?.trim().replace(/\s+/g, " ").slice(0, 400);
}

function extractEducation(text: string): ProfessionalProfile["education"] {
  const match = text.match(/EDUCATION\s*\n([\s\S]*?)(?=\n(?:CERTIFICATIONS|SKILLS|PROJECTS)\b|$)/im);
  if (!match) return [];
  const items: ProfessionalProfile["education"] = [];
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;
    const parts = trimmed.split("|").map((p) => p.trim());
    if (parts.length >= 2) {
      items.push({ degree: parts[0], institution: parts[1], year: parts[2] });
    }
  }
  return items.slice(0, 4);
}

function extractExperienceYears(text: string): number | undefined {
  const match = text.match(/(\d+)\+?\s*years?/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractList(text: string, candidates: string[]): string[] {
  const lower = text.toLowerCase();
  return candidates.filter((c) => lower.includes(c.toLowerCase()));
}

function extractSectionItems(text: string, section: string): string[] {
  const regex = new RegExp(`${section}[S]?\\s*\\n([\\s\\S]*?)(?=\\n[A-Z]{3,}|$)`, "i");
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeParsedProfile(profile: ProfessionalProfile, rawText: string): ProfessionalProfile {
  const fixedName = extractNameFromResumeText(rawText);
  if (fixedName && (!profile.name?.trim() || profile.name.toLowerCase() === "candidate" || isContactOrAddressLine(profile.name))) {
    profile.name = fixedName;
  }

  if (!profile.email) {
    profile.email = extractEmailFromText(rawText);
  }

  let role = profile.currentRole?.trim() || "";
  const sanitized = sanitizeRoleTitle(role, profile);
  if (sanitized) {
    profile.currentRole = sanitized;
  } else if (!role || isContactOrAddressLine(role) || role.length > 60) {
    const extracted =
      extractCurrentRoleFromResumeText(rawText) ||
      profile.roles.find((r) => sanitizeRoleTitle(r.title, profile))?.title;
    const sanitizedExtracted = extracted ? sanitizeRoleTitle(extracted, profile) : null;
    profile.currentRole = sanitizedExtracted || extracted || "Software Engineer";
  }

  profile.roles = (profile.roles || [])
    .map((r) => {
      const title = sanitizeRoleTitle(r.title, profile);
      return title ? { ...r, title } : null;
    })
    .filter(Boolean) as ProfessionalProfile["roles"];

  return profile;
}

export async function parseResume(text: string): Promise<{ profile: ProfessionalProfile; aiPowered: boolean }> {
  const normalizedText = normalizeResumeText(text);

  const systemPrompt = `You are a resume parser for IT professionals. Extract structured profile data from resume text.
Return JSON matching this schema:
{
  "name": string (person's full name ONLY — not address or contact line),
  "email": string optional,
  "currentRole": string (job title ONLY e.g. "Senior DevOps Engineer" — NOT address or name),
  "professionalSummary": string,
  "experienceYears": number,
  "skills": string[],
  "roles": [{"title": string, "company": string, "duration": string optional, "responsibilities": string[], "technologies": string[]}]
}
Infer profession dynamically. Do NOT invent information not present in the resume.`;

  const { data, aiPowered } = await callAI<Record<string, unknown>>(
    systemPrompt,
    `Parse this resume:\n\n${normalizedText.slice(0, 8000)}`,
    () => parseResumeFallback(normalizedText) as unknown as Record<string, unknown>
  );

  const now = new Date().toISOString();
  const profile: ProfessionalProfile = {
    id: uuidv4(),
    name: String(data.name || "Candidate"),
    email: data.email ? String(data.email) : undefined,
    currentRole: String(data.currentRole || "Software Engineer"),
    professionalSummary: String(data.professionalSummary || ""),
    experienceYears: Number(data.experienceYears) || 0,
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
    programmingLanguages: Array.isArray(data.programmingLanguages) ? data.programmingLanguages.map(String) : [],
    frameworks: Array.isArray(data.frameworks) ? data.frameworks.map(String) : [],
    libraries: Array.isArray(data.libraries) ? data.libraries.map(String) : [],
    cloudTechnologies: Array.isArray(data.cloudTechnologies) ? data.cloudTechnologies.map(String) : [],
    databases: Array.isArray(data.databases) ? data.databases.map(String) : [],
    devOpsTools: Array.isArray(data.devOpsTools) ? data.devOpsTools.map(String) : [],
    testingTools: Array.isArray(data.testingTools) ? data.testingTools.map(String) : [],
    dataTechnologies: Array.isArray(data.dataTechnologies) ? data.dataTechnologies.map(String) : [],
    aiMlTechnologies: Array.isArray(data.aiMlTechnologies) ? data.aiMlTechnologies.map(String) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications.map(String) : [],
    education: Array.isArray(data.education) ? (data.education as ProfessionalProfile["education"]) : [],
    projects: Array.isArray(data.projects) ? (data.projects as ProfessionalProfile["projects"]) : [],
    achievements: Array.isArray(data.achievements) ? data.achievements.map(String) : [],
    domainExperience: Array.isArray(data.domainExperience) ? data.domainExperience.map(String) : [],
    roles: Array.isArray(data.roles) ? (data.roles as ProfessionalProfile["roles"]) : [],
    industries: Array.isArray(data.industries) ? data.industries.map(String) : ["Technology"],
    rawResumeText: normalizedText,
    confirmed: false,
    createdAt: now,
    updatedAt: now,
  };

  ProfessionalProfileSchema.parse(profile);
  const merged = mergeProfileSkillFields(profile);
  return { profile: normalizeParsedProfile(merged, normalizedText), aiPowered };
}
