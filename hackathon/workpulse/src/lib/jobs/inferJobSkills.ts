import type { Job } from "@/types";
import {
  extractSkillsFromText,
  normalizeSkillCanonical,
  textContainsSkillTerm,
} from "@/lib/skills/normalize";
import { stripHtml } from "@/lib/utils";

/** Skills commonly implied by words in a job title */
const TITLE_SKILL_PATTERNS: Array<{ pattern: RegExp; skills: string[] }> = [
  { pattern: /\bqa\b|quality assurance|quality engineer|quality analyst/i, skills: ["Manual Testing", "Automation Testing"] },
  { pattern: /test engineer|testing engineer|software tester/i, skills: ["Manual Testing", "Automation Testing", "TestNG"] },
  { pattern: /automation|sdet|test automation/i, skills: ["Automation Testing", "Selenium", "Playwright", "Java", "Python"] },
  { pattern: /performance/i, skills: ["Performance Testing", "JMeter", "Load Testing"] },
  { pattern: /\bapi\b|api test/i, skills: ["API Testing", "Postman", "REST Assured"] },
  { pattern: /manual test/i, skills: ["Manual Testing"] },
  { pattern: /selenium/i, skills: ["Selenium", "Java"] },
  { pattern: /playwright/i, skills: ["Playwright", "JavaScript", "TypeScript"] },
  { pattern: /cypress/i, skills: ["Cypress", "JavaScript"] },
  { pattern: /devops|sre|platform engineer/i, skills: ["DevOps", "CI/CD", "Docker", "Kubernetes"] },
  { pattern: /backend|back-end|java developer|spring boot/i, skills: ["Java", "Spring Boot", "REST APIs", "SQL", "Microservices"] },
  { pattern: /frontend|front-end|react developer/i, skills: ["React", "JavaScript", "TypeScript"] },
  { pattern: /full stack|fullstack/i, skills: ["JavaScript", "React", "Node.js", "SQL"] },
  { pattern: /data engineer|etl/i, skills: ["Python", "SQL", "ETL", "Spark"] },
  { pattern: /cloud|aws/i, skills: ["AWS", "Docker", "Kubernetes"] },
];

/** Typical skills per career track — used only when description is partial */
const TRACK_SKILLS: Record<string, string[]> = {
  qa: [
    "Selenium", "Playwright", "Java", "Python", "JavaScript", "TypeScript",
    "API Testing", "Manual Testing", "Automation Testing", "TestNG", "JUnit",
    "Postman", "REST Assured", "CI/CD", "Git", "SQL", "Cypress", "Appium",
    "BDD", "Cucumber", "JMeter", "Performance Testing", "Load Testing",
  ],
  backend: [
    "Java", "Python", "Spring Boot", "Node.js", "REST APIs", "SQL", "PostgreSQL",
    "Microservices", "Docker", "Kubernetes", "AWS", "Git", "CI/CD",
  ],
  frontend: [
    "JavaScript", "TypeScript", "React", "Angular", "Vue", "HTML", "CSS", "Git",
  ],
  devops: [
    "Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Jenkins", "Linux", "Git",
  ],
};

function detectJobTrack(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(qa|quality|test engineer|sdet|automation engineer|software tester|testing)\b/.test(text)) {
    return "qa";
  }
  if (/\b(backend|java developer|spring boot|microservices)\b/.test(text)) return "backend";
  if (/\b(frontend|react developer|angular|vue developer)\b/.test(text)) return "frontend";
  if (/\b(devops|sre|platform engineer|infrastructure)\b/.test(text)) return "devops";
  return null;
}

function extractSkillsFromTitle(title: string): string[] {
  const found = new Set<string>();
  for (const { pattern, skills } of TITLE_SKILL_PATTERNS) {
    if (pattern.test(title)) {
      skills.forEach((s) => found.add(normalizeSkillCanonical(s)));
    }
  }
  return Array.from(found);
}

function isPartialDescription(job: Job, plainDescription: string): boolean {
  return Boolean(
    job.descriptionPartial ||
      plainDescription.endsWith("…") ||
      plainDescription.endsWith("...") ||
      plainDescription.length >= 498
  );
}

/**
 * Collect skills required by a job — description, title, and (when partial) role-track inference.
 */
export function collectJobSkillsEnhanced(job: Job): { skills: string[]; inferred: boolean } {
  const plainDescription = stripHtml(job.description);
  const fromDescription = extractSkillsFromText(plainDescription);
  const fromTitle = extractSkillsFromTitle(job.title);
  const partial = isPartialDescription(job, plainDescription);

  const combined = new Set<string>();
  for (const skill of [...job.skills, ...fromDescription, ...fromTitle]) {
    combined.add(normalizeSkillCanonical(skill));
  }

  let inferred = false;

  if (partial) {
    inferred = true;
    const track = detectJobTrack(job.title, plainDescription);
    const haystack = `${job.title} ${plainDescription}`;

    if (track && TRACK_SKILLS[track]) {
      for (const skill of TRACK_SKILLS[track]) {
        if (textContainsSkillTerm(haystack, skill)) {
          combined.add(normalizeSkillCanonical(skill));
        }
      }
    }

    for (const { pattern, skills } of TITLE_SKILL_PATTERNS) {
      if (pattern.test(job.title)) {
        skills.forEach((s) => combined.add(normalizeSkillCanonical(s)));
      }
    }
  }

  return { skills: Array.from(combined), inferred: inferred && combined.size > fromDescription.length };
}

/** Resume skills that are relevant to this job's role track or explicit requirements */
export function filterRelevantProfileSkills(
  profileSkills: string[],
  jobSkills: string[],
  job: Job
): string[] {
  const plainDescription = stripHtml(job.description);
  const track = detectJobTrack(job.title, plainDescription);
  const trackSet = track ? new Set((TRACK_SKILLS[track] ?? []).map((s) => s.toLowerCase())) : new Set<string>();
  const jobSet = new Set(jobSkills.map((s) => s.toLowerCase()));
  const haystack = `${job.title} ${plainDescription}`.toLowerCase();

  return profileSkills.filter((skill) => {
    const canonical = normalizeSkillCanonical(skill);
    const lower = canonical.toLowerCase();
    if (jobSet.has(lower)) return true;
    if (trackSet.has(lower)) return true;
    if (textContainsSkillTerm(haystack, canonical)) return true;
    return false;
  });
}
