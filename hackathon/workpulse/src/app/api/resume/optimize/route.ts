import { NextRequest, NextResponse } from "next/server";
import { resolveJob, registerJob } from "@/lib/jobs/job-service";
import { optimizeResume } from "@/lib/ai/optimizeResume";
import { countExpectedResumeLines, countExperienceLines } from "@/lib/resume/collectResumeLines";
import type { Job, ProfessionalProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let profile = body.profile as ProfessionalProfile;
    const jobId = body.jobId as string;
    const jobFromBody = body.job as Job | undefined;
    const rawResumeText =
      typeof body.rawResumeText === "string" ? body.rawResumeText.trim() : undefined;

    if (rawResumeText && !profile.rawResumeText?.trim()) {
      profile = { ...profile, rawResumeText };
    }

    const job = resolveJob(jobId, jobFromBody);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    registerJob(job);

    const { optimization, aiPowered } = await optimizeResume(profile, job);
    const lineCount = countExpectedResumeLines(profile);
    const experienceLineCount = countExperienceLines(profile);
    const resumeSuggestionCount = optimization.suggestedChanges.filter(
      (c) => c.section !== "Skills Gap"
    ).length;

    return NextResponse.json({
      optimization,
      aiPowered,
      lineCount,
      experienceLineCount,
      resumeSuggestionCount,
    });
  } catch (error) {
    console.error("Resume optimization error:", error);
    return NextResponse.json({ error: "Failed to optimize resume" }, { status: 500 });
  }
}
