"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type {
  AppState,
  ProfessionalProfile,
  CareerPreferences,
  MatchResult,
  SavedJob,
  ResumeMetadata,
  FreshnessFilter,
  RemoteType,
  Job,
  ApplicationStatus,
} from "@/types";
import {
  loadCareerState,
  saveResumeText,
  clearResumeText,
  clearUserCareerData,
  defaultCareerState,
} from "@/lib/persistence/storage-service";
import { defaultAppState } from "@/lib/app-state-default";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchRemoteAppState,
  scheduleRemoteStateSync,
  isRemotePersistenceEnabled,
  clearRemoteUserData,
} from "@/lib/persistence/sync";
import {
  recordJobDismissed,
  recordJobViewed,
  recordFilterExplored,
} from "@/lib/matching/personalization";
import { buildSavedJobEntry, getSavedJobEntry } from "@/lib/jobs/saved-jobs";

interface AppContextValue {
  state: AppState;
  syncError: string | null;
  persistenceEnabled: boolean;
  setProfile: (profile: ProfessionalProfile) => void;
  setResume: (resume: ResumeMetadata, profile?: ProfessionalProfile) => void;
  applyNewResume: (resume: ResumeMetadata, profile: ProfessionalProfile) => void;
  removeResume: () => Promise<void>;
  setRoleSuggestions: (suggestions: AppState["roleSuggestions"]) => void;
  setPreferences: (prefs: CareerPreferences) => void;
  setJobs: (jobs: AppState["jobs"], demoMode: boolean, freshness?: FreshnessFilter, remoteType?: RemoteType | "ANY") => void;
  setLastSearchFreshness: (freshness: FreshnessFilter) => void;
  mergeAnalyzedJob: (job: AppState["jobs"][0], match: MatchResult) => void;
  upsertJobMatch: (job: AppState["jobs"][0], match: MatchResult) => void;
  setMatches: (matches: Record<string, MatchResult>) => void;
  setMarketAnalysis: (analysis: AppState["marketAnalysis"]) => void;
  setLearningPlan: (plan: AppState["learningPlan"]) => void;
  updateSavedJob: (saved: SavedJob) => void;
  saveJob: (job: Job, options?: { matchScore?: number; status?: ApplicationStatus }) => void;
  unsaveJob: (jobId: string) => void;
  recordJobViewed: (jobId: string) => void;
  recordFilterExplored: (filterKey: string) => void;
  resetDemo: () => Promise<void>;
  invalidateAnalysis: () => void;
  refresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(defaultAppState);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const persistenceEnabled = isRemotePersistenceEnabled();
  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback(
    (next: AppState) => {
      if (!user) return;
      if (next.profile?.rawResumeText?.trim()) {
        saveResumeText(user.userId, next.profile.rawResumeText);
      }
      scheduleRemoteStateSync(user.userId, next);
    },
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!user) {
        setState(defaultAppState);
        setHydrated(true);
        setSyncError(null);
        return;
      }

      setHydrated(false);
      const { state: loaded, error } = await fetchRemoteAppState(user.userId);
      if (cancelled) return;
      setState(loaded ?? defaultCareerState);
      setSyncError(error ?? null);
      setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  useEffect(() => {
    if (hydrated && user) {
      persist(state);
    }
  }, [state, hydrated, user?.userId, persist]);

  const setProfile = useCallback((profile: ProfessionalProfile) => {
    setState((s) => ({ ...s, profile }));
  }, []);

  const setResume = useCallback((resume: ResumeMetadata, profile?: ProfessionalProfile) => {
    setState((s) => ({
      ...s,
      resume,
      ...(profile ? { profile: { ...profile, confirmed: false } } : {}),
      ...(profile ? { roleSuggestions: [] } : {}),
      jobs: [],
      matches: {},
      marketAnalysis: undefined,
      learningPlan: undefined,
    }));
  }, []);

  const applyNewResume = useCallback((resume: ResumeMetadata, profile: ProfessionalProfile) => {
    setState((s) => ({
      ...s,
      resume,
      profile: { ...profile, confirmed: false },
      roleSuggestions: [],
      jobs: [],
      matches: {},
      marketAnalysis: undefined,
      learningPlan: undefined,
      savedJobs: [],
      interactions: {
        viewedJobs: {},
        dismissedJobIds: [],
        exploredFilters: s.interactions?.exploredFilters ?? [],
        skillsOfInterest: s.interactions?.skillsOfInterest ?? [],
      },
    }));
  }, []);

  const removeResume = useCallback(async () => {
    if (user) {
      clearResumeText(user.userId);
      await clearRemoteUserData();
    }
    setState((s) => ({
      ...defaultAppState,
      interactions: s.interactions,
    }));
  }, [user]);

  const resetDemo = useCallback(async () => {
    if (user) {
      clearUserCareerData(user.userId);
      await clearRemoteUserData();
    }
    setState(defaultAppState);
    setSyncError(null);
  }, [user]);

  const setRoleSuggestions = useCallback((roleSuggestions: AppState["roleSuggestions"]) => {
    setState((s) => ({ ...s, roleSuggestions }));
  }, []);

  const setPreferences = useCallback((preferences: CareerPreferences) => {
    setState((s) => ({ ...s, preferences }));
  }, []);

