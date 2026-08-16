import { stripHtml } from "@/lib/utils";

const BOILERPLATE_PATTERNS = [
  /are you based in/i,
  /select your country/i,
  /sorry, this job is not available/i,
  /search for similar jobs/i,
  /popular jobs/i,
  /top job titles/i,
  /top job types/i,
  /top companies/i,
  /top locations/i,
  /country selection/i,
  /back to last search/i,
  /what\?\s*where\?\s*search/i,
  /show full description/i,
  /jobseekers/i,
  /recruiters/i,
  /adzuna intelligence/i,
  /valueMyCV/i,
  /applyIQ/i,
  /&copy;\s*\d{4}/i,
  /easy apply/i,
  /jobs\s*❯/i,
  /it jobs\s*❯/i,
];

const END_MARKER_PATTERNS = [
  /sorry, this job is not available/i,
  /search for similar jobs in your region/i,
  /\bsimilar jobs\b/i,
  /\bpopular jobs\b/i,
  /\bback to last search\b/i,
  /\bcountry selection\b/i,
  /\bjobseekers\b/i,
  /\brecruiters\b/i,
  /&copy;\s*\d{4}/i,
  /©\s*\d{4}/i,
  /\bshow full description\b/i,
];

const JUNK_LINE_PATTERNS = [
  /^are you based in/i,
  /^select your country/i,
  /^united kingdom$/i,
  /^australia$/i,
  /^india$/i,
  /^continue$/i,
  /^what\?$/i,
  /^where\?$/i,
  /^search$/i,
  /^advanced$/i,
  /^easy apply/i,
  /^back to last search/i,
  /^per year - estimated/i,
  /^permanent$/i,
  /^show full description$/i,
  /^jobs\s*❯/i,
  /^it jobs$/i,
  /^\?\s*$/,
  /^&pound;/,
  /^estimated$/i,
  /^❮/,
  /^❯/,
  /^change$/i,
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lower = more junk. Used to pick the best description candidate. */
export function scoreDescriptionQuality(text: string): number {
  if (!text.trim()) return -1000;
  let score = Math.min(text.length, 8000);
  for (const pattern of BOILERPLATE_PATTERNS) {
    if (pattern.test(text)) score -= 800;
  }
  const lines = text.split("\n").filter((l) => l.trim());
  const junkLines = lines.filter((l) => JUNK_LINE_PATTERNS.some((p) => p.test(l.trim())));
  score -= junkLines.length * 120;
  return score;
}

export function hasAdzunaBoilerplate(text: string): boolean {
  return BOILERPLATE_PATTERNS.some((p) => p.test(text));
}

/** Remove Adzuna nav/footer/region noise from scraped page text. */
export function cleanAdzunaDescription(text: string, jobTitle?: string): string {
  let cleaned = text.replace(/\r\n/g, "\n").trim();

  for (const pattern of END_MARKER_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match?.index !== undefined && match.index > 80) {
      cleaned = cleaned.slice(0, match.index).trim();
    }
  }

  if (jobTitle) {
    const titleCore = jobTitle.replace(/\s+job\s+in\s+\w+$/i, "").trim();
    const titleWords = titleCore.split(/\s+/).slice(0, 4).join(" ");
    if (titleWords.length > 3) {
      const subtitle = new RegExp(
        `${escapeRegex(titleWords)}[^\\n]{0,80}[—–-][^\\n]+`,
        "i"
      );
      const match = cleaned.match(subtitle);
      if (match?.index !== undefined && match.index >= 0) {
        cleaned = cleaned.slice(match.index);
      }
    }
  }

  const lines = cleaned.split("\n");
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (
      t.includes("—") ||
      t.includes("· Permanent") ||
      t.includes("· Hybrid") ||
      t.includes("· Remote") ||
      /^join /i.test(t) ||
      /^we are /i.test(t) ||
      /^about (the )?(role|job|company)/i.test(t) ||
      /^what you/i.test(t) ||
      /^what we'd/i.test(t) ||
      /^responsibilities/i.test(t) ||
      /^requirements/i.test(t) ||
      /^the role/i.test(t)
    ) {
      startIdx = i;
      break;
    }
  }

  const filtered = lines
    .slice(startIdx)
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      return !JUNK_LINE_PATTERNS.some((p) => p.test(t));
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return filtered;
}

function extractJsonLdDescription(html: string): string | null {
  const scripts = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scripts) return null;

  for (const script of scripts) {
    const body = script.replace(/<\/?script[^>]*>/gi, "").trim();
    try {
      const parsed = JSON.parse(body) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>)["@type"] === "JobPosting" &&
          typeof (item as Record<string, unknown>).description === "string"
        ) {
          return stripHtml((item as Record<string, string>).description);
        }
      }
    } catch {
      // try next script block
    }
  }
  return null;
}

/** Pull description from known Adzuna HTML regions before falling back to full-page text. */
function extractDescriptionRegionFromHtml(html: string): string | null {
  const regionPatterns = [
    /<div[^>]*class="[^"]*job[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*id="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*data-testid="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of regionPatterns) {
    const match = html.match(pattern);
    if (match?.[1] && match[1].length > 120) {
      return stripHtml(match[1]);
    }
  }
  return null;
}

function extractTextFromHtml(html: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  return withoutStyles
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&pound;/g, "£")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function extractAdzunaDescriptionFromHtml(
  html: string,
  jobTitle?: string
): string | null {
  const candidates: string[] = [];

  const jsonLd = extractJsonLdDescription(html);
  if (jsonLd) candidates.push(jsonLd);

  const region = extractDescriptionRegionFromHtml(html);
  if (region) candidates.push(region);

  const fullText = extractTextFromHtml(html);
  if (fullText) candidates.push(cleanAdzunaDescription(fullText, jobTitle));

  let best: string | null = null;
  let bestScore = -Infinity;
  for (const raw of candidates) {
    const cleaned = cleanAdzunaDescription(raw, jobTitle);
    const score = scoreDescriptionQuality(cleaned);
    if (score > bestScore && cleaned.length > 80) {
      bestScore = score;
      best = cleaned;
    }
  }

  if (!best || bestScore < 0 || hasAdzunaBoilerplate(best)) return null;
  return best.slice(0, 12000);
}

export function pickBestDescription(
  current: string,
  candidate: string,
  jobTitle?: string
): { text: string; improved: boolean } {
  const cleanedCandidate = cleanAdzunaDescription(candidate, jobTitle);
  const cleanedCurrent = cleanAdzunaDescription(current, jobTitle);

  const candidateScore = scoreDescriptionQuality(cleanedCandidate);
  const currentScore = scoreDescriptionQuality(cleanedCurrent);

  if (candidateScore > currentScore + 50 && !hasAdzunaBoilerplate(cleanedCandidate)) {
    return { text: cleanedCandidate, improved: true };
  }

  if (currentScore >= candidateScore && cleanedCurrent.length > 0) {
    return { text: cleanedCurrent, improved: cleanedCurrent !== current };
  }

  return { text: current, improved: false };
}
