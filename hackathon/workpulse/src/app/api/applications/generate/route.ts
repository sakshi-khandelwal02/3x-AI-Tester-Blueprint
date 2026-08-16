import { NextRequest, NextResponse } from "next/server";
import { resolveJob, registerJob } from "@/lib/jobs/job-service";
import { generateApplicationPackage } from "@/lib/ai/generateCoverLetter";
import { calculateMatch } from "@/lib/matching/engine";
import type { Job, ProfessionalProfile, ResumeOptimization } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const jobId = body.jobId as string;
    const optimization = body.optimization as ResumeOptimization;
    const jobFromBody = body.job as Job | undefined;

    const job = resolveJob(jobId, jobFromBody);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    registerJob(job);

    const match = calculateMatch(profile, job);
    const applicationPackage = await generateApplicationPackage(
      profile,
      job,
      optimization,
      match.matchScore
    );

    return NextResponse.json({ applicationPackage });
  } catch (error) {
    console.error("Application package error:", error);
    return NextResponse.json({ error: "Failed to generate application package" }, { status: 500 });
  }
}
