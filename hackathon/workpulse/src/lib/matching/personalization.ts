import type { InteractionSignals, Job, MatchResult, SavedJob } from "@/types";

/** Lightweight personalization from profile interactions — no ML retraining */
export function rankJobsWithInteractions(
  jobs: Job[],
  matches: Record<string, MatchResult>,
  interactions?: InteractionSignals,
  savedJobs: SavedJob[] = []
): Job[] {
  if (!interactions && savedJobs.length === 0) {
    return [...jobs].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
  }

  const dismissed = new Set(interactions?.dismissedJobIds ?? []);
  const savedIds = new Set(savedJobs.map((s) => s.jobId));
  const viewed = interactions?.viewedJobs ?? {};

  const savedCompanies = new Set(
    savedJobs
      .map((s) => jobs.find((j) => j.id === s.jobId)?.company.toLowerCase())
      .filter(Boolean) as string[]
  );

  const scored = jobs.map((job) => {
    let boost = 0;
    const match = matches[job.id];

    if (dismissed.has(job.id)) boost -= 50;
    if (savedIds.has(job.id)) boost += 15;
    if (viewed[job.id]) boost += 5;
    if (savedCompanies.has(job.company.toLowerCase())) boost += 8;
    if (match?.category === "EXCELLENT_MATCH") boost += 10;
    if (match?.category === "GOOD_MATCH") boost += 5;

    const skillsOfInterest = interactions?.skillsOfInterest ?? [];
    if (skillsOfInterest.length > 0) {
      const overlap = job.skills.filter((s) =>
        skillsOfInterest.some((i) => i.toLowerCase() === s.toLowerCase())
      ).length;
      boost += overlap * 3;
    }

    return {
      job,
      score: boost + (match?.matchScore ?? 0) * 0.01 + new Date(job.postedAt).getTime() / 1e15,
    };
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.job);
}

export function recordJobViewed(
  interactions: InteractionSignals | undefined,
  jobId: string
): InteractionSignals {
  const base = interactions ?? {
    viewedJobs: {},
    dismissedJobIds: [],
    exploredFilters: [],
    skillsOfInterest: [],
  };
  return {
    ...base,
    viewedJobs: { ...base.viewedJobs, [jobId]: new Date().toISOString() },
  };
}

export function recordFilterExplored(
  interactions: InteractionSignals | undefined,
  filterKey: string
): InteractionSignals {
  const base = interactions ?? {
    viewedJobs: {},
    dismissedJobIds: [],
    exploredFilters: [],
    skillsOfInterest: [],
  };
  const explored = base.exploredFilters.includes(filterKey)
    ? base.exploredFilters
    : [...base.exploredFilters, filterKey].slice(-20);
  return { ...base, exploredFilters: explored };
}

export function recordJobDismissed(
  interactions: InteractionSignals | undefined,
  jobId: string
): InteractionSignals {
  const base = interactions ?? {
    viewedJobs: {},
    dismissedJobIds: [],
    exploredFilters: [],
    skillsOfInterest: [],
  };
  if (base.dismissedJobIds.includes(jobId)) return base;
  return { ...base, dismissedJobIds: [...base.dismissedJobIds, jobId].slice(-100) };
}
