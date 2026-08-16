import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AuthContext {
  user: User;
  email: string;
  userId: string;
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Persistent auth is not configured on this deployment." },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user, email, userId: user.id };
}

export function isAuthContext(value: AuthContext | NextResponse): value is AuthContext {
  return "userId" in value;
}
