import { NextRequest, NextResponse } from "next/server";
import { searchJobs } from "@/lib/jobs/job-service";
import { calculateMatch } from "@/lib/matching/engine";
import { rankJobsWithInteractions } from "@/lib/matching/personalization";
import { resolveAdzunaSearch, formatSearchCriteriaSummary } from "@/lib/jobs/locationFilter";
import { getSearchableTargetRole } from "@/lib/resume/parseResumeHeader";
import type { CareerPreferences, FreshnessFilter, InteractionSignals, ProfessionalProfile, SavedJob } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile as ProfessionalProfile;
    const preferences = body.preferences as CareerPreferences | undefined;
    const freshness = body.freshness as FreshnessFilter | undefined;
    const anyLocation = body.anyLocation === true || body.location === "";
    const locationFromBody =
      typeof body.location === "string" ? body.location.trim() : undefined;
    const locationInput = anyLocation
      ? ""
      : locationFromBody ||
        preferences?.preferredLocations?.[0]?.trim() ||
        "";
    const remoteType =
      (body.remoteType as CareerPreferences["remotePreference"] | undefined) ||
      (preferences?.remotePreference === "ANY" ? undefined : preferences?.remotePreference);

    const interactions = body.interactions as InteractionSignals | undefined;
    const savedJobs = (body.savedJobs as SavedJob[]) || [];

    const targetRole = getSearchableTargetRole(
      profile?.currentRole,
      preferences?.targetRole || preferences?.desiredJobTitle,
      profile?.rawResumeText
    );
    const { country, where } = resolveAdzunaSearch(locationInput);

    const result = await searchJobs({
      targetRole,
      location: locationInput.trim() ? where : undefined,
      country: country || undefined,
      remoteType,
      freshness,
      excludeCompanies: preferences?.companiesToExclude,
    });

    const matches: Record<string, ReturnType<typeof calculateMatch>> = {};
    if (profile) {
      for (const job of result.jobs) {
        matches[job.id] = calculateMatch(profile, job, targetRole);
      }
    }

    const sortedJobs = rankJobsWithInteractions(result.jobs, matches, interactions, savedJobs);

    const criteriaSummary = formatSearchCriteriaSummary({
      targetRole,
      location: locationInput.trim() || undefined,
      remoteType: remoteType || "ANY",
      freshness,
    });

    return NextResponse.json({
      jobs: sortedJobs,
      matches,
      source: result.source,
      demoMode: result.demoMode,
      total: sortedJobs.length,
      message:
        sortedJobs.length === 0
          ? result.message ||
            `Zero jobs found based on the criteria you selected (${criteriaSummary}).`
          : undefined,
      criteriaSummary,
      country,
    });
  } catch (error) {
    console.error("Job search error:", error);
    return NextResponse.json({ error: "Failed to search jobs" }, { status: 500 });
  }
}
