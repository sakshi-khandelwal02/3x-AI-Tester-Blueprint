/** Parse name, email, and contact blocks from varied resume header formats (incl. DOCX single-line headers) */

const ROLE_KEYWORD =
  /\b(engineer|developer|designer|analyst|architect|tester|sdet|manager|lead|specialist|consultant|director|devops|administrator|scientist|programmer)\b/i;

const ADDRESS_HINT =
  /\b(road|street|sadan|nagar|colony|lane|avenue|apt|suite|pincode|pin\s*code|\d{6}\b|india|u\.?p\.?|karnataka|bangalore|jhansi|delhi|mumbai|hyderabad|pune)\b/i;

function capitalizeWord(w: string): string {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function toTitleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => capitalizeWord(w.replace(/\d+$/, "")))
    .join(" ");
}

export function extractEmailFromText(text: string): string | undefined {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match?.[0];
}

export function isContactOrAddressLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length > 55) return true;
  if (/@/.test(trimmed)) return true;
  if (/\+?\d[\d\s()-]{8,}/.test(trimmed)) return true;
  if (ADDRESS_HINT.test(trimmed)) return true;
  if (trimmed.includes(",") && !ROLE_KEYWORD.test(trimmed)) return true;
  if (/linkedin|github|portfolio/i.test(trimmed)) return true;
  return false;
}

