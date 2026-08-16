import { callAI } from "./client";
import {
  type CareerTrack,
  dedupeRoleTitles,
  extractCleanResumeTitles,
  getExperienceLabel,
  getExperienceRoles,
  getExperienceTier,
  sanitizeRoleTitle,
  tiersForExperience,
} from "./roleTitleUtils";
import type { CareerRoleSuggestion, ProfessionalProfile } from "@/types";

export type { CareerTrack } from "./roleTitleUtils";

interface RoleDefinition {
  role: string;
  keywords: string[];
  base: number;
  tracks: CareerTrack[];
}

const ROLE_CATALOG: RoleDefinition[] = [
  { role: "QA Engineer", keywords: ["selenium", "playwright", "manual testing", "test cases", "api testing", "cypress"], base: 96, tracks: ["qa"] },
  { role: "SDET", keywords: ["selenium", "playwright", "java", "python", "automation", "ci/cd"], base: 94, tracks: ["qa"] },
  { role: "Automation Test Engineer", keywords: ["selenium", "playwright", "cypress", "automation", "testng"], base: 93, tracks: ["qa"] },
  { role: "Manual QA Engineer", keywords: ["manual testing", "test cases", "regression", "functional testing", "jira"], base: 90, tracks: ["qa"] },
  { role: "Performance Test Engineer", keywords: ["jmeter", "load testing", "performance testing", "gatling"], base: 88, tracks: ["qa"] },
  { role: "API Test Engineer", keywords: ["api testing", "postman", "rest", "selenium"], base: 87, tracks: ["qa"] },
  { role: "Backend Engineer", keywords: ["java", "spring", "postgresql", "rest", "microservices"], base: 96, tracks: ["backend"] },
  { role: "Java Software Engineer", keywords: ["java", "spring boot", "microservices"], base: 94, tracks: ["backend"] },
  { role: "Frontend Engineer", keywords: ["react", "typescript", "javascript", "css", "html"], base: 96, tracks: ["frontend"] },
  { role: "UI/UX Designer", keywords: ["figma", "sketch", "wireframe", "prototype", "user research"], base: 96, tracks: ["uiux"] },
  { role: "DevOps Engineer", keywords: ["docker", "kubernetes", "terraform", "jenkins", "ci/cd"], base: 96, tracks: ["devops"] },
  { role: "Data Engineer", keywords: ["python", "spark", "etl", "sql", "airflow"], base: 96, tracks: ["data"] },
  { role: "Mobile Developer", keywords: ["ios", "android", "swift", "kotlin", "react native"], base: 94, tracks: ["mobile"] },
];

const TRACK_SIGNALS: Record<Exclude<CareerTrack, "general">, string[]> = {
  qa: ["qa", "quality assurance", "test engineer", "sdet", "software tester", "automation test", "playwright", "selenium", "cypress", "quality engineer", "quality specialist", "automation engineer"],
  backend: ["backend", "back-end", "spring boot", "microservices", "java developer", "api developer", "server-side"],
  frontend: ["frontend", "front-end", "react developer", "angular developer", "web developer"],
  uiux: ["ui/ux", "ux designer", "ui designer", "product designer", "figma", "wireframe", "user research"],
  devops: ["devops", "sre", "site reliability", "platform engineer", "kubernetes", "terraform", "cloud engineer"],
  data: ["data engineer", "data analyst", "analytics engineer", "etl", "spark"],
  mobile: ["mobile developer", "ios developer", "android developer", "react native", "flutter"],
};

export const TRACK_LABELS: Record<CareerTrack, string> = {
  qa: "Testing / QA",
  backend: "Backend Engineering",
  frontend: "Frontend Engineering",
  uiux: "UI/UX Design",
  devops: "DevOps / Platform",
  data: "Data Engineering / Analytics",
  mobile: "Mobile Development",
  general: "Software Engineering",
};

function getProfileText(profile: ProfessionalProfile): string {
  return [
    profile.currentRole,
    profile.professionalSummary,
    ...(profile.roles?.map((r) => `${r.title} ${r.responsibilities.join(" ")}`) || []),
    profile.rawResumeText?.slice(0, 4000) || "",
    ...profile.skills,
    ...profile.testingTools,
    ...profile.programmingLanguages,
    ...profile.frameworks,
    ...profile.devOpsTools,
  ]
    .join(" ")
    .toLowerCase();
}

function countTrackSignals(text: string, terms: string[]): number {
  return terms.reduce((count, term) => (text.includes(term) ? count + 1 : count), 0);
}

