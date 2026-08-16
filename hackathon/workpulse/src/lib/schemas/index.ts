import { z } from "zod";

export const ProfessionalProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  currentRole: z.string(),
  professionalSummary: z.string(),
  experienceYears: z.number(),
  skills: z.array(z.string()),
  programmingLanguages: z.array(z.string()),
  frameworks: z.array(z.string()),
  libraries: z.array(z.string()),
  cloudTechnologies: z.array(z.string()),
  databases: z.array(z.string()),
  devOpsTools: z.array(z.string()),
  testingTools: z.array(z.string()),
  dataTechnologies: z.array(z.string()),
  aiMlTechnologies: z.array(z.string()),
  certifications: z.array(z.string()),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string().optional(),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    })
  ),
  achievements: z.array(z.string()),
  domainExperience: z.array(z.string()),
  roles: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      duration: z.string().optional(),
      responsibilities: z.array(z.string()),
      technologies: z.array(z.string()),
    })
  ),
  industries: z.array(z.string()),
  rawResumeText: z.string().optional(),
  confirmed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CareerRoleSuggestionSchema = z.object({
  role: z.string(),
  compatibility: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
});

export const MatchResultSchema = z.object({
  jobId: z.string(),
  matchScore: z.number().min(0).max(100),
  category: z.enum(["EXCELLENT_MATCH", "GOOD_MATCH", "STRETCH_OPPORTUNITY", "LOW_MATCH"]),
  recommendation: z.enum(["APPLY_NOW", "PREPARE_THEN_APPLY", "CONSIDER", "SKIP"]),
  roleRelevance: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingMandatorySkills: z.array(z.string()),
  missingPreferredSkills: z.array(z.string()),
  experienceMatch: z.object({
    required: z.string().optional(),
    candidate: z.number(),
    match: z.boolean(),
    note: z.string(),
  }),
  locationMatch: z.object({ match: z.boolean(), note: z.string() }),
  roleMatch: z.object({ match: z.boolean(), note: z.string() }),
  industryMatch: z.object({ match: z.boolean(), note: z.string() }),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  reasoningSummary: z.string(),
  whyMatch: z.array(z.string()),
  whyNotMatch: z.array(z.string()),
  applyAdvice: z.string(),
});

export const SkillGapSchema = z.object({
  skill: z.string(),
  candidateLevel: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  requiredLevel: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]),
  marketDemand: z.number().min(0).max(100),
  recommendedTopics: z.array(z.string()),
  learningResources: z.array(
    z.object({
      title: z.string(),
      url: z.string().optional(),
      type: z.string(),
    })
  ),
  explanation: z.string(),
});

export const ResumeOptimizationSchema = z.object({
  jobId: z.string(),
  atsScoreBefore: z.number().min(0).max(100),
  atsScoreAfter: z.number().min(0).max(100),
  keywordsAdded: z.array(z.string()),
  suggestedChanges: z.array(
    z.object({
      id: z.string(),
      section: z.string(),
      original: z.string(),
      suggested: z.string(),
      reason: z.string(),
      requiresApproval: z.boolean(),
      approved: z.boolean().optional(),
      rejected: z.boolean().optional(),
      edited: z.string().optional(),
    })
  ),
  breakdown: z.object({
    keywordAlignment: z.number(),
    experienceAlignment: z.number(),
    roleAlignment: z.number(),
    requiredSkills: z.number(),
    resumeStructure: z.number(),
  }),
});

export const LearningPlanSchema = z.object({
  targetRole: z.string(),
  durationDays: z.number(),
  weeks: z.array(
    z.object({
      week: z.number(),
      title: z.string(),
      skills: z.array(z.string()),
      topics: z.array(z.string()),
      practiceProject: z.string(),
      resources: z.array(
        z.object({
          title: z.string(),
          url: z.string().optional(),
          type: z.string(),
        })
      ),
    })
  ),
  summary: z.string(),
});
