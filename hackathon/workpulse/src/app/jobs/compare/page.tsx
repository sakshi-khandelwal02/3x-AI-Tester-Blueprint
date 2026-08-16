"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { matchCategoryEmoji, matchCategoryLabel } from "@/lib/utils";
import type { Job, MatchResult, ResumeOptimization, SkillGap } from "@/types";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  ClipboardPaste,
  Sparkles,
} from "lucide-react";

export default function CompareJobPage() {
  const { state, mergeAnalyzedJob } = useApp();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    job: Job;
    match: MatchResult;
    gaps: SkillGap[];
    optimization: ResumeOptimization;
    aiPowered: boolean;
  } | null>(null);

  const analyze = async () => {
    if (!state.profile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: state.profile,
          description,
          title: title || undefined,
          company: company || undefined,
          location: location || undefined,
          targetRole: state.preferences?.targetRole || state.profile.currentRole,
          jobs: state.jobs,
          matches: state.matches,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }
      setResult(data);
      mergeAnalyzedJob(data.job, data.match);
    } catch {
      setError("Unable to analyze this job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Compare External Job</h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Paste a job description from LinkedIn, company career pages, or any other portal.
          WorkPulse will match it against your resume — same analysis as jobs found here.
        </p>
      </div>

      {!state.profile ? (
        <Card>
          <CardContent className="p-10 text-center text-[var(--text-muted)]">
            Complete your profile first to compare jobs against your resume.
            <Link href="/profile">
              <Button className="mt-4">Go to Profile</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-[var(--accent)]" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="job-title">Job title (optional)</Label>
                <Input
                  id="job-title"
                  placeholder="e.g. Senior QA Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="job-company">Company (optional)</Label>
                  <Input
                    id="job-company"
                    placeholder="e.g. Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="job-location">Location (optional)</Label>
                  <Input
                    id="job-location"
                    placeholder="e.g. Bangalore / Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="job-description">Job description *</Label>
                <textarea
                  id="job-description"
                  rows={14}
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Paste the full job description here — responsibilities, requirements, skills, experience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {description.trim().length > 0 && description.trim().length < 50 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Add at least {50 - description.trim().length} more characters for a meaningful analysis.
                </p>
              )}
              <Button
                onClick={analyze}
                disabled={loading || description.trim().length < 50}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze Against My Resume
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!result ? (
              <Card>
                <CardContent className="p-10 text-center text-[var(--text-muted)]">
                  Paste a job description and click Analyze to see match score, skill gaps,
                  and resume optimization suggestions.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                        {result.job.title}
                      </h2>
                      <p className="text-[var(--text-muted)]">
                        {result.job.company} · {result.job.location}
                      </p>
                      <Badge variant="default" className="mt-2">
                        External · Pasted
                      </Badge>
                    </div>
                    <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-bg)] p-5 text-center">
                      <div className="text-4xl font-bold text-[var(--accent-text)]">
                        {result.match.matchScore}%
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">
                        {matchCategoryEmoji(result.match.category)}{" "}
                        {matchCategoryLabel(result.match.category)}
                      </div>
                      <Badge className="mt-2" variant="info">
                        {result.match.recommendation.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/jobs/${result.job.id}`}>
                    <Button variant="secondary">View Full Analysis</Button>
                  </Link>
                  <Link href={`/resume/${result.job.id}`}>
                    <Button className="gap-1">
                      <FileText className="h-4 w-4" /> Optimize Resume
                    </Button>
                  </Link>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Why You Match
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.match.matchedSkills.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-4 w-4" /> {s}
                      </div>
                    ))}
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      {result.match.reasoningSummary}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      What You Are Missing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[...result.match.missingMandatorySkills, ...result.match.missingPreferredSkills].map(
                      (s) => (
                        <div key={s} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <XCircle className="h-4 w-4" /> {s}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>

                {result.gaps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Skill Gaps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.gaps.slice(0, 3).map((gap) => (
                        <div
                          key={gap.skill}
                          className="rounded-lg border border-[var(--border)] p-3"
                        >
                          <div className="font-medium text-[var(--text-primary)]">{gap.skill}</div>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">{gap.explanation}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {result.optimization && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resume Optimization Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[var(--text-muted)]">
                        Estimated ATS score: {result.optimization.atsScoreBefore}% →{" "}
                        {result.optimization.atsScoreAfter}%
                        {result.aiPowered && (
                          <span className="ml-2 text-[var(--accent-text)]">· AI-powered</span>
                        )}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {result.optimization.suggestedChanges.length} suggested change
                        {result.optimization.suggestedChanges.length !== 1 ? "s" : ""} — open
                        Optimize Resume to review and apply.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
