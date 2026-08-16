"use client";

/**
 * @deprecated Import from @/lib/persistence/storage-service instead.
 * Re-exports for backward compatibility.
 */
export {
  loadCareerState as loadState,
  saveCareerState as saveState,
  saveResumeText,
  loadResumeText,
  clearResumeText,
  clearUserCareerData as clearUserState,
  defaultCareerState as defaultState,
} from "@/lib/persistence/storage-service";

export { stateStorageKey, resumeTextStorageKey } from "@/lib/persistence/keys";
