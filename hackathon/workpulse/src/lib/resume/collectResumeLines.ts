import { buildResumeViewText } from "@/lib/resume/buildResumeViewText";
import type { ProfessionalProfile } from "@/types";

export interface ResumeLine {
  section: string;
  text: string;
}

/** User-facing label for experience accomplishment lines (not the section header itself) */
export const EXPERIENCE_LINE_LABEL = "Work Experience";

function splitSummaryParts(text: string): string[] {
  const bySentence = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  if (bySentence.length > 1) return bySentence;

  const bySemicolon = text
    .split(/\s*;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (bySemicolon.length > 1) return bySemicolon;

  return text.trim().length > 12 ? [text.trim()] : [];
}

/** Section headers vary by resume — match the heading line, not fixed "EXPERIENCE" only */
const EXPERIENCE_SECTION_HEADERS =
  /^(?:PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|RELEVANT\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT(?:\s+HISTORY)?|WORK\s+HISTORY|CAREER(?:\s+HISTORY|\s+EXPERIENCE)?|INDUSTRY\s+EXPERIENCE|PROFESSIONAL\s+BACKGROUND|PROFESSIONAL\s+HISTORY)(?:\s*[:\-–—])?\s*$/i;

const NEXT_SECTION_HEADERS =
  /^(?:PROJECTS|PERSONAL\s+PROJECTS|EDUCATION|SKILLS|TECHNICAL\s+SKILLS|KEY\s+SKILLS|CORE\s+SKILLS|CERTIFICATIONS|ACHIEVEMENTS|AWARDS|SUMMARY|PROFESSIONAL\s+SUMMARY|OBJECTIVE|TRAINING|PUBLICATIONS|LANGUAGES|REFERENCES|INTERESTS|HOBBIES)(?:\s*[:\-–—])?\s*$/i;

const PROJECTS_SECTION =
  /(?:^|\n)(?:PROJECTS|PERSONAL\s+PROJECTS|KEY\s+PROJECTS)[^\n]*\n([\s\S]*?)(?=\n(?:EDUCATION|SKILLS|CERTIFICATIONS|EXPERIENCE|ACHIEVEMENTS)\b|$)/im;

const SKILLS_SECTION =
  /(?:^|\n)(?:SKILLS|TECHNICAL\s+SKILLS|KEY\s+SKILLS|CORE\s+SKILLS|TECHNOLOGIES)[^\n]*\n([\s\S]*?)(?=\n(?:EDUCATION|EXPERIENCE|PROJECTS|CERTIFICATIONS)\b|$)/im;

function isBulletLine(trimmed: string): boolean {
  return /^[•\-*▪◦]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
}

function isDateOnlyLine(trimmed: string): boolean {
  return (
    /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*(?:present|current|\d{4})/i.test(
      trimmed
    ) ||
    /^\d{1,2}\/\d{4}\s*[-–—]\s*(?:\d{1,2}\/\d{4}|present|current)/i.test(trimmed) ||
    /^\d{4}\s*[-–—]\s*(?:present|current|\d{4})/i.test(trimmed) ||
    /^(?:present|current)\s*[-–—]\s*\d{4}/i.test(trimmed)
  );
}

function looksLikeJobTitle(trimmed: string): boolean {
  if (trimmed.length < 3 || trimmed.length > 90) return false;
  if (isBulletLine(trimmed) || isDateOnlyLine(trimmed)) return false;
  if (/[.!?]$/.test(trimmed) && trimmed.length > 40) return false;
  if (/^(developed|built|led|managed|created|implemented|automated|designed|tested|worked)/i.test(trimmed)) {
    return false;
  }
  return (
    /(?:engineer|developer|analyst|tester|sdet|qa|lead|manager|consultant|architect|specialist|intern|associate|director|head)/i.test(
      trimmed
    ) || trimmed.split(/\s+/).length <= 8
  );
}

function looksLikeCompanyLine(trimmed: string): boolean {
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  if (isBulletLine(trimmed) || isDateOnlyLine(trimmed)) return false;
  if (looksLikeJobTitle(trimmed) && /\s+(?:engineer|developer|analyst|tester)/i.test(trimmed)) {
    return false;
  }
  if (/^(developed|built|led|managed|created|implemented|automated|designed|tested)/i.test(trimmed)) {
    return false;
  }
  if (/^(inc|llc|ltd|corp|technologies|solutions|systems|services)\.?$/i.test(trimmed)) return true;
  if (/[,&]/.test(trimmed) && trimmed.length < 60) return true;
  return (
    !/[.!?]$/.test(trimmed) &&
    trimmed.split(/\s+/).length <= 6 &&
    /^[A-Z]/.test(trimmed)
  );
}

function isRoleHeaderLine(trimmed: string): boolean {
  if (/^[•\-*▪◦]\s/.test(trimmed)) return false;
  if (/^\d+[.)]\s/.test(trimmed)) return false;
  if (trimmed.length > 160) return false;
  if (isDateOnlyLine(trimmed)) return true;

  return (
    /\s[—–\-|@]\s/.test(trimmed) ||
    /\s+(?:at|@)\s+/i.test(trimmed) ||
    /\(\d{4}/.test(trimmed) ||
    /\d{4}\s*[-–—]\s*(present|current|\d{4})/i.test(trimmed)
  );
}

function parseRoleHeader(trimmed: string): { role: string; company: string } | null {
  const emDash = trimmed.match(/^(.+?)\s*[—–\-|@]\s*(.+?)(?:\s*\([^)]*\))?\s*$/);
  if (emDash) {
    return { role: emDash[1].trim(), company: emDash[2].trim() };
  }

  const atPattern = trimmed.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*\([^)]*\))?\s*$/i);
  if (atPattern) {
    return { role: atPattern[1].trim(), company: atPattern[2].trim() };
  }

  const roleCompanyDates = trimmed.match(
    /^(.+?)\s*[|,]\s*(.+?)\s*[|,]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i
  );
  if (roleCompanyDates) {
    return { role: roleCompanyDates[1].trim(), company: roleCompanyDates[2].trim() };
  }

  const dateRange = trimmed.match(/^(.+?)\s+\(?(\d{4}\s*[-–—]\s*(?:Present|Current|\d{4}))\)?\s*$/i);
  if (dateRange && dateRange[1].length >= 3 && dateRange[1].length <= 80) {
    return { role: dateRange[1].trim(), company: "" };
  }

  return null;
}

