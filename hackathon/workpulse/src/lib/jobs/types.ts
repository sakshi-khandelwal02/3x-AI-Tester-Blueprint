import type { FreshnessFilter, Job, RemoteType } from "@/types";
import { jobMatchesLocation } from "./locationFilter";

export interface JobSearchParams {
  query?: string;
  location?: string;
  country?: string;
  remoteType?: RemoteType | "ANY";
  freshness?: FreshnessFilter;
  targetRole?: string;
  /** Used in Adzuna search query only — not a hard filter */
  searchSkills?: string[];
  skills?: string[];
  companies?: string[];
  excludeCompanies?: string[];
}

export interface JobSource {
  name: string;
  searchJobs(params: JobSearchParams): Promise<Job[]>;
  isAvailable(): boolean;
}

const FRESHNESS_MS: Record<FreshnessFilter, number> = {
  "1h": 1 * 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Start of local calendar day, N days before today (matches Adzuna max_days_old semantics) */
function startOfDayDaysAgo(daysAgo: number, now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

/**
 * Cutoff timestamp for freshness filtering.
 * Sub-day filters use exact windows; day+ filters use calendar days so Adzuna
 * day-granular `created` timestamps are not excluded (e.g. "1 day ago" still in "Last 24 Hours").
 */
export function getFreshnessCutoffMs(freshness: FreshnessFilter, now = Date.now()): number {
  switch (freshness) {
    case "1h":
      return now - FRESHNESS_MS["1h"];
    case "2h":
      return now - FRESHNESS_MS["2h"];
    case "6h":
      return now - FRESHNESS_MS["6h"];
    case "24h":
      return startOfDayDaysAgo(1, now);
    case "2d":
      return startOfDayDaysAgo(2, now);
    case "7d":
      return startOfDayDaysAgo(7, now);
    case "30d":
      return startOfDayDaysAgo(30, now);
    default:
      return now - FRESHNESS_MS["7d"];
  }
}

export function isJobWithinFreshness(postedAt: string, freshness: FreshnessFilter, now = Date.now()): boolean {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return false;
  return posted >= getFreshnessCutoffMs(freshness, now);
}

export function sortJobsByPostedAt(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

/** Map UI freshness to Adzuna max_days_old (API uses whole days; sub-day windows filtered client-side) */
export function freshnessToMaxDaysOld(freshness?: FreshnessFilter): number | undefined {
  if (!freshness) return undefined;
  switch (freshness) {
    case "1h":
    case "2h":
    case "6h":
    case "24h":
      return 1;
    case "2d":
      return 2;
    case "7d":
      return 7;
    case "30d":
      return 30;
    default:
      return undefined;
  }
}

export function filterByFreshness(jobs: Job[], freshness?: FreshnessFilter): Job[] {
  if (!freshness) return jobs;
  const cutoff = getFreshnessCutoffMs(freshness);
  return jobs.filter((job) => {
    const posted = new Date(job.postedAt).getTime();
    return !Number.isNaN(posted) && posted >= cutoff;
  });
}

export function filterJobs(jobs: Job[], params: JobSearchParams): Job[] {
  let filtered = [...jobs];

  if (params.freshness) {
    filtered = filterByFreshness(filtered, params.freshness);
  }

  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (params.targetRole) {
    const roleWords = params.targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    filtered = filtered.filter((j) => {
      const text = `${j.title} ${j.description}`.toLowerCase();
      return roleWords.some((word) => text.includes(word));
    });
  }

  if (params.location) {
    filtered = filtered.filter((j) => jobMatchesLocation(j, params.location));
  }

  if (params.remoteType && params.remoteType !== "ANY") {
    filtered = filtered.filter((j) => j.remoteType === params.remoteType);
  }

  if (params.skills?.length) {
    filtered = filtered.filter((j) =>
      params.skills!.some((skill) =>
        j.skills.some((js) => js.toLowerCase().includes(skill.toLowerCase())) ||
        j.description.toLowerCase().includes(skill.toLowerCase())
      )
    );
  }

  if (params.excludeCompanies?.length) {
    filtered = filtered.filter(
      (j) => !params.excludeCompanies!.some((c) => j.company.toLowerCase().includes(c.toLowerCase()))
    );
  }

  return sortJobsByPostedAt(filtered);
}

/** Apply location-only filters after fetch — freshness and work type are applied client-side for consistency */
export function filterAdzunaJobs(jobs: Job[], params: JobSearchParams): Job[] {
  let filtered = [...jobs];

  if (params.location) {
    filtered = filtered.filter((j) => jobMatchesLocation(j, params.location));
  }

  if (params.excludeCompanies?.length) {
    filtered = filtered.filter(
      (j) =>
        !params.excludeCompanies!.some((c) => j.company.toLowerCase().includes(c.toLowerCase()))
    );
  }

  return sortJobsByPostedAt(filtered);
}
