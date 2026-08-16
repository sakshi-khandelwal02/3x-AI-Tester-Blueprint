import { NextRequest, NextResponse } from "next/server";
import { resolveJob } from "@/lib/jobs/job-service";
import { analyzeSkillGapsForJob } from "@/lib/ai/analyzeSkillGap";
import type { Job, MatchResult, ProfessionalProfile } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const marketDemand = body.marketDemand as Record<string, number> | undefined;
    const jobs = (body.jobs as Job[]) || [];
    const matches = (body.matches as Record<string, MatchResult>) || {};
    const jobFromBody = body.job as Job | undefined;

    const job = resolveJob(id, jobFromBody) || jobs.find((j) => j.id === id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const allJobs = jobs.length ? jobs : [job];
    const gaps = analyzeSkillGapsForJob(profile, job, allJobs, matches, marketDemand);
    return NextResponse.json({ gaps });
  } catch (error) {
    console.error("Skill gap error:", error);
    return NextResponse.json({ error: "Failed to analyze skill gaps" }, { status: 500 });
  }
}