function detectCareerTrack(profile: ProfessionalProfile): CareerTrack {
  const text = getProfileText(profile);
  const roleLower = profile.currentRole.toLowerCase();

  const scores = (Object.entries(TRACK_SIGNALS) as [Exclude<CareerTrack, "general">, string[]][]).map(
    ([track, terms]) => {
      let score = countTrackSignals(text, terms);
      if (terms.some((t) => roleLower.includes(t))) score += 6;
      for (const r of profile.roles || []) {
        if (terms.some((t) => r.title.toLowerCase().includes(t))) score += 3;
      }
      return [track, score] as const;
    }
  );

  scores.sort((a, b) => b[1] - a[1]);
  const [topTrack, topScore] = scores[0];
  const [, secondScore] = scores[1] || ["general", 0];

  if (topScore === 0) return "general";
  if (topScore >= 2 && topScore > secondScore) return topTrack;
  if (topScore >= 4) return topTrack;
  return "general";
}

function getAllProfileSkills(profile: ProfessionalProfile): string[] {
  return [
    ...profile.skills,
    ...profile.testingTools,
    ...profile.programmingLanguages,
    ...profile.frameworks,
    ...profile.cloudTechnologies,
    ...profile.devOpsTools,
    ...profile.dataTechnologies,
  ].map((s) => s.toLowerCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scoreRoleBySkills(
  role: string,
  keywords: string[],
  allSkills: string[],
  profile: ProfessionalProfile,
  baseScore: number,
  reason: string
): CareerRoleSuggestion {
  const matches = keywords.filter((k) => allSkills.some((s) => s.includes(k)));
  const skillBoost = matches.length * 3;
  const expTier = getExperienceTier(profile.experienceYears);
  const isLeadershipRole = /manager|lead|architect|staff|principal|director|head of/i.test(role);
  const isSeniorRole = /senior|staff|principal/i.test(role);

  let tierBoost =
    (expTier === "lead" || expTier === "executive") && isLeadershipRole
      ? 8
      : expTier === "senior" && isSeniorRole
        ? 6
        : expTier === "mid" && !/senior|lead|staff|principal|manager|director|junior|associate/i.test(role)
          ? 4
          : 0;

  let compatibility = Math.min(98, baseScore + skillBoost + tierBoost);

  // Penalize senior/lead titles when experience doesn't support them
  if (profile.experienceYears < 5 && (isSeniorRole || isLeadershipRole)) {
    compatibility -= 20;
  }
  if (profile.experienceYears < 8 && isLeadershipRole) {
    compatibility -= 15;
  }

  return {
    role,
    compatibility: Math.max(55, Math.min(98, compatibility)),
    reasons: [reason, `${profile.experienceYears}+ years experience · ${getExperienceLabel(profile.experienceYears)}`],
    missingSkills: keywords
      .filter((k) => !allSkills.some((s) => s.includes(k)))
      .slice(0, 3)
      .map(capitalize),
    recommendedNextSteps: [
      "Set this as your target role in preferences",
      "Search jobs using this title to find matching openings",
    ],
  };
}

function findCatalogMatch(role: string): RoleDefinition | undefined {
  const lower = role.toLowerCase();
  return ROLE_CATALOG.find(
    (d) => d.role.toLowerCase() === lower || lower.includes(d.role.toLowerCase()) || d.role.toLowerCase().includes(lower)
  );
}

function buildExperienceAwareSuggestions(
  profile: ProfessionalProfile,
  track: CareerTrack
): CareerRoleSuggestion[] {
  const allSkills = getAllProfileSkills(profile);
  const resumeTitles = extractCleanResumeTitles(profile);
  const experienceRoles = getExperienceRoles(track, profile.experienceYears, resumeTitles[0] || profile.currentRole);
  const expLabel = getExperienceLabel(profile.experienceYears);
  const suggestions: CareerRoleSuggestion[] = [];

  // Primary role from resume (sanitized, max 1 shown prominently)
  if (resumeTitles[0]) {
    const primary = resumeTitles[0];
    const catalog = findCatalogMatch(primary);
    suggestions.push({
      role: primary,
      compatibility: 99,
      reasons: [
        `Your current role on resume: ${primary}`,
        `Skills align with ${track === "qa" ? "quality engineering" : TRACK_LABELS[track].toLowerCase()}`,
      ],
      missingSkills: [],
      recommendedNextSteps: ["Keep this as your primary target role", "Explore senior/adjacent roles below for career growth"],
    });

    if (catalog) {
      suggestions.push(
        scoreRoleBySkills(
          catalog.role,
          catalog.keywords,
          allSkills,
          profile,
          92,
          `Standard title matching your ${primary} background`
        )
      );
    }
  }

  // Experience-tier appropriate roles
  for (const role of experienceRoles) {
    if (resumeTitles.some((t) => t.toLowerCase() === role.toLowerCase())) continue;
    const catalog = findCatalogMatch(role);
    const keywords = catalog?.keywords || allSkills.slice(0, 5);
    const isGrowth =
      /manager|lead|architect|staff|principal|director|head of/i.test(role) &&
      profile.experienceYears >= 8;

    suggestions.push(
      scoreRoleBySkills(
        role,
        keywords,
        allSkills,
        profile,
        isGrowth ? 90 : 85,
        isGrowth
          ? `Growth role suited to ${profile.experienceYears}+ years experience`
          : `Recommended for ${expLabel.toLowerCase()}`
      )
    );
  }

  return suggestions;
}

function sanitizeSuggestions(
  suggestions: CareerRoleSuggestion[],
  profile: ProfessionalProfile,
  track: CareerTrack
): CareerRoleSuggestion[] {
  const cleaned: CareerRoleSuggestion[] = [];

  for (const s of suggestions) {
    const role = sanitizeRoleTitle(s.role, profile);
    if (!role) continue;
    cleaned.push({ ...s, role });
  }

  const seen = new Set<string>();
  return cleaned.filter((s) => {
    const key = s.role.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function suggestRolesFallback(profile: ProfessionalProfile): CareerRoleSuggestion[] {
  const track = detectCareerTrack(profile);
  return sanitizeSuggestions(buildExperienceAwareSuggestions(profile, track), profile, track)
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, 6);
}

export async function suggestRoles(
  profile: ProfessionalProfile
): Promise<{
  suggestions: CareerRoleSuggestion[];
  aiPowered: boolean;
  detectedTrack: CareerTrack;
  experienceTier: string;
  experienceLabel: string;
}> {
  const track = detectCareerTrack(profile);
  const tier = getExperienceTier(profile.experienceYears);
  const expLabel = getExperienceLabel(profile.experienceYears);
  const resumeTitles = extractCleanResumeTitles(profile);
  const experienceRoles = getExperienceRoles(track, profile.experienceYears, resumeTitles[0] || profile.currentRole);

  const systemPrompt = `Suggest suitable career roles based ONLY on the candidate's uploaded resume and experience level.
Return JSON: { "suggestions": [{ "role": string, "compatibility": number 0-100, "reasons": string[], "missingSkills": string[], "recommendedNextSteps": string[] }] }

CAREER AREA: ${TRACK_LABELS[track]}
EXPERIENCE: ${profile.experienceYears} years (${expLabel})
CURRENT ROLE: "${resumeTitles[0] || profile.currentRole}"
SUITABLE ROLES FOR THIS EXPERIENCE: ${experienceRoles.join(", ")}

STRICT RULES:
- NEVER include the person's name (${profile.name}) in role titles
- NEVER include section headers like "Professional Experience" in role titles
- Suggest roles appropriate for ${profile.experienceYears} years: ${tiersForExperience(profile.experienceYears).join(", ")} level
- For 8+ years: include Lead, Architect, Staff, Manager roles
- For 5-7 years: prioritize Senior roles
- For 2-4 years: mid-level Engineer/Developer roles
- For 0-2 years: Junior/Associate roles
- Only ${TRACK_LABELS[track]} domain roles
- Return clean job titles only (e.g. "Senior QA Engineer", not "JOHN DOE Senior QA Engineer")
- Suggest 4-6 roles ranked by fit`;

  const { data, aiPowered } = await callAI<{ suggestions: CareerRoleSuggestion[] }>(
    systemPrompt,
    JSON.stringify({
      name: profile.name,
      currentRole: resumeTitles[0] || profile.currentRole,
      experienceYears: profile.experienceYears,
      experienceTier: tier,
      skills: profile.skills,
      testingTools: profile.testingTools,
      suggestedRolePool: experienceRoles,
      detectedTrack: track,
    }),
    () => ({ suggestions: suggestRolesFallback(profile) })
  );

  const fallback = suggestRolesFallback(profile);
  const aiCleaned = sanitizeSuggestions(data.suggestions || [], profile, track);

  // Prefer deterministic resume-based suggestions; add validated AI extras only
  const seen = new Set<string>();
  let suggestions = [...fallback, ...aiCleaned]
    .sort((a, b) => b.compatibility - a.compatibility)
    .filter((s) => {
      const key = s.role.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);

  // Always include sanitized current role if missing
  const primary = extractCleanResumeTitles(profile)[0];
  if (primary && !suggestions.some((s) => s.role.toLowerCase() === primary.toLowerCase())) {
    suggestions = [
      {
        role: primary,
        compatibility: 99,
        reasons: [`Your current role on resume: ${primary}`, getExperienceLabel(profile.experienceYears)],
        missingSkills: [],
        recommendedNextSteps: ["Use as your primary target role", "Explore growth roles below"],
      },
      ...suggestions,
    ].slice(0, 6);
  }

  return {
    suggestions,
    aiPowered,
    detectedTrack: track,
    experienceTier: tier,
    experienceLabel: expLabel,
  };
}

export { suggestRolesFallback, detectCareerTrack, extractCleanResumeTitles as extractResumeRoleTitles };
