import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/auth/api-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAppStateFromDb, saveAppStateToDb, clearUserDataInDb } from "@/lib/db/app-state";
import type { AppState } from "@/types";
import { repairStoredProfile, repairTargetRolePreference } from "@/lib/resume/parseResumeHeader";

function repairAppState(state: AppState): AppState {
  const next = { ...state };
  if (next.profile?.rawResumeText) {
    next.profile = repairStoredProfile(next.profile);
  }
  if (next.profile && next.preferences) {
    const fixedTarget = repairTargetRolePreference(next.preferences.targetRole, next.profile);
    const fixedDesired = repairTargetRolePreference(next.preferences.desiredJobTitle, next.profile);
    if (fixedTarget || fixedDesired) {
      next.preferences = {
        ...next.preferences,
        ...(fixedTarget ? { targetRole: fixedTarget } : {}),
        ...(fixedDesired ? { desiredJobTitle: fixedDesired } : {}),
      };
    }
  }
  return next;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, state: null });
  }

  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  try {
    const supabase = await createSupabaseServerClient();
    const state = repairAppState(await loadAppStateFromDb(supabase, auth.userId));
    return NextResponse.json({ persisted: true, state });
  } catch (error) {
    console.error("Load state failed:", error);
    return NextResponse.json({ error: "Could not load saved data." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, ok: true });
  }

  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    const state = body.state as AppState;
    if (!state || typeof state !== "object") {
      return NextResponse.json({ error: "Invalid state payload" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const firstName = (auth.user.user_metadata?.first_name as string | undefined) ?? undefined;
    await saveAppStateToDb(supabase, auth.userId, auth.email, firstName, state);
    return NextResponse.json({ persisted: true, ok: true });
  } catch (error) {
    console.error("Save state failed:", error);
    return NextResponse.json({ error: "Could not save data." }, { status: 503 });
  }
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, ok: true });
  }

  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  try {
    const supabase = await createSupabaseServerClient();
    await clearUserDataInDb(supabase, auth.userId);
    return NextResponse.json({ persisted: true, ok: true });
  } catch (error) {
    console.error("Clear state failed:", error);
    return NextResponse.json({ error: "Could not clear saved data." }, { status: 503 });
  }
}
