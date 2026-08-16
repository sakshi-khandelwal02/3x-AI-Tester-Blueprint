import type { FreshnessFilter, Job, RemoteType } from "@/types";
import { filterByFreshness, sortJobsByPostedAt } from "@/lib/jobs/types";

export type AdzunaCountry = "in" | "gb" | "us";

export interface LocationPreset {
  value: string;
  label: string;
  country: AdzunaCountry;
  group: "India" | "United Kingdom" | "United States";
}

export const LOCATION_GROUPS = [
  {
    label: "India",
    presets: [
      { value: "India", label: "India", country: "in" as const, group: "India" as const },
      { value: "Bangalore", label: "Bangalore", country: "in" as const, group: "India" as const },
      { value: "Pune", label: "Pune", country: "in" as const, group: "India" as const },
      { value: "Hyderabad", label: "Hyderabad", country: "in" as const, group: "India" as const },
      { value: "Chennai", label: "Chennai", country: "in" as const, group: "India" as const },
      { value: "Mumbai", label: "Mumbai", country: "in" as const, group: "India" as const },
      { value: "Nagpur", label: "Nagpur", country: "in" as const, group: "India" as const },
      { value: "Indore", label: "Indore", country: "in" as const, group: "India" as const },
      { value: "Delhi", label: "Delhi NCR", country: "in" as const, group: "India" as const },
    ],
  },
  {
    label: "United Kingdom",
    presets: [
      { value: "UK", label: "United Kingdom", country: "gb" as const, group: "United Kingdom" as const },
      { value: "London", label: "London", country: "gb" as const, group: "United Kingdom" as const },
    ],
  },
  {
    label: "United States",
    presets: [
      { value: "US", label: "United States", country: "us" as const, group: "United States" as const },
      { value: "New York", label: "New York", country: "us" as const, group: "United States" as const },
    ],
  },
] as const;

export const LOCATION_PRESETS: LocationPreset[] = LOCATION_GROUPS.flatMap((g) => [...g.presets]);

const INDIA_LOCATION_TERMS = [
  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "delhi",
  "new delhi",
  "hyderabad",
  "pune",
  "chennai",
  "nagpur",
  "indore",
  "kolkata",
  "gurgaon",
  "gurugram",
  "noida",
];

const UK_LOCATION_TERMS = ["uk", "united kingdom", "london", "england", "scotland", "wales", "manchester", "birmingham"];

const US_LOCATION_TERMS = [
  "us",
  "usa",
  "united states",
  "new york",
  "nyc",
  "california",
  "san francisco",
  "texas",
  "chicago",
  "boston",
  "seattle",
];

export const REMOTE_TYPE_OPTIONS: { value: RemoteType | "ANY"; label: string }[] = [
  { value: "ANY", label: "All types" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "Onsite" },
];

export const ANY_LOCATION = { value: "", label: "Any location" } as const;

/** Map UI location selection → Adzuna country code + where clause */
export function resolveAdzunaSearch(
  location?: string
): { country: AdzunaCountry | null; where: string } {
  const raw = location?.trim();
  if (!raw) {
    return { country: null, where: "" };
  }
  const lower = raw.toLowerCase();

  const preset = LOCATION_PRESETS.find((p) => p.value.toLowerCase() === lower);
  if (preset) {
    return { country: preset.country, where: preset.value };
  }

  if (INDIA_LOCATION_TERMS.some((term) => lower.includes(term))) {
    return { country: "in", where: raw };
  }
  if (UK_LOCATION_TERMS.some((term) => lower.includes(term))) {
    return { country: "gb", where: raw };
  }
  if (US_LOCATION_TERMS.some((term) => lower.includes(term))) {
    return { country: "us", where: raw };
  }

  return { country: "in", where: raw };
}

export const ADZUNA_COUNTRIES: AdzunaCountry[] = ["in", "gb", "us"];

export function jobMatchesLocation(job: Job, locationFilter?: string): boolean {
  const filter = locationFilter?.trim().toLowerCase();
  if (!filter) return true;

  const loc = job.location.toLowerCase();

  if (filter === "india") {
    return INDIA_LOCATION_TERMS.some((term) => loc.includes(term));
  }

  if (filter === "uk" || filter === "united kingdom") {
    return UK_LOCATION_TERMS.some((term) => loc.includes(term));
  }

  if (filter === "us" || filter === "usa" || filter === "united states") {
    return US_LOCATION_TERMS.some((term) => loc.includes(term));
  }

  if (filter === "delhi") {
    return ["delhi", "new delhi", "gurgaon", "gurugram", "noida"].some((term) => loc.includes(term));
  }

  return loc.includes(filter);
}

export function jobMatchesRemoteType(job: Job, remoteType?: RemoteType | "ANY"): boolean {
  if (!remoteType || remoteType === "ANY") return true;
  return job.remoteType === remoteType;
}

export function filterJobsByLocationAndType(
  jobs: Job[],
  location?: string,
  remoteType?: RemoteType | "ANY"
): Job[] {
  return jobs.filter(
    (job) => jobMatchesLocation(job, location) && jobMatchesRemoteType(job, remoteType)
  );
}

/** Single place for jobs list + dashboard display filtering — avoids server/client double-filter drift */
export interface JobDisplayFilters {
  freshness?: FreshnessFilter;
  remoteType?: RemoteType | "ANY";
  location?: string;
}

export function applyJobDisplayFilters(jobs: Job[], filters: JobDisplayFilters): Job[] {
  let filtered = [...jobs];

  if (filters.freshness) {
    filtered = filterByFreshness(filtered, filters.freshness);
  }

  if (filters.location?.trim()) {
    filtered = filtered.filter((j) => jobMatchesLocation(j, filters.location));
  }

  if (filters.remoteType && filters.remoteType !== "ANY") {
    filtered = filtered.filter((j) => jobMatchesRemoteType(j, filters.remoteType));
  }

  return sortJobsByPostedAt(filtered);
}

export function formatSearchCriteriaSummary(options: {
  location?: string;
  remoteType?: RemoteType | "ANY";
  freshness?: string;
  targetRole?: string;
}): string {
  const parts = [
    options.targetRole ? `role: ${options.targetRole}` : null,
    options.location ? `location: ${options.location}` : "location: any",
    options.remoteType && options.remoteType !== "ANY" ? `work type: ${options.remoteType}` : null,
    options.freshness ? `freshness: ${options.freshness}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
