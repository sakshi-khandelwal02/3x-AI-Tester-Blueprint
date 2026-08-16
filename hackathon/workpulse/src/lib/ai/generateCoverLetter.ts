import { callAI } from "./client";
import type { ApplicationPackage, Job, ProfessionalProfile, ResumeOptimization } from "@/types";
import { buildTailoredResume } from "./optimizeResume";

function generateCoverLetterFallback(
  profile: ProfessionalProfile,
  job: Job,
  matchScore: number
): string {
  return `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. With ${profile.experienceYears} years of experience as a ${profile.currentRole}, I believe my background aligns well with your requirements (${matchScore}% profile match).

My experience includes ${profile.skills.slice(0, 5).join(", ")}, which directly maps to the technologies mentioned in your job description. At ${profile.roles[0]?.company || "my current role"}, I have ${profile.roles[0]?.responsibilities[0]?.toLowerCase() || "delivered impactful backend solutions"}.

I am particularly drawn to ${job.company}'s focus on ${job.title.toLowerCase()} work and would welcome the opportunity to contribute my skills while continuing to grow in areas like ${job.skills.slice(0, 2).join(" and ")}.

Thank you for considering my application. I look forward to discussing how I can contribute to your team.

Best regards,
${profile.name}`;
}

export async function generateCoverLetter(
  profile: ProfessionalProfile,
  job: Job,
  matchScore: number
): Promise<{ coverLetter: string; aiPowered: boolean }> {
  const systemPrompt = `Write a professional cover letter. Use ONLY information from the candidate profile. Never invent experience or skills. Keep it concise (3-4 paragraphs).`;

  const { data, aiPowered } = await callAI<{ coverLetter: string }>(
    systemPrompt,
    JSON.stringify({ profile, job: { title: job.title, company: job.company }, matchScore }),
    () => ({ coverLetter: generateCoverLetterFallback(profile, job, matchScore) })
  );

  return { coverLetter: data.coverLetter || generateCoverLetterFallback(profile, job, matchScore), aiPowered };
}

export async function generateApplicationPackage(
  profile: ProfessionalProfile,
  job: Job,
  optimization: ResumeOptimization,
  matchScore: number
): Promise<ApplicationPackage> {
  const editableChanges = optimization.suggestedChanges.filter(
    (c) => c.section !== "Skills Gap" && c.suggested.trim()
  );
  const tailoredResume = buildTailoredResume(profile, job, editableChanges);
  const { coverLetter } = await generateCoverLetter(profile, job, matchScore);

  return {
    jobId: job.id,
    tailoredResume,
    professionalSummary: profile.professionalSummary,
    coverLetter,
    highlightedSkills: optimization.keywordsAdded.length
      ? optimization.keywordsAdded
      : profile.skills.slice(0, 6),
    checklist: [
      "Review tailored resume for accuracy",
      "Customize cover letter if needed",
      "Verify all skills listed are truthful",
      "Open original job posting",
      "Submit application on company portal",
      "Track application status in WorkPulse",
    ],
    ready: editableChanges.length > 0,
  };
}
