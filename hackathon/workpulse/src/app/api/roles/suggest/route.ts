import { NextRequest, NextResponse } from "next/server";
import { suggestRoles, TRACK_LABELS } from "@/lib/ai/suggestRoles";
import type { ProfessionalProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { profile } = (await request.json()) as { profile: ProfessionalProfile };
    if (!profile) {
      return NextResponse.json({ error: "Profile required" }, { status: 400 });
    }
    const { suggestions, aiPowered, detectedTrack, experienceTier, experienceLabel } = await suggestRoles(profile);
    return NextResponse.json({
      suggestions,
      aiPowered,
      detectedTrack,
      trackLabel: TRACK_LABELS[detectedTrack],
      experienceTier,
      experienceLabel,
    });
  } catch (error) {
    console.error("Role suggestion error:", error);
    return NextResponse.json({ error: "Failed to suggest roles" }, { status: 500 });
  }
}
