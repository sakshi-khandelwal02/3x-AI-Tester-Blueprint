import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, user: null });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ configured: true, user: null });
    }

    return NextResponse.json({
      configured: true,
      user: {
        userId: user.id,
        email: user.email,
        firstName: (user.user_metadata?.first_name as string | undefined) ?? undefined,
        signedInAt: user.last_sign_in_at ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Session check failed:", error);
    return NextResponse.json({ configured: true, user: null, error: "Session unavailable" });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Using local demo mode." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const firstName = body.firstName ? String(body.firstName).trim() : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const signInAttempt = await supabase.auth.signInWithPassword({ email, password });
    if (signInAttempt.data.user) {
      return NextResponse.json({
        user: {
          userId: signInAttempt.data.user.id,
          email: signInAttempt.data.user.email,
          firstName,
          signedInAt: new Date().toISOString(),
        },
      });
    }

    const signUpAttempt = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
      },
    });

    if (signUpAttempt.error) {
      return NextResponse.json({ error: signUpAttempt.error.message }, { status: 401 });
    }

    if (!signUpAttempt.data.user) {
      return NextResponse.json({ error: "Could not create account." }, { status: 500 });
    }

    if (!signUpAttempt.data.session) {
      return NextResponse.json(
        {
          error:
            "Account created. Confirm your email in Supabase or disable email confirmation for demo deployments.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        userId: signUpAttempt.data.user.id,
        email: signUpAttempt.data.user.email,
        firstName,
        signedInAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Sign-in failed:", error);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
