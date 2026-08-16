import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketSkills } from "@/lib/ai/analyzeMarketSkills";
import type { Job, MatchResult, ProfessionalProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobs = body.jobs as Job[];
    const profile = body.profile as ProfessionalProfile;
    const matches = (body.matches as Record<string, MatchResult>) || {};
    const targetRole = body.targetRole as string | undefined;

    const analysis = analyzeMarketSkills(jobs, profile, matches, targetRole);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Market analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze market skills" }, { status: 500 });
  }
}
