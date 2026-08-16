"use client";

import Link from "next/link";
import { Radar, ArrowRight, Sparkles, Target, TrendingUp, FileCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom right, var(--bg-page-gradient-from), var(--bg-page-gradient-via), var(--bg-page-gradient-to))`,
      }}
    >
      <header className="border-b border-[var(--border)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
              <Radar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">WorkPulse</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/signin">
              <Button variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </Link>
            <Link href="/signin">
              <Button className="gap-2">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-bg)] px-4 py-1.5 text-sm text-[var(--accent-text)]">
            <Sparkles className="h-4 w-4" />
            AI-Powered Career Intelligence
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-[var(--text-primary)] md:text-6xl">
            Don&apos;t just find jobs.
            <br />
            <span className="text-[var(--accent)]">
              Know which ones are worth applying to.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-[var(--text-muted)]">
            Search less. Understand more. Apply smarter. WorkPulse analyzes your profile,
            matches you to opportunities, identifies skill gaps, and prepares application-ready packages.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signin">
              <Button size="lg" className="gap-2">
                Sign in & Upload Resume <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Smart Matching",
              desc: "AI calculates match scores with evidence — skills, experience, role, and location alignment.",
            },
            {
              icon: TrendingUp,
              title: "Market Intelligence",
              desc: "Real skill demand calculated from retrieved jobs. No fabricated statistics.",
            },
            {
              icon: FileCheck,
              title: "Application Ready",
              desc: "ATS-optimized resumes with human approval. Never fabricates experience.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
                  <Icon className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
