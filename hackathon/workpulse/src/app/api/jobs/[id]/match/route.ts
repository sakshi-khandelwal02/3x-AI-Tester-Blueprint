import { NextRequest, NextResponse } from "next/server";
import { resolveJob, registerJob } from "@/lib/jobs/job-service";
import { calculateMatch } from "@/lib/matching/engine";
import type { Job, ProfessionalProfile } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const targetRole = body.targetRole as string | undefined;
    const jobFromBody = body.job as Job | undefined;

    const job = resolveJob(id, jobFromBody);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    registerJob(job);

    const match = calculateMatch(profile, job, targetRole);
    return NextResponse.json({ job, match });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "Failed to calculate match" }, { status: 500 });
  }
}