  const setJobs = useCallback((jobs: AppState["jobs"], demoMode: boolean, freshness?: FreshnessFilter, remoteType?: RemoteType | "ANY") => {
    setState((s) => ({
      ...s,
      jobs,
      demoMode,
      lastJobSearch: new Date().toISOString(),
      lastSearchFreshness: freshness ?? s.lastSearchFreshness,
      lastSearchRemoteType: remoteType ?? s.lastSearchRemoteType,
    }));
  }, []);

  const setLastSearchFreshness = useCallback((freshness: FreshnessFilter) => {
    setState((s) => ({ ...s, lastSearchFreshness: freshness }));
  }, []);

  const mergeAnalyzedJob = useCallback((job: AppState["jobs"][0], match: MatchResult) => {
    setState((s) => {
      const jobs = s.jobs.some((j) => j.id === job.id) ? s.jobs : [...s.jobs, job];
      return { ...s, jobs, matches: { ...s.matches, [job.id]: match } };
    });
  }, []);

  const upsertJobMatch = useCallback((job: AppState["jobs"][0], match: MatchResult) => {
    setState((s) => ({
      ...s,
      jobs: s.jobs.some((j) => j.id === job.id)
        ? s.jobs.map((j) => (j.id === job.id ? job : j))
        : [...s.jobs, job],
      matches: { ...s.matches, [job.id]: match },
    }));
  }, []);

  const setMatches = useCallback((matches: Record<string, MatchResult>) => {
    setState((s) => ({ ...s, matches }));
  }, []);

  const setMarketAnalysis = useCallback((marketAnalysis: AppState["marketAnalysis"]) => {
    setState((s) => ({ ...s, marketAnalysis }));
  }, []);

  const setLearningPlan = useCallback((learningPlan: AppState["learningPlan"]) => {
    setState((s) => ({ ...s, learningPlan }));
  }, []);

  const updateSavedJob = useCallback((saved: SavedJob) => {
    setState((s) => {
      const existing = getSavedJobEntry(s.savedJobs, saved.jobId);
      const jobFromState = s.jobs.find((j) => j.id === saved.jobId);
      const merged: SavedJob = {
        ...saved,
        savedAt: saved.savedAt || existing?.savedAt || new Date().toISOString(),
        jobSnapshot: saved.jobSnapshot ?? jobFromState ?? existing?.jobSnapshot,
        applicationPackage: saved.applicationPackage ?? existing?.applicationPackage,
        resumeOptimization: saved.resumeOptimization ?? existing?.resumeOptimization,
      };
      const without = s.savedJobs.filter((j) => j.jobId !== saved.jobId);
      let interactions = s.interactions ?? defaultAppState.interactions!;
      if (merged.status === "DISMISSED") {
        interactions = recordJobDismissed(interactions, saved.jobId);
      }
      return {
        ...s,
        savedJobs: [...without, merged],
        interactions,
      };
    });
  }, []);

  const saveJob = useCallback((job: Job, options?: { matchScore?: number; status?: ApplicationStatus }) => {
    setState((s) => {
      const existing = getSavedJobEntry(s.savedJobs, job.id);
      const entry = buildSavedJobEntry(job, existing, {
        matchScore: options?.matchScore ?? s.matches[job.id]?.matchScore,
        status: options?.status ?? "SAVED",
      });
      const without = s.savedJobs.filter((j) => j.jobId !== job.id);
      return { ...s, savedJobs: [...without, entry] };
    });
  }, []);

  const unsaveJob = useCallback((jobId: string) => {
    setState((s) => ({
      ...s,
      savedJobs: s.savedJobs.filter((j) => j.jobId !== jobId),
    }));
  }, []);

  const recordJobViewedAction = useCallback((jobId: string) => {
    setState((s) => ({
      ...s,
      interactions: recordJobViewed(s.interactions, jobId),
    }));
  }, []);

  const recordFilterExploredAction = useCallback((filterKey: string) => {
    setState((s) => ({
      ...s,
      interactions: recordFilterExplored(s.interactions, filterKey),
    }));
  }, []);

  const invalidateAnalysis = useCallback(() => {
    setState((s) => ({
      ...s,
      jobs: [],
      matches: {},
      marketAnalysis: undefined,
      learningPlan: undefined,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { state: loaded, error } = await fetchRemoteAppState(user.userId);
    setState(loaded ?? loadCareerState(user.userId));
    setSyncError(error ?? null);
  }, [user]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        state,
        syncError,
        persistenceEnabled,
        setProfile,
        setResume,
        applyNewResume,
        removeResume,
        setRoleSuggestions,
        setPreferences,
        setJobs,
        setLastSearchFreshness,
        mergeAnalyzedJob,
        upsertJobMatch,
        setMatches,
        setMarketAnalysis,
        setLearningPlan,
        updateSavedJob,
        saveJob,
        unsaveJob,
        recordJobViewed: recordJobViewedAction,
        recordFilterExplored: recordFilterExploredAction,
        resetDemo,
        invalidateAnalysis,
        refresh,
      }}
    >
      {syncError && persistenceEnabled && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 shadow-lg">
          Cloud sync unavailable — using local cache. {syncError}
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