function isNoiseLine(trimmed: string): boolean {
  if (trimmed.length < 8) return true;
  if (EXPERIENCE_SECTION_HEADERS.test(trimmed.replace(/[:\s]+$/i, ""))) return true;
  if (/^technologies:/i.test(trimmed)) return true;
  if (/^tech:/i.test(trimmed)) return true;
  if (/^tools:/i.test(trimmed)) return true;
  if (/^PROFESSIONAL SUMMARY/i.test(trimmed)) return true;
  if (/^SKILLS/i.test(trimmed)) return true;
  if (NEXT_SECTION_HEADERS.test(trimmed.replace(/[:\s]+$/i, ""))) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) return true;
  if (/^\+?\d[\d\s()-]{7,}$/.test(trimmed)) return true;
  return false;
}

function normalizeBullet(trimmed: string): string | null {
  const bullet = trimmed
    .replace(/^[•\-*▪◦]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^\s+/, "")
    .trim();

  if (bullet.length < 8) return null;
  if (isNoiseLine(bullet)) return null;
  if (isRoleHeaderLine(bullet) && !isBulletLine(trimmed)) return null;

  return bullet;
}

function asExperienceLine(trimmed: string): string | null {
  if (isNoiseLine(trimmed)) return null;
  if (isDateOnlyLine(trimmed)) return null;
  if (isRoleHeaderLine(trimmed) && !isBulletLine(trimmed)) return null;
  const fromBullet = normalizeBullet(trimmed);
  if (fromBullet) return fromBullet;
  if (trimmed.length >= 12) return trimmed.trim();
  return null;
}

/** Find work-experience block after any common section heading */
export function findExperienceSectionContent(text: string): string | null {
  const lines = text.split("\n");
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].trim().replace(/[:\s]+$/i, "");
    if (EXPERIENCE_SECTION_HEADERS.test(header)) {
      startIdx = i + 1;
      break;
    }
  }

  if (startIdx < 0) return null;

  const content: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const header = lines[i].trim().replace(/[:\s]+$/i, "");
    if (NEXT_SECTION_HEADERS.test(header)) break;
    content.push(lines[i]);
  }

  return content.length > 0 ? content.join("\n") : null;
}

/** Every bullet-style line in the full resume text */
export function extractAllBulletLines(text: string): string[] {
  const bullets: string[] = [];
  const seen = new Set<string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !isBulletLine(trimmed)) continue;
    const bullet = normalizeBullet(trimmed);
    if (!bullet) continue;
    const key = bullet.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(bullet);
  }

  return bullets;
}

/**
 * Lines under PROFESSIONAL EXPERIENCE / WORK EXPERIENCE / etc.
 * Handles: role + company on one line, company on next line, plain text without bullets.
 */
