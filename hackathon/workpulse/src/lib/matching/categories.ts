import type { Job, MatchCategory, MatchResult } from "@/types";
import type { FreshnessFilter } from "@/types";
import { getFreshnessCutoffMs } from "@/lib/jobs/types";

export type JobFilterKey =
  | "all"
  | "worth-review"
  | "excellent"
  | "good"
  | "stretch"
  | "recent";

export const MATCH_CATEGORY_MAP: Record<JobFilterKey, MatchCategory | null> = {
  all: null,
  "worth-review": null, // excellent + good
  excellent: "EXCELLENT_MATCH",
  good: "GOOD_MATCH",
  stretch: "STRETCH_OPPORTUNITY",
  recent: null,
};

export const FILTER_LABELS: Record<JobFilterKey, string> = {
  all: "All Jobs",
  "worth-review": "Opportunities Worth Reviewing",
  excellent: "Excellent Match",
  good: "Good Match",
  stretch: "Stretch Opportunities",
  recent: "Recently Posted",
};

const FRESHNESS_LABELS: Record<FreshnessFilter, string> = {
  "1h": "Last 1 Hour",
  "2h": "Last 2 Hours",
  "6h": "Last 6 Hours",
  "24h": "Last 24 Hours",
  "2d": "Last 2 Days",
  "7d": "Last 7 Days",
  "30d": "Last 1 Month",
};

/** Cutoff for the dashboard "Recent" tile and /jobs?filter=recent */
export function getRecentCutoffMs(freshness?: FreshnessFilter, now = Date.now()): number {
  switch (freshness) {
    case "1h":
    case "2h":
    case "6h":
    case "24h":
      return getFreshnessCutoffMs(freshness, now);
    default:
      // Wider searches still use "posted since yesterday" for the recent tile
      return getFreshnessCutoffMs("24h", now);
  }
}

/** @deprecated Use getRecentCutoffMs — kept for callers comparing window duration */
export function getRecentWindowMs(freshness?: FreshnessFilter): number {
  return Date.now() - getRecentCutoffMs(freshness);
}

export function getRecentTileLabel(freshness?: FreshnessFilter): string {
  switch (freshness) {
    case "1h":
      return "Posted last 1 hour";
    case "2h":
      return "Posted last 2 hours";
    case "6h":
      return "Posted last 6 hours";
    case "24h":
      return "Posted today or yesterday";
    default:
      return "Posted today or yesterday";
  }
}

export function getFreshnessLabel(freshness?: FreshnessFilter): string {
  if (!freshness) return "Last 7 Days";
  return FRESHNESS_LABELS[freshness] ?? freshness;
}

export const MATCH_SCORE_BANDS = {
  excellent: "85–100% match",
  good: "70–84% match",
  stretch: "50–69% match",
  low: "Below 50% match",
} as const;

export function filterKeyFromParam(param: string | null): JobFilterKey {
  const valid: JobFilterKey[] = ["all", "worth-review", "excellent", "good", "stretch", "recent"];
  return valid.includes(param as JobFilterKey) ? (param as JobFilterKey) : "all";
}

export function getMatchCategory(match: MatchResult | undefined): MatchCategory | null {
  return match?.category ?? null;
}

export function jobMatchesFilter(
  jobId: string,
  matches: Record<string, MatchResult>,
  filter: JobFilterKey,
  postedAt?: string,
  recentCutoffMs?: number
): boolean {
  const match = matches[jobId];

  switch (filter) {
    case "all":
      return true;
    case "worth-review":
      return (
        match?.category === "EXCELLENT_MATCH" || match?.category === "GOOD_MATCH"
      );
    case "excellent":
      return match?.category === "EXCELLENT_MATCH";
    case "good":
      return match?.category === "GOOD_MATCH";
    case "stretch":
      return match?.category === "STRETCH_OPPORTUNITY";
    case "recent": {
      if (!postedAt) return false;
      const cutoff = recentCutoffMs ?? getRecentCutoffMs("24h");
      const posted = new Date(postedAt).getTime();
      return !Number.isNaN(posted) && posted >= cutoff;
    }
    default:
      return true;
  }
}

export interface MatchStats {
  excellent: number;
  good: number;
  stretch: number;
  low: number;
  worthReview: number;
  recent: number;
  total: number;
}

export function computeMatchStats(
  jobs: { id: string; postedAt: string }[],
  matches: Record<string, MatchResult>,
  recentCutoffMs?: number
): MatchStats {
  const jobMatches = jobs.map((j) => matches[j.id]).filter(Boolean) as MatchResult[];
  const cutoff = recentCutoffMs ?? getRecentCutoffMs("24h");

  const excellent = jobMatches.filter((m) => m.category === "EXCELLENT_MATCH").length;
  const good = jobMatches.filter((m) => m.category === "GOOD_MATCH").length;
  const stretch = jobMatches.filter((m) => m.category === "STRETCH_OPPORTUNITY").length;
  const low = jobMatches.filter((m) => m.category === "LOW_MATCH").length;

  return {
    excellent,
    good,
    stretch,
    low,
    worthReview: excellent + good,
    recent: jobs.filter((j) => {
      const posted = new Date(j.postedAt).getTime();
      return !Number.isNaN(posted) && posted >= cutoff;
    }).length,
    total: jobs.length,
  };
}

export function filterJobsByCategory(
  jobs: { id: string; postedAt: string }[],
  matches: Record<string, MatchResult>,
  filter: JobFilterKey,
  recentCutoffMs?: number
) {
  return jobs.filter((j) => jobMatchesFilter(j.id, matches, filter, j.postedAt, recentCutoffMs));
}

export function jobsUrl(filter: JobFilterKey): string {
  return filter === "all" ? "/jobs" : `/jobs?filter=${filter}`;
}

export function marketOpportunityUrl(cluster: string): string {
  return `/jobs?filter=worth-review&cluster=${encodeURIComponent(cluster)}`;
}
