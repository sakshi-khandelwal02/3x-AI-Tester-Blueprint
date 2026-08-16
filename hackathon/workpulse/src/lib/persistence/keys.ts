/** Application-owned localStorage keys — never call localStorage.clear() */

export const STORAGE_KEYS = {
  auth: "workpulse-auth",
  theme: "workpulse-theme",
  statePrefix: "workpulse-state-",
  resumeTextPrefix: "workpulse-resume-text-",
} as const;

/** Previous keys — migrated on read, not written again */
export const LEGACY_STORAGE_KEYS = {
  auth: ["work-pulse-auth", "career-radar-auth"] as const,
  theme: ["work-pulse-theme", "career-radar-theme"] as const,
  statePrefix: ["work-pulse-state-", "career-radar-state-"] as const,
  resumeTextPrefix: ["work-pulse-resume-text-", "career-radar-resume-text-"] as const,
};

export const PERSISTENCE_SCHEMA_VERSION = 1;

export function stateStorageKey(userId: string): string {
  return `${STORAGE_KEYS.statePrefix}${userId}`;
}

export function resumeTextStorageKey(userId: string): string {
  return `${STORAGE_KEYS.resumeTextPrefix}${userId}`;
}

export function legacyStateStorageKeys(userId: string): string[] {
  return LEGACY_STORAGE_KEYS.statePrefix.map((p) => `${p}${userId}`);
}

export function legacyResumeTextStorageKeys(userId: string): string[] {
  return LEGACY_STORAGE_KEYS.resumeTextPrefix.map((p) => `${p}${userId}`);
}

/** Keys owned by this app for a given user (for targeted reset) */
export function appOwnedKeysForUser(userId: string): string[] {
  return [
    stateStorageKey(userId),
    resumeTextStorageKey(userId),
    ...legacyStateStorageKeys(userId),
    ...legacyResumeTextStorageKeys(userId),
    STORAGE_KEYS.auth,
    ...LEGACY_STORAGE_KEYS.auth,
  ];
}
