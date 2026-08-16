"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { loadResumeText } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResumeChange, ResumeOptimization } from "@/types";
import { TARGET_ATS_SCORE } from "@/lib/ai/optimizeResume";
import { EXPERIENCE_LINE_LABEL } from "@/lib/resume/collectResumeLines";
import { ArrowLeft, Loader2, Copy, CopyCheck, ChevronDown } from "lucide-react";

const INITIAL_SUGGESTION_LIMIT = 5;

const SECTION_ORDER = [
  "Headline",
  "Summary",
  "Work Experience",
  "Experience",
  "Projects",
  "Achievements",
  "Skills",
  "Certifications",
  "Education",
];

function sortSuggestions(changes: ResumeChange[]): ResumeChange[] {
  return [...changes].sort((a, b) => {
    const rank = (section: string) => {
      const key = SECTION_ORDER.find((s) => section.startsWith(s)) ?? "ZZZ";
      return SECTION_ORDER.indexOf(key);
    };
    const diff = rank(a.section) - rank(b.section);
    return diff !== 0 ? diff : a.section.localeCompare(b.section);
  });
}

export default function ResumeOptimizePage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { state } = useApp();
  const { user } = useAuth();
  const [optimization, setOptimization] = useState<ResumeOptimization | null>(null);
  const [lineStats, setLineStats] = useState<{
    lineCount: number;
    experienceLineCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const job = state.jobs.find((j) => j.id === jobId);

  useEffect(() => {
    if (!state.profile) {
      setLoading(false);
      return;
    }
    if (!job) {
      setLoading(false);
      return;
    }
    let profile = state.profile;
    let rawResumeText = profile.rawResumeText?.trim();
    if (!rawResumeText && user) {
      rawResumeText = loadResumeText(user.userId)?.trim();
      if (rawResumeText) {
        profile = { ...profile, rawResumeText };
      }
    }

    fetch("/api/resume/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, jobId, job, rawResumeText }),
    })
      .then((r) => r.json())
      .then((d) => {
        setOptimization(d.optimization);
        setLineStats({
          lineCount: d.lineCount ?? 0,
          experienceLineCount: d.experienceLineCount ?? d.experienceBulletCount ?? 0,
        });
      })
      .finally(() => setLoading(false));
  }, [jobId, state.profile, job, user]);

  const resumeSuggestions = useMemo(
    () =>
      sortSuggestions(
        optimization?.suggestedChanges.filter((c) => c.section !== "Skills Gap") ?? []
      ),
    [optimization]
  );

  const visibleSuggestions = useMemo(
    () =>
      showAllSuggestions || resumeSuggestions.length <= INITIAL_SUGGESTION_LIMIT
        ? resumeSuggestions
        : resumeSuggestions.slice(0, INITIAL_SUGGESTION_LIMIT),
    [resumeSuggestions, showAllSuggestions]
  );

  const hiddenCount = Math.max(0, resumeSuggestions.length - INITIAL_SUGGESTION_LIMIT);

  const experienceSuggestions = useMemo(
    () => resumeSuggestions.filter((c) => c.section.startsWith(EXPERIENCE_LINE_LABEL)),
    [resumeSuggestions]
  );

  const summarySuggestions = useMemo(
    () => resumeSuggestions.filter((c) => c.section.startsWith("Summary") || c.section === "Headline"),
    [resumeSuggestions]
  );

  const otherSuggestions = useMemo(
    () =>
      resumeSuggestions.filter(
        (c) =>
          !c.section.startsWith("Work Experience") &&
          !c.section.startsWith("Experience") &&
          c.section !== "Headline" &&
          !c.section.startsWith("Summary")
      ),
    [resumeSuggestions]
  );

  const gapSuggestions = useMemo(
    () => optimization?.suggestedChanges.filter((c) => c.section === "Skills Gap") ?? [],
    [optimization]
  );

  const gapSkillNames = useMemo(
    () =>
      gapSuggestions.map((c) => {
        const legacy = c.original.match(/^\(No (.+) listed on resume\)$/)?.[1];
        return (legacy ?? c.suggested ?? c.original).trim();
      }),
    [gapSuggestions]
  );

  const copySuggestion = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderSuggestionCard = (change: ResumeChange, index: number) => (
    <div key={change.id} className="rounded-lg border border-[var(--border)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-bg)] text-xs font-bold text-[var(--accent-text)]">
            {index + 1}
          </span>
          <Badge variant="default">{change.section}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => copySuggestion(change.id, change.suggested)}
        >
          {copiedId === change.id ? (
            <>
              <CopyCheck className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy suggestion
            </>
          )}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-[var(--text-subtle)] mb-1">YOUR CURRENT TEXT</div>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{change.original}</p>
        </div>
        <div>
          <div className="text-xs text-[var(--accent-text)] mb-1">SUGGESTED REPLACEMENT</div>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{change.suggested}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--text-subtle)]">Why: {change.reason}</p>
    </div>
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg text-center">
          <CardContent className="p-10">
            <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">Job not found</h2>
            <p className="mb-6 text-[var(--text-muted)]">
              This job is no longer in your search results. Search again or compare an external job posting.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
              <Link href="/jobs/compare">
                <Button variant="outline">Compare External Job</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const atsBefore = optimization?.atsScoreBefore ?? 0;
  const atsAfter = optimization?.atsScoreAfter ?? TARGET_ATS_SCORE;

  return (
    <AppShell>
      <Link
        href={`/jobs/${jobId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Job
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">Resume Optimization</h1>
      <p className="mb-2 text-[var(--text-muted)]">
        For: {job.title} at {job.company}
      </p>
      <p className="mb-4 text-sm text-[var(--text-subtle)]">
        {resumeSuggestions.length > 0
          ? `${resumeSuggestions.length} suggestions covering your full resume — apply all to reach ${TARGET_ATS_SCORE}%+ ATS.`
          : "Re-upload your resume on Profile if work experience lines are missing."}
      </p>

      {lineStats && resumeSuggestions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge variant="default">{summarySuggestions.length} headline & summary</Badge>
          <Badge variant="default">{experienceSuggestions.length} work experience lines</Badge>
          {otherSuggestions.length > 0 && (
            <Badge variant="default">{otherSuggestions.length} skills & other</Badge>
          )}
          <Badge variant="info">{lineStats.lineCount} lines scanned from resume</Badge>
        </div>
      )}

      {lineStats && lineStats.experienceLineCount === 0 && (
        <Card className="mb-6 border-amber-500/30">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
            No lines were found under your experience section (e.g. PROFESSIONAL EXPERIENCE, WORK HISTORY).
            Re-upload your resume on <Link href="/profile" className="underline">Profile</Link> — we read
            whatever section heading you use.
          </CardContent>
        </Card>
      )}

      {optimization && (
        <Card className="mb-6 border-[var(--accent)]/20">
          <CardContent className="p-6">
            <div className="text-sm text-[var(--text-subtle)] mb-2">AI-estimated ATS compatibility</div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold text-[var(--text-muted)]">{atsBefore}%</div>
                <div className="text-xs text-[var(--text-subtle)]">Current resume</div>
              </div>
              <div className="text-2xl text-[var(--accent-text)]">→</div>
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{atsAfter}%</div>
                <div className="text-xs text-[var(--text-subtle)]">
                  Target {TARGET_ATS_SCORE}%+ · apply all {resumeSuggestions.length} suggestions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            Recommended Resume Changes
            {resumeSuggestions.length > 0 && (
              <span className="ml-2 text-base font-normal text-[var(--text-muted)]">
                ({resumeSuggestions.length} items)
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-[var(--text-muted)]">
            {lineStats
              ? `Scanned ${lineStats.lineCount} lines — ${experienceSuggestions.length} under your experience section, ${summarySuggestions.length} headline/summary, ${otherSuggestions.length} other.`
              : "One card per resume line."}
            {!showAllSuggestions && hiddenCount > 0 && (
              <span className="block mt-1 text-[var(--text-subtle)]">
                Showing {INITIAL_SUGGESTION_LIMIT} of {resumeSuggestions.length} — load all to see every suggestion.
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {resumeSuggestions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No suggestions were generated. Re-upload your resume on Profile and reload this page.
            </p>
          ) : (
            <>
              {visibleSuggestions.map((change, index) => renderSuggestionCard(change, index))}

              {hiddenCount > 0 && !showAllSuggestions && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowAllSuggestions(true)}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Load all {resumeSuggestions.length} suggestions
                  </Button>
                </div>
              )}

              {showAllSuggestions && resumeSuggestions.length > INITIAL_SUGGESTION_LIMIT && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllSuggestions(false)}
                  >
                    Show fewer
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {gapSkillNames.length > 0 && (
        <Card className="mb-6 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-base">
              Skill Gaps — Learn Before Adding
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                ({gapSkillNames.length})
              </span>
            </CardTitle>
            <p className="text-sm text-[var(--text-muted)]">
              Do not add these to your resume unless you have genuine experience.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gapSkillNames.map((skill) => (
                <Badge key={skill} variant="warning">
                  {skill}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--text-subtle)]">
              The skills above are mentioned in the job description but are not verified in your profile.
              Curated tutorials and docs are on the job page under{" "}
              <Link href={`/jobs/${jobId}#learning-recommendations`} className="text-[var(--accent-text)] underline">
                Learning Recommendations
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <Link href={`/jobs/${jobId}`}>
        <Button variant="outline">Back to Job Details</Button>
      </Link>
    </AppShell>
  );
}
