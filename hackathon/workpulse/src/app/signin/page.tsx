"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radar, LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SignInPage() {
  const { user, ready, signIn, persistenceEnabled } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const justSignedIn = useRef(false);
  const supabaseMode = persistenceEnabled || isSupabaseConfigured();

  useEffect(() => {
    if (ready && user && !justSignedIn.current) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      justSignedIn.current = true;
      await signIn(trimmedEmail, supabaseMode ? password : undefined, firstName.trim() || undefined);
      router.replace("/profile");
    } catch (err) {
      justSignedIn.current = false;
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background: `linear-gradient(to bottom right, var(--bg-page-gradient-from), var(--bg-page-gradient-via), var(--bg-page-gradient-to))`,
      }}
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg">
          <Radar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">WorkPulse</h1>
          <p className="text-sm text-[var(--text-muted)]">Sign in to your career workspace</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-[var(--accent)]" />
            Sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {supabaseMode && (
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={supabaseMode ? "current-password" : "off"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={supabaseMode}
                  minLength={supabaseMode ? 8 : undefined}
                />
              </div>
            )}
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                First name <span className="text-[var(--text-subtle)]">(optional)</span>
              </label>
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? "Signing in…" : "Continue"}
            </Button>
          </form>
          {supabaseMode ? (
            <p className="mt-4 text-center text-xs text-[var(--text-subtle)]">
              First-time users: an account is created automatically. For hackathon demos, use the judge demo account documented in the project README (credentials are not embedded in this app).
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-[var(--text-subtle)]">
              Local demo mode — data is stored in your browser. Configure Supabase env vars for cloud persistence on Vercel.
            </p>
          )}
          <p className="mt-3 text-center text-sm text-[var(--text-muted)]">
            <Link href="/" className="text-[var(--accent)] hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
