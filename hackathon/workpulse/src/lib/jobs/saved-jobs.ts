import type { Job, SavedJob } from "@/types";

export function isJobSaved(savedJobs: SavedJob[], jobId: string): boolean {
  return savedJobs.some((s) => s.jobId === jobId && s.status !== "DISMISSED");
}

export function getSavedJobEntry(savedJobs: SavedJob[], jobId: string): SavedJob | undefined {
  return savedJobs.find((s) => s.jobId === jobId);
}

export function resolveSavedJob(
  jobId: string,
  jobs: Job[],
  savedJobs: SavedJob[]
): Job | undefined {
  return jobs.find((j) => j.id === jobId) ?? getSavedJobEntry(savedJobs, jobId)?.jobSnapshot;
}

export function buildSavedJobEntry(
  job: Job,
  existing: SavedJob | undefined,
  options?: { matchScore?: number; status?: SavedJob["status"] }
): SavedJob {
  const now = new Date().toISOString();
  return {
    jobId: job.id,
    status: options?.status ?? existing?.status ?? "SAVED",
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    matchScore: options?.matchScore ?? existing?.matchScore,
    jobSnapshot: job,
    applicationPackage: existing?.applicationPackage,
    resumeOptimization: existing?.resumeOptimization,
  };
}
