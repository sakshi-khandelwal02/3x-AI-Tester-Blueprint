import type { ProfessionalProfile } from "@/types";

export type CareerTrack =
  | "qa"
  | "backend"
  | "frontend"
  | "uiux"
  | "devops"
  | "data"
  | "mobile"
  | "general";

export type ExperienceTier = "entry" | "mid" | "senior" | "lead" | "executive";

const RESUME_SECTION_HEADERS = [
  "professional experience",
  "work experience",
  "employment history",
  "professional summary",
  "career summary",
  "summary",
  "objective",
  "skills",
  "technical skills",
  "education",
  "certifications",
  "projects",
  "achievements",
  "contact",
  "profile",
];

const GENERIC_ONLY_TITLE =
  /^(engineer|developer|designer|analyst|architect|tester|tester|lead|manager|specialist|consultant|scientist|programmer|analyst|tester)$/i;

const MINIMUM_ROLE_TITLES = /^(sdet|qa|sre|vp)$/i;

const ROLE_KEYWORD =
  /\b(engineer|developer|designer|analyst|architect|tester|sdet|manager|lead|specialist|consultant|director|administrator|scientist|programmer)\b/i;

const SENIORITY_PREFIX = /^(senior|sr\.?|lead|staff|principal|junior|jr\.?|associate|head|director|manager|chief|vp|vice president)\s+/i;

/** Experience bands for role targeting */
export function getExperienceTier(years: number): ExperienceTier {
  if (years >= 12) return "executive";
  if (years >= 8) return "lead";
  if (years >= 5) return "senior";
  if (years >= 2) return "mid";
  return "entry";
}

export function getExperienceLabel(years: number): string {
  if (years >= 12) return "12+ years · Leadership track";
  if (years >= 8) return "8+ years · Lead & Architect track";
  if (years >= 5) return "5+ years · Senior track";
  if (years >= 2) return "2+ years · Mid-level track";
  return "Entry-level track";
}

function nameTokens(profile: ProfessionalProfile): string[] {
  if (!profile.name?.trim()) return [];
  return profile.name
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1 && t !== "candidate");
}