export function extractExperienceBulletsFromRawText(
  text: string
): { role: string; company: string; bullet: string }[] {
  const sectionContent = findExperienceSectionContent(text);
  if (!sectionContent) return [];

  const results: { role: string; company: string; bullet: string }[] = [];
  let currentRole = "Role";
  let currentCompany = "";
  let pendingTitle: string | null = null;
  const seen = new Set<string>();

  const pushLine = (bullet: string) => {
    const key = bullet.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      role: currentRole,
      company: currentCompany || "Company",
      bullet,
    });
  };

  for (const line of sectionContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isDateOnlyLine(trimmed)) continue;

    if (isRoleHeaderLine(trimmed)) {
      const parsed = parseRoleHeader(trimmed);
      if (parsed) {
        currentRole = parsed.role;
        currentCompany = parsed.company;
        pendingTitle = null;
      } else if (trimmed.length <= 80 && !isBulletLine(trimmed)) {
        currentRole = trimmed;
        currentCompany = "";
        pendingTitle = null;
      }
      continue;
    }

    if (pendingTitle && looksLikeCompanyLine(trimmed)) {
      currentRole = pendingTitle;
      currentCompany = trimmed;
      pendingTitle = null;
      continue;
    }

    if (looksLikeJobTitle(trimmed) && !isBulletLine(trimmed)) {
      pendingTitle = trimmed;
      continue;
    }

    if (looksLikeCompanyLine(trimmed) && !isBulletLine(trimmed) && !pendingTitle) {
      currentCompany = trimmed;
      continue;
    }

    const accomplishment = asExperienceLine(trimmed);
    if (!accomplishment) continue;

    if (pendingTitle) {
      currentRole = pendingTitle;
      pendingTitle = null;
    }

    pushLine(accomplishment);
  }

  return results;
}

function extractProjectBulletsFromRawText(text: string): string[] {
  const match = text.match(PROJECTS_SECTION);
  if (!match) return [];

  const bullets: string[] = [];
  const seen = new Set<string>();
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = asExperienceLine(trimmed);
    if (!bullet) continue;
    const key = bullet.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(bullet);
  }
  return bullets;
}

function extractSkillsLineFromRawText(text: string): string | null {
  const match = text.match(SKILLS_SECTION);
  if (!match) return null;
  const lines = match[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !isBulletLine(l));
  if (lines.length === 0) {
    const bullets = match[1]
      .split("\n")
      .map((l) => normalizeBullet(l.trim()))
      .filter(Boolean) as string[];
    return bullets.length > 0 ? bullets.join(", ") : null;
  }
  return lines.join(", ").slice(0, 500);
}

function formatExperienceSection(role: string, company: string): string {
  const co = company && company !== "Company" ? company : "";
  return co ? `${EXPERIENCE_LINE_LABEL} — ${role} @ ${co}` : `${EXPERIENCE_LINE_LABEL} — ${role}`;
}

/** Collect every polishable line — one suggestion will be generated per line */
export function collectResumeLines(profile: ProfessionalProfile): ResumeLine[] {
  const lines: ResumeLine[] = [];
  const seen = new Set<string>();

  const add = (section: string, text: string) => {
    const normalized = text.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    lines.push({ section, text: normalized });
  };

  const resumeText = profile.rawResumeText?.trim() || buildResumeViewText(profile);

  if (profile.currentRole?.trim()) {
    add("Headline", profile.currentRole);
  }

  if (profile.professionalSummary?.trim()) {
    for (const part of splitSummaryParts(profile.professionalSummary)) {
      add("Summary", part);
    }
  }

  for (const item of extractExperienceBulletsFromRawText(resumeText)) {
    add(formatExperienceSection(item.role, item.company), item.bullet);
  }

  for (const role of profile.roles) {
    for (const bullet of role.responsibilities) {
      if (bullet.trim()) {
        add(formatExperienceSection(role.title, role.company || "Company"), bullet);
      }
    }
  }

  for (const bullet of extractAllBulletLines(resumeText)) {
    add(EXPERIENCE_LINE_LABEL, bullet);
  }

  for (const project of profile.projects) {
    add(`Projects — ${project.name}`, `${project.name}: ${project.description}`);
  }

  for (const bullet of extractProjectBulletsFromRawText(resumeText)) {
    add("Projects", bullet);
  }

  for (const achievement of profile.achievements) {
    add("Achievements", achievement);
  }

  const rawSkills = extractSkillsLineFromRawText(resumeText);
  if (profile.skills.length > 0) {
    add("Skills", profile.skills.join(", "));
  } else if (rawSkills) {
    add("Skills", rawSkills);
  }

  if (profile.certifications.length > 0) {
    add("Certifications", profile.certifications.join(", "));
  }

  for (const edu of profile.education) {
    add(`Education — ${edu.institution}`, `${edu.degree} — ${edu.institution}`);
  }

  return lines;
}

export function countExpectedResumeLines(profile: ProfessionalProfile): number {
  return collectResumeLines(profile).length;
}

export function countExperienceLines(profile: ProfessionalProfile): number {
  return collectResumeLines(profile).filter((l) => l.section.startsWith(EXPERIENCE_LINE_LABEL)).length;
}

/** @deprecated use countExperienceLines */
export function countExperienceBullets(profile: ProfessionalProfile): number {
  return countExperienceLines(profile);
}
