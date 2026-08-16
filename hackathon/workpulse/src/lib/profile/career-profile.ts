import type {
  AppState,
  CareerPreferences,
  InteractionSignals,
  ProfessionalProfile,
  ResumeMetadata,
} from "@/types";
import { getSearchableTargetRole } from "@/lib/resume/parseResumeHeader";
import { extractResumeSkills } from "@/lib/skills/resumeSkills";

/** Structured career profile — personalization source for search, matching, gaps, dashboard */
export interface StructuredCareerProfile {
  currentRole: string;
  targetRoles: string[];
  yearsOfExperience: number;
  seniority: string;
  technicalSkills: string[];
  functionalSkills: string[];
  industries: string[];
  education: ProfessionalProfile["education"];
  certifications: string[];
  careerPreferences?: CareerPreferences;
  resumeMetadata?: ResumeMetadata;
  resumeAnalysis?: {
    professionalSummary: string;
    roles: ProfessionalProfile["roles"];
    achievements: string[];
    parsedAt: string;
  };
  interactionSignals: InteractionSignals;
}

function inferSeniority(years: number): string {
  if (years >= 10) return "Principal / Staff";
  if (years >= 7) return "Senior";
  if (years >= 4) return "Mid-Level";
  if (years >= 1) return "Junior";
  return "Entry";
}

/** Build structured profile from persisted app state */
export function buildStructuredCareerProfile(state: AppState): StructuredCareerProfile | null {
  if (!state.profile) return null;

  const profile = state.profile;
  const inventory = extractResumeSkills(profile);
  const targetRole = getSearchableTargetRole(
    profile.currentRole,
    state.preferences?.targetRole || state.preferences?.desiredJobTitle,
    profile.rawResumeText
  );

  const targetRoles = [
    targetRole,
    ...(state.preferences?.alternativeJobTitles ?? []),
    ...(state.preferences?.desiredJobTitle && state.preferences.desiredJobTitle !== targetRole
      ? [state.preferences.desiredJobTitle]
      : []),
  ].filter((r, i, arr) => r && arr.indexOf(r) === i);

  const technicalSkills = [
    ...inventory.allSkills,
    ...profile.programmingLanguages,
    ...profile.frameworks,
    ...profile.cloudTechnologies,
    ...profile.databases,
    ...profile.devOpsTools,
    ...profile.testingTools,
    ...profile.dataTechnologies,
    ...profile.aiMlTechnologies,
  ].filter((s, i, arr) => s && arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);

  return {
    currentRole: profile.currentRole,
    targetRoles,
    yearsOfExperience: profile.experienceYears,
    seniority: inferSeniority(profile.experienceYears),
    technicalSkills,
    functionalSkills: profile.domainExperience,
    industries: profile.industries,
    education: profile.education,
    certifications: profile.certifications,
    careerPreferences: state.preferences,
    resumeMetadata: state.resume,
    resumeAnalysis: {
      professionalSummary: profile.professionalSummary,
      roles: profile.roles,
      achievements: profile.achievements,
      parsedAt: profile.updatedAt,
    },
    interactionSignals: state.interactions ?? {
      viewedJobs: {},
      dismissedJobIds: [],
      exploredFilters: [],
      skillsOfInterest: [],
    },
  };
}
