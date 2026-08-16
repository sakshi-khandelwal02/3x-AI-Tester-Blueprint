import type { RoleSkillDemandResult } from "@/lib/market/roleSkillDemand";

export type RemoteType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN";
export type MatchCategory = "EXCELLENT_MATCH" | "GOOD_MATCH" | "STRETCH_OPPORTUNITY" | "LOW_MATCH";
export type ApplicationRecommendation = "APPLY_NOW" | "PREPARE_THEN_APPLY" | "CONSIDER" | "SKIP";
export type ApplicationStatus = "SAVED" | "APPLIED" | "INTERVIEW" | "REJECTED" | "DISMISSED";
export type FreshnessFilter = "1h" | "2h" | "6h" | "24h" | "2d" | "7d" | "30d";
export type SkillLevel = "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type JobSourceType = "ADZUNA" | "MOCK" | "DEMO" | "CUSTOM";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remoteType: RemoteType;
  description: string;
  postedAt: string;
  source: JobSourceType;
  sourceUrl: string;
  applicationUrl: string;
  salary?: string;
  experience?: string;
  employmentType: EmploymentType;
  skills: string[];
  /** True when Adzuna/search API returned a truncated description preview */
  descriptionPartial?: boolean;
}

export interface RoleHistory {
  title: string;
  company: string;
  duration?: string;
  responsibilities: string[];
  technologies: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface ProfessionalProfile {
  id: string;
  name: string;
  email?: string;
  currentRole: string;
  professionalSummary: string;
  experienceYears: number;
  skills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  libraries: string[];
  cloudTechnologies: string[];
  databases: string[];
  devOpsTools: string[];
  testingTools: string[];
  dataTechnologies: string[];
  aiMlTechnologies: string[];
  certifications: string[];
  education: Education[];
  projects: Project[];
  achievements: string[];
  domainExperience: string[];
  roles: RoleHistory[];
  industries: string[];
  rawResumeText?: string;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CareerPreferences {
  desiredJobTitle: string;
  alternativeJobTitles: string[];
  preferredLocations: string[];
  remotePreference: RemoteType | "ANY";
  minExperience?: number;
  maxExperience?: number;
  salaryPreference?: string;
  employmentType: EmploymentType | "ANY";
  preferredIndustries: string[];
  technologiesOfInterest: string[];
  companiesOfInterest: string[];
  companiesToExclude: string[];
  targetRole?: string;
}

export interface CareerRoleSuggestion {
  role: string;
  compatibility: number;
  reasons: string[];
  missingSkills: string[];
  recommendedNextSteps: string[];
}

export interface MatchResult {
  jobId: string;
  matchScore: number;
  category: MatchCategory;
  recommendation: ApplicationRecommendation;
  roleRelevance: number;
  matchedSkills: string[];
  missingMandatorySkills: string[];
  missingPreferredSkills: string[];
  experienceMatch: { required?: string; candidate: number; match: boolean; note: string };
  locationMatch: { match: boolean; note: string };
  roleMatch: { match: boolean; note: string };
  industryMatch: { match: boolean; note: string };
  strengths: string[];
  concerns: string[];
  reasoningSummary: string;
  whyMatch: string[];
  whyNotMatch: string[];
  applyAdvice: string;
  scoreBreakdown?: {
    skills: number;
    role: number;
    experience: number;
    location: number;
    overall: number;
  };
}

export interface SkillGap {
  skill: string;
  candidateLevel: SkillLevel;
  requiredLevel: SkillLevel;
  importance: "HIGH" | "MEDIUM" | "LOW";
  marketDemand: number;
  recommendedTopics: string[];
  learningResources: { title: string; url?: string; type: string }[];
  explanation: string;
}

export interface MarketSkillStat {
  skill: string;
  percentage: number;
  jobCount: number;
}

export interface CareerGapInsight {
  skill: string;
  marketPercentage: number;
  inProfile: boolean;
  recommendation: string;
}

export interface CareerReadiness {
  targetRole: string;
  readinessScore: number;
  topStrengths: string[];
  topGaps: string[];
  highestImpactImprovement: string;
  reason: string;
}

export interface LearningWeek {
  week: number;
  title: string;
  skills: string[];
  topics: string[];
  practiceProject: string;
  resources: { title: string; url?: string; type: string }[];
}

export interface LearningPlan {
  targetRole: string;
  durationDays: number;
  weeks: LearningWeek[];
  summary: string;
}

export interface ResumeChange {
  id: string;
  section: string;
  original: string;
  suggested: string;
  reason: string;
  requiresApproval: boolean;
  approved?: boolean;
  rejected?: boolean;
  edited?: string;
}

export interface ResumeOptimization {
  jobId: string;
  atsScoreBefore: number;
  atsScoreAfter: number;
  keywordsAdded: string[];
  suggestedChanges: ResumeChange[];
  breakdown: {
    keywordAlignment: number;
    experienceAlignment: number;
    roleAlignment: number;
    requiredSkills: number;
    resumeStructure: number;
  };
}

export interface ApplicationPackage {
  jobId: string;
  tailoredResume: string;
  professionalSummary: string;
  coverLetter: string;
  highlightedSkills: string[];
  checklist: string[];
  ready: boolean;
}

export interface SavedJob {
  jobId: string;
  status: ApplicationStatus;
  savedAt: string;
  updatedAt: string;
  matchScore?: number;
  /** Snapshot so saved jobs survive new job searches */
  jobSnapshot?: Job;
  applicationPackage?: ApplicationPackage;
  resumeOptimization?: ResumeOptimization;
}

/** Lightweight interaction signals for personalization — persisted in localStorage */
export interface InteractionSignals {
  viewedJobs: Record<string, string>;
  dismissedJobIds: string[];
  exploredFilters: string[];
  skillsOfInterest: string[];
}

export interface ResumeMetadata {
  fileName: string;
  uploadedAt: string;
  fileType?: string;
}

export interface StrongestMarketOpportunity {
  cluster: string;
  strongestSkills: string[];
  matchingOpportunities: number;
  why: string;
  highValueSkillToDevelop: string;
  relatedRoles: string[];
}

export interface PrioritizedSkillGap {
  skill: string;
  gapType: "confirmed_strength" | "adjacent" | "actual_gap";
  importance: "HIGH" | "MEDIUM" | "LOW";
  jobCount: number;
  jobPercentage: number;
  isMandatory: boolean;
  resumeEvidence: string | null;
  relatedSkills: string[];
  whyItMatters: string;
  opportunityImpact: string;
  priorityScore: number;
}

export interface AppState {
  profile?: ProfessionalProfile;
  resume?: ResumeMetadata;
  preferences?: CareerPreferences;
  roleSuggestions?: CareerRoleSuggestion[];
  jobs: Job[];
  matches: Record<string, MatchResult>;
  marketAnalysis?: {
    skills: MarketSkillStat[];
    gaps: CareerGapInsight[];
    readiness: CareerReadiness;
    totalJobsAnalyzed: number;
    strongestOpportunity?: StrongestMarketOpportunity;
    prioritizedGaps?: PrioritizedSkillGap[];
    roleSkillDemand?: RoleSkillDemandResult;
  };
  learningPlan?: LearningPlan;
  savedJobs: SavedJob[];
  demoMode: boolean;
  interactions?: InteractionSignals;
  lastJobSearch?: string;
  lastSearchFreshness?: FreshnessFilter;
  /** Work type used for the last job search (display filters apply client-side on stored jobs) */
  lastSearchRemoteType?: RemoteType | "ANY";
}
