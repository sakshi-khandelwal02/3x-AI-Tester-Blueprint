import { adzunaJobSource } from "./adzuna-source";
import { mockJobSource } from "./mock-source";
import type { JobSearchParams } from "./types";
import type { Job } from "@/types";

export interface JobSearchResult {
  jobs: Job[];
  source: "ADZUNA" | "MOCK" | "DEMO";
  demoMode: boolean;
  message?: string;
}

/** In-memory cache for jobs fetched from Adzuna (used by getJobById) */
const jobCache = new Map<string, Job>();

function cacheJobs(jobs: Job[]): void {
  jobs.forEach((j) => jobCache.set(j.id, j));
}

export async function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  if (adzunaJobSource.isAvailable()) {
    try {
      const jobs = await adzunaJobSource.searchJobs(params);
      cacheJobs(jobs);
      if (jobs.length > 0) {
        return {
          jobs,
          source: "ADZUNA",
          demoMode: false,
        };
      }
    } catch (error) {
      console.error("Adzuna search failed, falling back to demo jobs:", error);
    }
  }

  const mockJobs = await mockJobSource.searchJobs(params);
  cacheJobs(mockJobs);

  if (mockJobs.length > 0) {
    return {
      jobs: mockJobs,
      source: "MOCK",
      demoMode: true,
      message: adzunaJobSource.isAvailable()
        ? "No live listings matched your criteria — showing demo jobs for exploration."
        : "Live job API not configured — showing demo jobs. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel env for live listings.",
    };
  }

  return {
    jobs: [],
    source: adzunaJobSource.isAvailable() ? "ADZUNA" : "MOCK",
    demoMode: !adzunaJobSource.isAvailable(),
    message: "Zero jobs found for the selected criteria. Try a different location, work type, or freshness filter.",
  };
}

export function registerJob(job: Job): void {
  jobCache.set(job.id, job);
}

export function getJobById(id: string): Job | undefined {
  return jobCache.get(id) || mockJobSource.getJobById(id);
}

export function resolveJob(id: string, fallback?: Job): Job | undefined {
  return jobCache.get(id) || fallback || mockJobSource.getJobById(id);
}
