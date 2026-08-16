import type { Job } from "@/types";
import { extractSkillsFromText } from "@/lib/skills/normalize";
import { stripHtml } from "@/lib/utils";
import type { AdzunaCountry } from "./locationFilter";
import {
  extractAdzunaDescriptionFromHtml,
  pickBestDescription,
  scoreDescriptionQuality,
  hasAdzunaBoilerplate,
} from "./cleanAdzunaDescription";

const FETCH_TIMEOUT_MS = 8000;

interface ParsedAdzunaId {
  country: AdzunaCountry;
  adId: string;
}

/** Parse internal id format: adzuna-in-5785773102 */
export function parseAdzunaJobId(jobId: string): ParsedAdzunaId | null {
  const match = jobId.match(/^adzuna-(in|gb|us)-(\d+)$/);
  if (!match) return null;
  return { country: match[1] as AdzunaCountry, adId: match[2] };
}

/**
 * Adzuna's public search API only returns ~500 char snippets (documented limitation).
 * Attempts: (1) re-fetch via search API by id, (2) fetch redirect/landing page HTML.
 */
export async function enrichAdzunaJob(job: Job): Promise<{
  job: Job;
  enriched: boolean;
  enrichmentNote?: string;
}> {
  if (job.source !== "ADZUNA") {
    return { job, enriched: false };
  }

  const parsed = parseAdzunaJobId(job.id);
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  let bestDescription = stripHtml(job.description);
  let enriched = false;

  if (parsed && appId && appKey) {
    try {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${parsed.country}/search/1`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "50");
      url.searchParams.set("what", job.title.split(" ").slice(0, 3).join(" "));

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const hit = (data.results || []).find(
          (item: { id: string | number }) => String(item.id) === parsed.adId
        );
        if (hit?.description) {
          const picked = pickBestDescription(bestDescription, stripHtml(hit.description), job.title);
          bestDescription = picked.text;
          enriched = picked.improved && bestDescription.length > 520 && !hasAdzunaBoilerplate(bestDescription);
        }
      }
    } catch {
      // fall through
    }
  }

  if (!enriched && job.applicationUrl) {
    try {
      const response = await fetch(job.applicationUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; WorkPulse/1.0; +https://workpulse-delta-eight.vercel.app)",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });

      if (response.ok) {
        const html = await response.text();
        const extracted = extractAdzunaDescriptionFromHtml(html, job.title);
        if (extracted) {
          const picked = pickBestDescription(bestDescription, extracted, job.title);
          if (
            picked.improved &&
            scoreDescriptionQuality(picked.text) > scoreDescriptionQuality(bestDescription) + 50
          ) {
            bestDescription = picked.text;
            enriched = picked.text.length > 520 && !hasAdzunaBoilerplate(picked.text);
          }
        }
      }
    } catch {
      // Adzuna often blocks automated fetches (403/429)
    }
  }

  const descriptionPartial =
    !enriched &&
    (bestDescription.endsWith("…") ||
      bestDescription.endsWith("...") ||
      bestDescription.length >= 498 ||
      hasAdzunaBoilerplate(bestDescription));

  const updatedJob: Job = {
    ...job,
    description: bestDescription,
    descriptionPartial,
    skills: extractSkillsFromText(bestDescription),
  };

  return {
    job: updatedJob,
    enriched,
    enrichmentNote: enriched
      ? undefined
      : "Adzuna provides a short preview only. Use View Full Posting for the complete job description.",
  };
}
