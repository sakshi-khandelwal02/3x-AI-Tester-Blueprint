"use client";

import { useApp } from "@/components/providers/app-provider";
import { buildStructuredCareerProfile } from "@/lib/profile/career-profile";

/** Hook for components that need the structured career profile from persisted state */
export function usePersistentCareerProfile() {
  const { state } = useApp();
  const careerProfile = buildStructuredCareerProfile(state);
  return {
    state,
    careerProfile,
    hasProfile: Boolean(state.profile?.confirmed),
    resumeMetadata: state.resume,
  };
}
