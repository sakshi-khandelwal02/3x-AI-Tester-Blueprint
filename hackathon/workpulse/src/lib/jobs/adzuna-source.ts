import type { Job } from "@/types";
import { filterAdzunaJobs, freshnessToMaxDaysOld, type JobSearchParams, type JobSource } from "./types";
import { extractSkillsFromText } from "@/lib/skills/normalize";
import { stripHtml } from "@/lib/utils";
import { ADZUNA_COUNTRIES, resolveAdzunaSearch, type AdzunaCountry } from "./locationFilter";

const RESULTS_PER_COUNTRY = 50;
const MAX_MERGED_RESULTS = 120;

export class AdzunaJobSource implements JobSource {
  name = "AdzunaJobSource";

  isAvailable(): boolean {
    return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  }

  async searchJobs(params: JobSearchParams): Promise<Job[]> {
    if (!this.isAvailable()) {
      throw new Error("Adzuna credentials not configured");
    }

    const resolved = resolveAdzunaSearch(params.location);
    const hasLocation = Boolean(params.location?.trim());
    const country = (params.country as AdzunaCountry) || resolved.country;

    if (!hasLocation && !country) {
      const results = await Promise.allSettled(
        ADZUNA_COUNTRIES.map((c) => this.fetchCountryJobs(c, params, ""))
      );
      const batches = results
        .map((result, index) => {
          if (result.status === "fulfilled") return result.value;
          console.error(`Adzuna search failed for ${ADZUNA_COUNTRIES[index]}:`, result.reason);
          return [];
        })
        .flat();
      const merged = dedupeJobs(batches).slice(0, MAX_MERGED_RESULTS);
      if (merged.length === 0) return [];
      return filterAdzunaJobs(merged, params);
    }

    const where = hasLocation ? resolved.where : "";
    const jobs = await this.fetchCountryJobs(country || "in", params, where);
    if (jobs.length === 0) return [];
    return filterAdzunaJobs(jobs, params);
  }

  private async fetchCountryJobs(
    country: AdzunaCountry,
    params: JobSearchParams,
    where: string
  ): Promise<Job[]> {
    const appId = process.env.ADZUNA_APP_ID!;
    const appKey = process.env.ADZUNA_APP_KEY!;
    const searchTerms = [params.targetRole, params.query].filter(Boolean).join(" ");

    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", String(RESULTS_PER_COUNTRY));
    url.searchParams.set("sort_by", "date");
    const maxDays = freshnessToMaxDaysOld(params.freshness);
    if (maxDays !== undefined) {
      url.searchParams.set("max_days_old", String(maxDays));
    }
    if (searchTerms) url.searchParams.set("what", searchTerms);
    if (where) url.searchParams.set("where", where);

    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Adzuna API error (${country}): ${response.status} ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    return (data.results || []).map((item: AdzunaResultItem) => mapAdzunaResult(item, country));
  }
}

interface AdzunaResultItem {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description: string;
  created: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
}

function mapAdzunaResult(item: AdzunaResultItem, country: AdzunaCountry): Job {
  const title = item.title;
  const location = item.location?.display_name || "Unknown";
  const description = stripHtml(item.description);

  return {
    id: `adzuna-${country}-${item.id}`,
    title,
    company: item.company?.display_name || "Unknown Company",
    location,
    remoteType: inferRemoteType(description, location, title),
    description,
    postedAt: item.created,
    source: "ADZUNA",
    sourceUrl: item.redirect_url,
    applicationUrl: item.redirect_url,
    salary: formatSalary(item.salary_min, item.salary_max, country),
    experience: undefined,
    employmentType: mapEmploymentType(item.contract_type),
    skills: extractSkillsFromText(stripHtml(item.description)),
    descriptionPartial: true,
  };
}

function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return [...jobs]
    .sort((a, b) => {
      const byDate = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
    })
    .filter((job) => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatSalary(min?: number, max?: number, country?: AdzunaCountry): string | undefined {
  if (!min && !max) return undefined;
  const lo = min ?? max!;
  const hi = max ?? min!;
  if (country === "in") {
    return `₹${lo.toLocaleString("en-IN")} - ₹${hi.toLocaleString("en-IN")}`;
  }
  if (country === "gb") {
    return `£${lo.toLocaleString("en-GB")} - £${hi.toLocaleString("en-GB")}`;
  }
  return `$${lo.toLocaleString("en-US")} - $${hi.toLocaleString("en-US")}`;
}

function inferRemoteType(description: string, location?: string, title?: string): Job["remoteType"] {
  const text = `${title || ""} ${stripHtml(description)} ${location || ""}`.toLowerCase();
  if (
    /\bremote\b/.test(text) ||
    text.includes("work from home") ||
    text.includes("work-from-home") ||
    text.includes("wfh")
  ) {
    return "REMOTE";
  }
  if (text.includes("hybrid")) return "HYBRID";
  if (text.includes("onsite") || text.includes("on-site") || text.includes("on site")) {
    return "ONSITE";
  }
  if (location && location.trim() && !location.toLowerCase().includes("remote")) {
    return "ONSITE";
  }
  return "UNKNOWN";
}

function mapEmploymentType(contractType?: string): Job["employmentType"] {
  if (!contractType) return "UNKNOWN";
  const t = contractType.toLowerCase();
  if (t.includes("full")) return "FULL_TIME";
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("contract")) return "CONTRACT";
  return "UNKNOWN";
}

export const adzunaJobSource = new AdzunaJobSource();
