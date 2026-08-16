import { NextRequest, NextResponse } from "next/server";
import { createLearningPlan } from "@/lib/ai/createLearningPlan";
import type { MarketSkillStat, ProfessionalProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const targetRole = body.targetRole as string;
    const gaps = body.gaps as string[];
    const marketSkills = body.marketSkills as MarketSkillStat[];

    const { plan, aiPowered } = await createLearningPlan(profile, targetRole, gaps, marketSkills);
    return NextResponse.json({ plan, aiPowered });
  } catch (error) {
    console.error("Learning plan error:", error);
    return NextResponse.json({ error: "Failed to create learning plan" }, { status: 500 });
  }
}
