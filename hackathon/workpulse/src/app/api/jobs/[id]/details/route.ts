import { NextRequest, NextResponse } from "next/server";
import { resolveJob, registerJob } from "@/lib/jobs/job-service";
import { enrichAdzunaJob } from "@/lib/jobs/fetchAdzunaJobDetails";
import { extractJobSkillsForMatch } from "@/lib/ai/extractJobSkills";
import {
  calculateMatch,
  enrichJobRecord,
} from "@/lib/matching/engine";
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

    if (!profile) {
      return NextResponse.json({ error: "Profile required" }, { status: 400 });
    }

    const raw = resolveJob(id, jobFromBody);
    if (!raw) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let job = enrichJobRecord(raw);

    if (job.source === "ADZUNA") {
      const { job: enrichedJob, enriched, enrichmentNote } = await enrichAdzunaJob(job);
      job = enrichJobRecord(enrichedJob);
      registerJob(job);

      const skillAnalysis = await extractJobSkillsForMatch(profile, job);
      job = { ...job, skills: skillAnalysis.jobSkills };
      const match = calculateMatch(profile, job, targetRole);

      return NextResponse.json({
        job,
        match,
        ...skillAnalysis,
        descriptionEnriched: enriched,
        enrichmentNote,
      });
    }

    job = enrichJobRecord(job);
    registerJob(job);
    const skillAnalysis = await extractJobSkillsForMatch(profile, job);
    job = { ...job, skills: skillAnalysis.jobSkills };
    const match = calculateMatch(profile, job, targetRole);

    return NextResponse.json({
      job,
      match,
      ...skillAnalysis,
    });
  } catch (error) {
    console.error("Job details error:", error);
    return NextResponse.json({ error: "Failed to load job details" }, { status: 500 });
  }
}
