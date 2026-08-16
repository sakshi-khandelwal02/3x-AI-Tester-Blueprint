import type { AppState } from "@/types";

export const defaultAppState: AppState = {
  jobs: [],
  matches: {},
  savedJobs: [],
  demoMode: false,
  interactions: {
    viewedJobs: {},
    dismissedJobIds: [],
    exploredFilters: [],
    skillsOfInterest: [],
  },
};
