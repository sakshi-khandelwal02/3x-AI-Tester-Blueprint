import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppState,
  CareerPreferences,
  CareerRoleSuggestion,
  ProfessionalProfile,
  ResumeMetadata,
  SavedJob,
} from "@/types";
import { getDisplaySkills } from "@/lib/skills/profileSkills";
import { defaultAppState } from "@/lib/app-state-default";

function profileFromRow(row: {
  profile_data: unknown;
  email: string | null;
  first_name: string | null;
  confirmed: boolean;
  updated_at: string;
}): ProfessionalProfile | undefined {
  const data = row.profile_data as Partial<ProfessionalProfile> | null;
  if (!data || !data.name) return undefined;
  return {
    ...(data as ProfessionalProfile),
    email: data.email ?? row.email ?? undefined,
    confirmed: row.confirmed,
    updatedAt: row.updated_at,
  };
}

function resumeMetadataFromRow(row: {
  filename: string;
  file_type: string | null;
  uploaded_at: string;
}): ResumeMetadata {
  return {
    fileName: row.filename,
    uploadedAt: row.uploaded_at,
    fileType: row.file_type ?? undefined,
  };
}

export async function loadAppStateFromDb(
  supabase: SupabaseClient,
  userId: string
): Promise<AppState> {
  const state: AppState = { ...defaultAppState };

  const [{ data: profileRow }, { data: activeResume }, { data: prefsRow }, { data: savedRows }, { data: cacheRow }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("saved_jobs").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("job_search_cache").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  if (profileRow) {
    state.profile = profileFromRow(profileRow);
    if (state.profile && activeResume?.raw_text) {
      state.profile = { ...state.profile, rawResumeText: activeResume.raw_text };
    }
  } else if (activeResume?.parsed_data) {
    const parsed = activeResume.parsed_data as ProfessionalProfile;
    state.profile = {
      ...parsed,
      rawResumeText: activeResume.raw_text ?? parsed.rawResumeText,
    };
  }

  if (activeResume) {
    state.resume = resumeMetadataFromRow(activeResume);
  }

  if (prefsRow) {
    state.preferences = prefsRow.preferences as CareerPreferences;
    state.roleSuggestions = (prefsRow.role_suggestions as CareerRoleSuggestion[]) ?? [];
  }

  if (savedRows?.length) {
    state.savedJobs = savedRows.map(
      (row): SavedJob => ({
        jobId: row.job_id,
        status: row.status as SavedJob["status"],
        savedAt: row.saved_at,
        updatedAt: row.updated_at,
        matchScore: row.match_score ?? undefined,
        applicationPackage: row.application_package ?? undefined,
        resumeOptimization: row.resume_optimization ?? undefined,
      })
    );
  }

  if (cacheRow) {
    state.jobs = (cacheRow.jobs as AppState["jobs"]) ?? [];
    state.matches = (cacheRow.matches as AppState["matches"]) ?? {};
    state.marketAnalysis = cacheRow.market_analysis ?? undefined;
    state.learningPlan = cacheRow.learning_plan ?? undefined;
    state.lastJobSearch = cacheRow.last_job_search ?? undefined;
    state.lastSearchFreshness = cacheRow.last_search_freshness ?? undefined;
    state.lastSearchRemoteType = cacheRow.last_search_remote_type ?? undefined;
  }

  return state;
}

export async function saveAppStateToDb(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  firstName: string | undefined,
  appState: AppState
): Promise<void> {
  const profile = appState.profile;
  const rawText = profile?.rawResumeText;

  if (profile) {
    const { rawResumeText: _omit, ...profileWithoutRaw } = profile;
    const normalizedSkills = getDisplaySkills(profile);

    await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email: profile.email ?? email,
        first_name: firstName ?? null,
        profile_data: profileWithoutRaw,
        normalized_skills: normalizedSkills,
        confirmed: profile.confirmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (rawText?.trim()) {
      const { data: activeResume } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (activeResume?.id) {
        await supabase
          .from("resumes")
          .update({ raw_text: rawText, parsed_data: profileWithoutRaw })
          .eq("id", activeResume.id)
          .eq("user_id", userId);
      }
    }
  }

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      preferences: appState.preferences ?? {},
      role_suggestions: appState.roleSuggestions ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (appState.savedJobs.length > 0) {
    const rows = appState.savedJobs.map((saved) => {
      const jobSnapshot =
        appState.jobs.find((j) => j.id === saved.jobId) ?? {
          id: saved.jobId,
          title: "Unknown",
          company: "Unknown",
          location: "",
          remoteType: "UNKNOWN" as const,
          description: "",
          postedAt: saved.savedAt,
          source: "CUSTOM" as const,
          sourceUrl: "",
          applicationUrl: "",
          employmentType: "UNKNOWN" as const,
          skills: [],
        };
      return {
        user_id: userId,
        job_id: saved.jobId,
        job_snapshot: jobSnapshot,
        status: saved.status,
        match_score: saved.matchScore ?? null,
        match_category: appState.matches[saved.jobId]?.category ?? null,
        application_package: saved.applicationPackage ?? null,
        resume_optimization: saved.resumeOptimization ?? null,
        saved_at: saved.savedAt,
        updated_at: saved.updatedAt,
      };
    });

    await supabase.from("saved_jobs").upsert(rows, { onConflict: "user_id,job_id" });
  }

  await supabase.from("job_search_cache").upsert(
    {
      user_id: userId,
      jobs: appState.jobs,
      matches: appState.matches,
      market_analysis: appState.marketAnalysis ?? null,
      learning_plan: appState.learningPlan ?? null,
      last_job_search: appState.lastJobSearch ?? null,
      last_search_freshness: appState.lastSearchFreshness ?? null,
      last_search_remote_type: appState.lastSearchRemoteType ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function clearUserDataInDb(supabase: SupabaseClient, userId: string): Promise<void> {
  await Promise.all([
    supabase.from("saved_jobs").delete().eq("user_id", userId),
    supabase.from("job_search_cache").delete().eq("user_id", userId),
    supabase.from("user_preferences").delete().eq("user_id", userId),
    supabase.from("resumes").delete().eq("user_id", userId),
    supabase.from("profiles").delete().eq("user_id", userId),
  ]);
}

export async function saveResumeUploadToDb(
  supabase: SupabaseClient,
  userId: string,
  params: {
    filename: string;
    storagePath: string;
    fileType?: string;
    rawText: string;
    parsedProfile: ProfessionalProfile;
    email: string;
    firstName?: string;
  }
): Promise<{ resumeId: string; version: number }> {
  const { data: latest } = await supabase
    .from("resumes")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  await supabase.from("resumes").update({ is_active: false }).eq("user_id", userId);

  const { rawResumeText: _omit, ...profileWithoutRaw } = params.parsedProfile;
  const normalizedSkills = getDisplaySkills(params.parsedProfile);

  const { data: inserted, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      filename: params.filename,
      storage_path: params.storagePath,
      file_type: params.fileType ?? null,
      parsed_data: profileWithoutRaw,
      raw_text: params.rawText,
      version: nextVersion,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to save resume record");
  }

  await supabase.from("profiles").upsert(
    {
      user_id: userId,
      email: params.parsedProfile.email ?? params.email,
      first_name: params.firstName ?? null,
      profile_data: { ...profileWithoutRaw, confirmed: false },
      normalized_skills: normalizedSkills,
      confirmed: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase.from("job_search_cache").upsert(
    {
      user_id: userId,
      jobs: [],
      matches: {},
      market_analysis: null,
      learning_plan: null,
      last_job_search: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase.from("saved_jobs").delete().eq("user_id", userId);

  return { resumeId: inserted.id, version: nextVersion };
}