function isLikelyPersonName(text: string): boolean {
  const cleaned = text.replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3 || cleaned.length > 50) return false;
  if (/@|\+?\d{5}|road|street|engineer|developer|summary|experience|skills|linkedin/i.test(cleaned)) {
    return false;
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((w) => /^[A-Za-z.'-]+$/.test(w));
}

/** Infer full name from email local part (e.g. agnihotri.avneet → Avneet Agnihotri) */
export function inferFullNameFromEmail(email: string): string | undefined {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const parts = local.split(/[._-]+/).filter((p) => p.length >= 2);
  if (parts.length >= 2) {
    const [first, second] = parts.length === 2 ? [parts[1], parts[0]] : [parts[0], parts[parts.length - 1]];
    const name = `${capitalizeWord(first)} ${capitalizeWord(second)}`;
    if (isLikelyPersonName(name)) return name;
  }
  if (parts.length === 1 && parts[0].length >= 3) {
    return capitalizeWord(parts[0]);
  }
  return undefined;
}

function parseNameFromContactLine(line: string): string | undefined {
  if (!line?.trim()) return undefined;

  let chunk = line.split(/[\w.-]+@[\w.-]+\.\w+/)[0] || line;
  chunk = chunk.replace(/\+?\d[\d\s()-]{8,}.*/i, "").trim();
  chunk = chunk.replace(/\|.*$/, "").trim();

  const beforeComma = chunk.split(",")[0]?.trim() ?? chunk;
  let name = beforeComma.replace(/\d+$/, "").replace(/[^A-Za-z\s.'-]/g, " ").replace(/\s+/g, " ").trim();

  if (isLikelyPersonName(name)) return toTitleCaseName(name);

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const firstTwo = words.slice(0, 2).join(" ");
    if (isLikelyPersonName(firstTwo)) return toTitleCaseName(firstTwo);
  }

  return undefined;
}

export function extractNameFromResumeText(text: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const email = extractEmailFromText(text);

  if (lines[0]) {
    const fromContact = parseNameFromContactLine(lines[0]);
    if (fromContact) return fromContact;
  }

  if (email) {
    const fromEmail = inferFullNameFromEmail(email);
    if (fromEmail) return fromEmail;
  }

  for (const line of lines.slice(0, 10)) {
    if (isContactOrAddressLine(line)) continue;
    if (/^(professional summary|summary|experience|skills|education)/i.test(line)) break;
    if (isLikelyPersonName(line.replace(/\d+$/, ""))) {
      return toTitleCaseName(line.replace(/\d+$/, ""));
    }
  }

  return undefined;
}

export function extractCurrentRoleFromResumeText(text: string): string | undefined {
  const summaryRole = text.match(
    /(?:PROFESSIONAL SUMMARY|CAREER SUMMARY|SUMMARY)[\s\S]{0,400}?((?:Senior|Lead|Staff|Principal|Junior|Associate)?\s*[\w\s\/-]*(?:Engineer|Developer|Designer|Analyst|Architect|Tester|SDET|Manager|Consultant|Specialist|Administrator))(?:\s+with|\s*,|\s+\d|\s+in\b)/i
  );
  if (summaryRole?.[1]) {
    const role = summaryRole[1].trim();
    if (role.length >= 5 && role.length <= 60 && !isContactOrAddressLine(role)) return role;
  }

  const jobTitleMatches = [
    ...text.matchAll(
      /((?:Senior|Lead|Staff|Principal|Junior|Associate)\s+[\w\s\/-]*(?:Engineer|Developer|Designer|Analyst|Architect|Tester|SDET|Manager|Consultant|Specialist|Administrator))\s*[|–—-]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/gi
    ),
  ];
  if (jobTitleMatches.length > 0) {
    const role = jobTitleMatches[0][1].trim();
    if (!isContactOrAddressLine(role)) return role;
  }

  const rolePatterns = [
    /((?:Senior\s+|Lead\s+|Staff\s+)?(?:UI\/UX|UX\/UI)\s*Designer)/i,
    /((?:Senior\s+|Lead\s+)?(?:Product|UX|UI)\s+Designer)/i,
    /((?:Senior\s+|Lead\s+)?(?:QA|Quality Assurance|Test|Automation|Manual)\s*(?:Engineer|Analyst|Tester|Lead))/i,
    /((?:Senior\s+|Lead\s+)?SDET)/i,
    /((?:Senior\s+|Lead\s+)?(?:DevOps|Platform|Cloud|SRE|Site Reliability)\s*Engineer)/i,
    /((?:Senior\s+|Lead\s+)?(?:Backend|Front-end|Frontend|Full Stack|Full-Stack|Mobile|Data|ML|AI)\s*(?:Engineer|Developer|Architect))/i,
    /((?:Senior\s+|Lead\s+)?Software\s*(?:Engineer|Developer))/i,
  ];

  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match?.[1] && !isContactOrAddressLine(match[1])) return match[1].trim();
  }

  const headerMatch = text.match(/^(.+?)\s*[|–-]\s*.+$/m);
  if (headerMatch && !isContactOrAddressLine(headerMatch[1])) {
    const role = headerMatch[1].trim();
    if (role.length >= 3 && role.length <= 80 && ROLE_KEYWORD.test(role)) return role;
  }

  return undefined;
}

/** Insert newlines when DOCX extraction glues section headers to content */
export function normalizeResumeText(text: string): string {
  let t = text.replace(/\r\n/g, "\n");

  const sections = [
    "PROFESSIONAL EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL SUMMARY",
    "CAREER SUMMARY",
    "KEY SKILLS",
    "TECHNICAL SKILLS",
    "EDUCATION",
    "CERTIFICATIONS",
    "PROJECTS",
  ];

  for (const section of sections) {
    t = t.replace(new RegExp(`(${section})(?=\\S)`, "gi"), "$1\n");
  }

  t = t.replace(/([a-z])(Senior|Lead|Staff|Principal|Junior|Associate|DevOps|Cloud)\s/gi, "$1\n$2 ");
  t = t.replace(/(Karnataka|Maharashtra|India)(Senior|Lead|DevOps|Cloud)/gi, "$1\n$2");
  t = t.replace(/(@\w+\.\w+)(LinkedIn|GitHub|Portfolio)/gi, "$1\n$2");
  t = t.replace(/(\d{10,})(\s*[|@]|\w+@)/g, "$1 $2");

  return t;
}

export function getSearchableTargetRole(
  currentRole: string | undefined,
  preferredRole: string | undefined,
  rawText?: string
): string {
  const candidates = [preferredRole, currentRole].filter(Boolean) as string[];
  for (const c of candidates) {
    if (!isContactOrAddressLine(c) && c.length <= 60 && ROLE_KEYWORD.test(c)) return c;
  }
  if (rawText) {
    const extracted = extractCurrentRoleFromResumeText(rawText);
    if (extracted) return extracted;
  }
  return preferredRole || currentRole || "Software Engineer";
}

/** Fix name/role when an older parse stored address lines or generic "Candidate" */
export function repairStoredProfile<T extends { name?: string; currentRole?: string; rawResumeText?: string; updatedAt?: string }>(
  profile: T
): T {
  if (!profile.rawResumeText?.trim()) return profile;

  const rawText = normalizeResumeText(profile.rawResumeText);
  const updated = { ...profile, rawResumeText: rawText };
  let changed = rawText !== profile.rawResumeText;

  const fixedName = extractNameFromResumeText(rawText);
  if (
    fixedName &&
    (!profile.name?.trim() ||
      profile.name.toLowerCase() === "candidate" ||
      isContactOrAddressLine(profile.name))
  ) {
    updated.name = fixedName;
    changed = true;
  }

  const roleInvalid =
    !profile.currentRole?.trim() ||
    isContactOrAddressLine(profile.currentRole) ||
    profile.currentRole.length > 60 ||
    !ROLE_KEYWORD.test(profile.currentRole);

  if (roleInvalid) {
    const fixedRole = extractCurrentRoleFromResumeText(rawText);
    if (fixedRole) {
      updated.currentRole = fixedRole;
      changed = true;
    }
  }

  if (changed && "updatedAt" in updated) {
    updated.updatedAt = new Date().toISOString();
  }

  return changed ? updated : profile;
}

export function repairTargetRolePreference(
  role: string | undefined,
  profile: { currentRole?: string; rawResumeText?: string }
): string | undefined {
  if (!role?.trim() || !isContactOrAddressLine(role)) return role;
  return getSearchableTargetRole(profile.currentRole, undefined, profile.rawResumeText);
}