function stripSectionHeaders(title: string): string {
  let result = title.trim();
  for (const header of RESUME_SECTION_HEADERS) {
    result = result.replace(new RegExp(`^${header}\\s+`, "i"), "");
    result = result.replace(new RegExp(`\\b${header}\\b`, "gi"), " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

function stripPersonName(title: string, tokens: string[]): string {
  if (tokens.length === 0) return title;

  let words = title.split(/\s+/);

  // Strip leading words that match name tokens (e.g. "Sakshi Khandelwal Senior QA...")
  while (words.length > 2) {
    const w0 = words[0]?.toLowerCase();
    const w1 = words[1]?.toLowerCase();
    const isName =
      (tokens.includes(w0) && tokens.includes(w1)) ||
      (tokens.includes(w0) && !ROLE_KEYWORD.test(words[0]) && !SENIORITY_PREFIX.test(words[0]));
    if (isName) {
      words = words.slice(tokens.includes(w1) ? 2 : 1);
    } else {
      break;
    }
  }

  return words.join(" ").trim();
}

/** Remove leading ALL-CAPS name blocks before the actual job title */
function stripLeadingCapsNameBlock(title: string): string {
  const words = title.split(/\s+/);
  const startIdx = words.findIndex(
    (w, i) =>
      ROLE_KEYWORD.test(w) ||
      /^(Senior|Lead|Staff|Principal|Junior|Associate|Quality|Test|Software|Automation)/i.test(w)
  );
  if (startIdx > 0) {
    const prefix = words.slice(0, startIdx);
    const looksLikeName = prefix.every((w) => /^[A-Z]{2,}$/.test(w) || /^[A-Z][a-z]+$/.test(w));
    if (looksLikeName) return words.slice(startIdx).join(" ");
  }
  return title;
}

export function sanitizeRoleTitle(raw: string, profile: ProfessionalProfile): string | null {
  let title = raw.trim().replace(/\s+/g, " ").replace(/\s*[|@].*$/, "");
  if (!title || title.length < 3 || title.length > 80) return null;
  if (/^\d/.test(title) || title.includes("@")) return null;
  if (/^candidate$/i.test(title)) return null;

  title = stripSectionHeaders(title);
  title = stripPersonName(title, nameTokens(profile));
  title = stripLeadingCapsNameBlock(title);
  title = stripSectionHeaders(title);

  if (!title || title.length < 3) return null;
  if (GENERIC_ONLY_TITLE.test(title)) return null;
  if (title.split(/\s+/).length < 2 && !MINIMUM_ROLE_TITLES.test(title)) return null;
  if (!ROLE_KEYWORD.test(title) && !/^(senior|lead|staff|principal|junior|associate)\s/i.test(title)) {
    return null;
  }

  // Reject if still looks like a person's name (2 words, no role keyword)
  const words = title.split(/\s+/);
  if (words.length <= 2 && !ROLE_KEYWORD.test(title) && !MINIMUM_ROLE_TITLES.test(title)) return null;

  return title
    .split(" ")
    .map((w, i) => {
      if (i === 0 && SENIORITY_PREFIX.test(w)) return w.replace(/\.$/, "");
      if (/^(SDET|QA|UI\/UX|API|SRE|VP)$/i.test(w)) return w.toUpperCase();
      if (w.length <= 3 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/\bUi\/ux\b/gi, "UI/UX")
    .replace(/\bSdet\b/g, "SDET")
    .replace(/\bQa\b/g, "QA");
}

function normalizeForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bsr\.?\b/g, "senior")
    .replace(/\bjr\.?\b/g, "junior")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeRoleTitles(titles: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const title of titles) {
    const key = normalizeForDedup(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(title);
  }
  return result;
}

/** Extract at most two clean titles — prefers confirmed current role over noisy resume parsing */
export function extractCleanResumeTitles(profile: ProfessionalProfile): string[] {
  const candidates: string[] = [];

  const primary = sanitizeRoleTitle(profile.currentRole, profile);
  if (primary) candidates.push(primary);

  for (const r of profile.roles || []) {
    const cleaned = sanitizeRoleTitle(r.title, profile);
    if (cleaned) candidates.push(cleaned);
  }

  // Only scan raw text when we couldn't extract a role from structured fields
  if (candidates.length === 0) {
    const text = profile.rawResumeText || "";
    const patterns = [
      /(?:^|\n)\s*(?:Senior|Lead|Staff|Principal|Junior|Associate)?\s*(?:Quality|Test|QA|Automation|Software|Backend|Frontend|DevOps|UI\/UX|Product|Platform|Cloud|Data|Mobile)?[\w\s\/\-&]*(?:Engineer|Developer|Designer|Analyst|Architect|Tester|SDET|Lead|Manager|Consultant|Specialist)\s*[—–\-|@]/gim,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const cleaned = sanitizeRoleTitle(match[0].replace(/[—–\-|@].*$/, "").trim(), profile);
        if (cleaned) candidates.push(cleaned);
      }
    }
  }

  return dedupeRoleTitles(candidates).slice(0, 2);
}

/** Experience-appropriate roles per track */
export const EXPERIENCE_ROLES: Record<CareerTrack, Record<ExperienceTier, string[]>> = {
  qa: {
    entry: ["Junior QA Engineer", "QA Analyst", "Manual Tester", "Trainee Test Engineer"],
    mid: ["QA Engineer", "Automation Test Engineer", "SDET", "API Test Engineer", "Manual QA Engineer"],
    senior: ["Senior QA Engineer", "Senior SDET", "Senior Automation Engineer", "Senior Quality Specialist"],
    lead: ["QA Lead", "Test Lead", "QA Architect", "Staff SDET", "Principal QA Engineer", "Quality Engineering Lead"],
    executive: ["QA Manager", "Test Manager", "Head of Quality Engineering", "Director of QA", "VP of Quality"],
  },
  backend: {
    entry: ["Junior Backend Developer", "Associate Software Engineer", "Junior Java Developer"],
    mid: ["Backend Engineer", "Java Software Engineer", "Python Developer", "Node.js Developer", "API Developer"],
    senior: ["Senior Backend Engineer", "Senior Java Developer", "Senior Software Engineer"],
    lead: ["Staff Backend Engineer", "Backend Architect", "Principal Engineer", "Technical Lead"],
    executive: ["Engineering Manager", "Backend Engineering Manager", "Director of Engineering", "Head of Engineering"],
  },
  frontend: {
    entry: ["Junior Frontend Developer", "Associate UI Developer", "Junior Web Developer"],
    mid: ["Frontend Engineer", "React Developer", "Angular Developer", "Web Developer"],
    senior: ["Senior Frontend Engineer", "Senior React Developer", "Senior UI Engineer"],
    lead: ["Frontend Tech Lead", "Staff Frontend Engineer", "UI Architect", "Principal Frontend Engineer"],
    executive: ["Frontend Engineering Manager", "Director of UI Engineering", "Head of Frontend"],
  },
  uiux: {
    entry: ["Junior UI Designer", "Junior UX Designer", "Associate Product Designer"],
    mid: ["UI/UX Designer", "UX Designer", "UI Designer", "Product Designer"],
    senior: ["Senior UI/UX Designer", "Senior Product Designer", "Senior UX Designer"],
    lead: ["Lead Product Designer", "Design Lead", "Principal Designer", "UX Architect"],
    executive: ["Design Manager", "Head of Design", "Director of Product Design", "VP of Design"],
  },
  devops: {
    entry: ["Junior DevOps Engineer", "Associate Cloud Engineer", "Junior Platform Engineer"],
    mid: ["DevOps Engineer", "Platform Engineer", "Cloud Engineer", "SRE"],
    senior: ["Senior DevOps Engineer", "Senior SRE", "Senior Cloud Engineer"],
    lead: ["Staff DevOps Engineer", "Platform Architect", "Principal SRE", "Infrastructure Architect"],
    executive: ["DevOps Manager", "Director of Platform Engineering", "Head of Infrastructure", "VP of Engineering"],
  },
  data: {
    entry: ["Junior Data Analyst", "Associate Data Engineer", "Junior BI Analyst"],
    mid: ["Data Engineer", "Data Analyst", "Analytics Engineer"],
    senior: ["Senior Data Engineer", "Senior Data Analyst", "Senior Analytics Engineer"],
    lead: ["Staff Data Engineer", "Data Architect", "Principal Data Engineer", "Analytics Lead"],
    executive: ["Data Engineering Manager", "Director of Data", "Head of Analytics"],
  },
  mobile: {
    entry: ["Junior Mobile Developer", "Associate iOS Developer", "Junior Android Developer"],
    mid: ["Mobile Developer", "iOS Developer", "Android Developer", "React Native Developer"],
    senior: ["Senior Mobile Developer", "Senior iOS Developer", "Senior Android Developer"],
    lead: ["Mobile Tech Lead", "Staff Mobile Engineer", "Mobile Architect", "Principal Mobile Engineer"],
    executive: ["Mobile Engineering Manager", "Director of Mobile Engineering"],
  },
  general: {
    entry: ["Junior Software Engineer", "Associate Developer", "Graduate Software Engineer"],
    mid: ["Software Engineer", "Software Developer", "Application Developer"],
    senior: ["Senior Software Engineer", "Senior Developer"],
    lead: ["Staff Engineer", "Technical Lead", "Software Architect", "Principal Engineer"],
    executive: ["Engineering Manager", "Director of Engineering", "Head of Engineering", "CTO"],
  },
};

/** Tiers to include when building suggestions */
export function tiersForExperience(years: number, currentRole?: string): ExperienceTier[] {
  const current = getExperienceTier(years);
  const hasSeniorTitle = /senior|lead|staff|principal|manager|director|architect/i.test(
    currentRole || ""
  );

  switch (current) {
    case "entry":
      return ["entry", "mid"];
    case "mid":
      return hasSeniorTitle ? ["mid", "senior"] : ["entry", "mid"];
    case "senior":
      return ["senior", "lead"];
    case "lead":
      return ["senior", "lead", "executive"];
    case "executive":
      return ["lead", "executive"];
    default:
      return ["mid"];
  }
}

export function getExperienceRoles(track: CareerTrack, years: number, currentRole?: string): string[] {
  const roles = EXPERIENCE_ROLES[track] || EXPERIENCE_ROLES.general;
  const tiers = tiersForExperience(years, currentRole);
  const combined: string[] = [];
  for (const tier of tiers) {
    combined.push(...(roles[tier] || []));
  }
  return dedupeRoleTitles(combined);
}
