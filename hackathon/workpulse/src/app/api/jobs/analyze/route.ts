import { NextRequest, NextResponse } from "next/server";
import { parseJobDescription } from "@/lib/jobs/parseJobDescription";
import { registerJob } from "@/lib/jobs/job-service";
import { calculateMatch } from "@/lib/matching/engine";
import { analyzeSkillGapsForJob } from "@/lib/ai/analyzeSkillGap";
import { optimizeResume } from "@/lib/ai/optimizeResume";
import type { Job, MatchResult, ProfessionalProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const description = (body.description as string | undefined)?.trim();
    const title = body.title as string | undefined;
    const company = body.company as string | undefined;
    const location = body.location as string | undefined;
    const targetRole =
      (body.targetRole as string | undefined) ||
      profile?.currentRole;
    const existingJobs = (body.jobs as Job[]) || [];
    const existingMatches = (body.matches as Record<string, MatchResult>) || {};

    if (!profile) {
      return NextResponse.json({ error: "Profile is required" }, { status: 400 });
    }
    if (!description || description.length < 50) {
      return NextResponse.json(
        { error: "Paste the full job description (at least 50 characters)" },
        { status: 400 }
      );
    }

    const job = parseJobDescription({ description, title, company, location });
    registerJob(job);

    const match = calculateMatch(profile, job, targetRole);
    const allJobs = [...existingJobs.filter((j) => j.id !== job.id), job];
    const allMatches = { ...existingMatches, [job.id]: match };

    const gaps = analyzeSkillGapsForJob(profile, job, allJobs, allMatches);
    const { optimization, aiPowered } = await optimizeResume(profile, job);

    return NextResponse.json({
      job,
      match,
      gaps,
      optimization,
      aiPowered,
    });
  } catch (error) {
    console.error("Job analyze error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
