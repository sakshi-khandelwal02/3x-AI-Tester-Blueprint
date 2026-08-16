"use client";

import type { AppState, InteractionSignals } from "@/types";
import { defaultAppState } from "@/lib/app-state-default";
import { repairStoredProfile, repairTargetRolePreference } from "@/lib/resume/parseResumeHeader";
import {
  PERSISTENCE_SCHEMA_VERSION,
  appOwnedKeysForUser,
  resumeTextStorageKey,
  stateStorageKey,
  legacyResumeTextStorageKeys,
  legacyStateStorageKeys,
} from "@/lib/persistence/keys";

export interface PersistedStateEnvelope {
  version: number;
  savedAt: string;
  state: AppState;
}

const defaultInteractions: InteractionSignals = {
  viewedJobs: {},
  dismissedJobIds: [],
  exploredFilters: [],
  skillsOfInterest: [],
};

function normalizeInteractions(signals?: InteractionSignals): InteractionSignals {
  if (!signals) return { ...defaultInteractions };
  return {
    viewedJobs: signals.viewedJobs ?? {},
    dismissedJobIds: signals.dismissedJobIds ?? [],
    exploredFilters: signals.exploredFilters ?? [],
    skillsOfInterest: signals.skillsOfInterest ?? [],
  };
}

function normalizeAppState(raw: Partial<AppState>): AppState {
  const merged: AppState = {
    ...defaultAppState,
    ...raw,
    jobs: raw.jobs ?? [],
    matches: raw.matches ?? {},
    savedJobs: raw.savedJobs ?? [],
    demoMode: raw.demoMode ?? false,
    interactions: normalizeInteractions(raw.interactions),
  };

  if (merged.profile) {
    merged.profile = repairStoredProfile(merged.profile);
  }

  if (merged.profile && merged.preferences) {
    const fixedTarget = repairTargetRolePreference(merged.preferences.targetRole, merged.profile);
    const fixedDesired = repairTargetRolePreference(merged.preferences.desiredJobTitle, merged.profile);
    if (fixedTarget !== merged.preferences.targetRole || fixedDesired !== merged.preferences.desiredJobTitle) {
      merged.preferences = {
        ...merged.preferences,
        ...(fixedTarget ? { targetRole: fixedTarget } : {}),
        ...(fixedDesired ? { desiredJobTitle: fixedDesired } : {}),
      };
    }
  }

  return merged;
}

function readFirstStorageKey(keys: string[]): string | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

function readResumeText(userId: string): string | undefined {
  try {
    return (
      readFirstStorageKey([
        resumeTextStorageKey(userId),
        ...legacyResumeTextStorageKeys(userId),
      ]) ?? undefined
    );
  } catch {
    return undefined;
  }
}

/** Load persisted career state for a user — safe on corrupt/missing data */
export function loadCareerState(userId: string): AppState {
  if (typeof window === "undefined") return { ...defaultAppState };

  try {
    const raw = readFirstStorageKey([stateStorageKey(userId), ...legacyStateStorageKeys(userId)]);
    if (!raw) return { ...defaultAppState };

    const parsed = JSON.parse(raw) as PersistedStateEnvelope | AppState;
    let state: AppState;

    if (parsed && typeof parsed === "object" && "state" in parsed && "version" in parsed) {
      state = normalizeAppState((parsed as PersistedStateEnvelope).state);
    } else {
      state = normalizeAppState(parsed as AppState);
    }

    const storedText = readResumeText(userId);
    if (state.profile && storedText?.trim()) {
      state = {
        ...state,
        profile: repairStoredProfile({ ...state.profile, rawResumeText: storedText }),
      };
    }

    return state;
  } catch (error) {
    console.warn("Could not load career state, using defaults:", error);
    return { ...defaultAppState };
  }
}

/** Persist career state — resume text stored separately to avoid quota errors */
export function saveCareerState(userId: string, state: AppState): void {
  if (typeof window === "undefined") return;

  const resumeText = state.profile?.rawResumeText;
  if (resumeText?.trim()) {
    saveResumeText(userId, resumeText);
  } else if (!state.profile) {
    clearResumeText(userId);
  }

  const stateToPersist: AppState = state.profile?.rawResumeText
    ? { ...state, profile: { ...state.profile, rawResumeText: undefined } }
    : state;

  const envelope: PersistedStateEnvelope = {
    version: PERSISTENCE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    state: stateToPersist,
  };

  try {
    localStorage.setItem(stateStorageKey(userId), JSON.stringify(envelope));
  } catch (error) {
    console.warn("Could not persist app state (quota exceeded?):", error);
  }
}

export function saveResumeText(userId: string, text: string | undefined): void {
  if (typeof window === "undefined") return;
  const key = resumeTextStorageKey(userId);
  if (!text?.trim()) {
    localStorage.removeItem(key);
    return;
  }
  try {
    localStorage.setItem(key, text);
  } catch (error) {
    console.warn("Could not persist resume text:", error);
  }
}

export function loadResumeText(userId: string): string | undefined {
  return readResumeText(userId);
}

export function clearResumeText(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(resumeTextStorageKey(userId));
}

/** Clear only keys owned by WorkPulse for this user — never localStorage.clear() */
export function clearUserCareerData(userId: string): void {
  if (typeof window === "undefined") return;
  for (const key of appOwnedKeysForUser(userId)) {
    localStorage.removeItem(key);
  }
}

export { defaultAppState as defaultCareerState, stateStorageKey, resumeTextStorageKey };
