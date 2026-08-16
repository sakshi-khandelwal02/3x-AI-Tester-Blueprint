"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClickableStatCard } from "@/components/dashboard/clickable-stat-card";
import { formatFreshness } from "@/lib/utils";
import { computeMatchStats, jobsUrl, marketOpportunityUrl, getRecentCutoffMs, getRecentTileLabel, getFreshnessLabel, MATCH_SCORE_BANDS } from "@/lib/matching/categories";
import { applyJobDisplayFilters } from "@/lib/jobs/locationFilter";
import { buildResumeViewText } from "@/lib/resume/buildResumeViewText";
import { loadResumeText } from "@/lib/storage";
import { ResumePreviewDialog } from "@/components/dashboard/resume-preview-dialog";
import { computeRoleSkillDemand } from "@/lib/market/roleSkillDemand";
import { getUserFirstName, getGreeting } from "@/lib/user/displayName";
import { getSearchableTargetRole } from "@/lib/resume/parseResumeHeader";
import { RoleSkillDemandChart } from "@/components/skills/role-skill-demand-chart";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowRight,
  Zap,
  TrendingUp,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { state, removeResume, setProfile } = useApp();
  const { user } = useAuth();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);

  const handleRemoveResume = () => {
    removeResume();
    setShowRemoveConfirm(false);
    router.push("/profile");
  };

  useEffect(() => {
    if (!user || !state.profile || state.profile.rawResumeText?.trim()) return;
    const stored = loadResumeText(user.userId);
    if (stored?.trim()) {
      setProfile({ ...state.profile, rawResumeText: stored });
    }
  }, [user, state.profile, setProfile]);

  const activeFreshness = state.lastSearchFreshness ?? "7d";
  const activeRemoteType = state.lastSearchRemoteType ?? state.preferences?.remotePreference ?? "ANY";
  const recentCutoffMs = getRecentCutoffMs(activeFreshness);

  const visibleJobs = useMemo(
    () =>
      applyJobDisplayFilters(state.jobs, {
        freshness: activeFreshness,
        remoteType: activeRemoteType,
      }),
    [state.jobs, activeFreshness, activeRemoteType]
  );

  const visibleMatches = useMemo(() => {
    const ids = new Set(visibleJobs.map((j) => j.id));
    return Object.fromEntries(
      Object.entries(state.matches).filter(([id]) => ids.has(id))
    );
  }, [visibleJobs, state.matches]);

  const stats = useMemo(
    () => computeMatchStats(visibleJobs, visibleMatches, recentCutoffMs),
    [visibleJobs, visibleMatches, recentCutoffMs]
  );

  const resumePreviewText = state.profile ? buildResumeViewText(state.profile) : "";
  const canPreviewResume = Boolean(state.resume || state.profile);

  const topMatches = useMemo(() => {
    return visibleJobs
      .map((j) => ({ job: j, match: state.matches[j.id] }))
      .filter((x) => x.match)
      .sort((a, b) => (b.match?.matchScore || 0) - (a.match?.matchScore || 0))
      .slice(0, 5);
  }, [visibleJobs, state.matches]);

  const opportunity = state.marketAnalysis?.strongestOpportunity;
  const prioritizedGaps = state.marketAnalysis?.prioritizedGaps?.slice(0, 3) ?? [];
  const targetRole = getSearchableTargetRole(
    state.profile?.currentRole,
    state.preferences?.targetRole,
    state.profile?.rawResumeText
  );

  const roleSkillDemand = useMemo(() => {
    if (state.marketAnalysis?.roleSkillDemand) return state.marketAnalysis.roleSkillDemand;
    if (visibleJobs.length && state.profile) {
      return computeRoleSkillDemand(visibleJobs, targetRole, 48);
    }
    return null;
  }, [state.marketAnalysis?.roleSkillDemand, visibleJobs, state.profile, targetRole]);

  const firstName = getUserFirstName(state.profile, user?.firstName);

  if (!state.profile?.confirmed) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg text-center">
          <CardContent className="p-10">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--accent)]" />
            <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">Complete Your Profile First</h2>
            <p className="mb-6 text-[var(--text-muted)]">
              Upload your resume to receive personalized job matches and skill-gap analysis.
            </p>
            <Link href="/profile">
              <Button>Upload Resume</Button>
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {getGreeting()} 👋 {firstName}
        </h1>
        {stats.worthReview > 0 ? (
          <p className="mt-2 text-[var(--text-muted)]">
            Your WorkPulse found{" "}
            <Link
              href={jobsUrl("worth-review")}
              className="font-medium text-[var(--accent-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              {stats.worthReview} opportunities
            </Link>{" "}
            worth reviewing.
          </p>
        ) : (
          <p className="mt-2 text-[var(--text-muted)]">
            Search for jobs to discover your personalized opportunities.
          </p>
        )}
      </div>

      {/* Latest Resume */}
      <Card className="mb-6 border-[var(--border)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
            Latest Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.resume || state.profile ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {state.resume?.fileName || "Uploaded resume"}
                  </div>
                  {state.resume?.uploadedAt && (
                    <div className="text-sm text-[var(--text-muted)]">
                      Uploaded: {format(new Date(state.resume.uploadedAt), "MMM d, yyyy")}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">
                    Used for job matching, skill gaps, and career recommendations
                  </p>
                </div>
                <div className="flex gap-2">
                  {canPreviewResume && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowResumePreview(true)}
                    >
                      View Resume
                    </Button>
                  )}
                  <Link href="/profile?step=upload">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Upload className="h-3 w-3" /> Replace
                    </Button>
                  </Link>
                  <Button variant="danger" size="sm" className="gap-1" onClick={() => setShowRemoveConfirm(true)}>
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[var(--text-muted)]">No resume file on record. Upload one to sync analysis.</p>
              <Link href="/profile?step=upload"><Button size="sm">Upload Resume</Button></Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 border-[var(--accent)]/20 bg-[var(--accent-bg)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            YOUR CAREER RADAR
          </CardTitle>
          {stats.total > 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              Based on {stats.total} jobs from your last search ({getFreshnessLabel(activeFreshness)} · resume vs job match score).
              Categories: 🔥 {MATCH_SCORE_BANDS.excellent}, 🟢 {MATCH_SCORE_BANDS.good}, 🟡 {MATCH_SCORE_BANDS.stretch}.
              {stats.low > 0 && ` ${stats.low} low match (${MATCH_SCORE_BANDS.low}).`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <ClickableStatCard
              href={jobsUrl("excellent")}
              count={stats.excellent}
              label="Excellent Matches"
              emoji="🔥"
              countClassName="text-orange-400"
              ariaLabel={`View ${stats.excellent} excellent match jobs`}
            />
            <ClickableStatCard
              href={jobsUrl("good")}
              count={stats.good}
              label="Good Matches"
              emoji="🟢"
              countClassName="text-emerald-400"
              ariaLabel={`View ${stats.good} good match jobs`}
            />
            <ClickableStatCard
              href={jobsUrl("stretch")}
              count={stats.stretch}
              label="Stretch Opportunities"
              emoji="🟡"
              countClassName="text-amber-400"
              ariaLabel={`View ${stats.stretch} stretch opportunity jobs`}
            />
            <ClickableStatCard
              href={jobsUrl("recent")}
              count={stats.recent}
              label={getRecentTileLabel(activeFreshness)}
              emoji="⚡"
              countClassName="text-[var(--accent-text)]"
              ariaLabel={`View ${stats.recent} recently posted jobs`}
            />
          </div>

          {state.jobs.length === 0 && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4 text-center text-sm text-[var(--text-muted)]">
              No job data yet.{" "}
              <Link href="/jobs" className="text-[var(--accent-text)] hover:underline">Search jobs</Link> to populate your radar.
            </div>
          )}

          {visibleJobs.length === 0 && state.jobs.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center text-sm text-amber-700 dark:text-amber-400">
              No jobs match your last freshness filter on the dashboard.{" "}
              <Link href="/jobs" className="font-medium underline">Adjust freshness on Jobs</Link> and search again.
            </div>
          )}

          {opportunity && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Link
                href={marketOpportunityUrl(opportunity.cluster)}
                className="rounded-lg border border-[var(--border)] p-4 transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group"
              >
                <div className="text-xs text-[var(--text-subtle)] uppercase">Strongest Market Opportunity</div>
                <div className="mt-1 font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)]">
                  {opportunity.cluster}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {opportunity.strongestSkills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="success" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <div className="mt-2 text-xs text-[var(--accent-text)]">
                  {opportunity.matchingOpportunities} matching opportunities →
                </div>
              </Link>
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="text-xs text-[var(--text-subtle)] uppercase">Biggest Skill Gap</div>
                <div className="mt-1 font-semibold text-amber-500 dark:text-amber-400">
                  {prioritizedGaps[0]?.skill || state.marketAnalysis?.readiness.topGaps[0] || "—"}
                </div>
                {prioritizedGaps[0] && (
                  <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">{prioritizedGaps[0].whyItMatters}</p>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="text-xs text-[var(--text-subtle)] uppercase">Highest-Impact Skill to Develop</div>
                <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  {opportunity.highValueSkillToDevelop}
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">{opportunity.why}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {roleSkillDemand && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
              Role Skill Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoleSkillDemandChart data={roleSkillDemand} />
            <Link href="/skills" className="mt-4 inline-block text-sm text-[var(--accent-text)] hover:underline">
              Full market intelligence →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Best Matches</CardTitle>
            <Link href={jobsUrl("worth-review")}>
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMatches.length === 0 ? (
              <p className="text-sm text-[var(--text-subtle)]">Search for jobs to see matches.</p>
            ) : (
              topMatches.map(({ job, match }) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 transition hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)]">
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{job.title}</div>
                      <div className="text-sm text-[var(--text-muted)]">{job.company}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">{match?.matchScore}%</Badge>
                      <div className="mt-1 text-xs text-[var(--text-subtle)]">{formatFreshness(job.postedAt)}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              Priority Skill Gaps
            </CardTitle>
            <Link href="/skills">
              <Button variant="ghost" size="sm">Details</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {prioritizedGaps.length > 0 ? (
              prioritizedGaps.map((gap) => (
                <div key={gap.skill} className="mb-4 rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)]">{gap.skill}</span>
                    <Badge variant={gap.importance === "HIGH" ? "warning" : "default"}>
                      {gap.gapType === "adjacent" ? "Adjacent" : "Gap"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{gap.whyItMatters}</p>
                  {gap.relatedSkills.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      Related: {gap.relatedSkills.join(", ")}
                    </p>
                  )}
                </div>
              ))
            ) : state.marketAnalysis ? (
              <p className="text-sm text-[var(--text-subtle)]">
                No high-confidence skill gaps identified from your current opportunities.
              </p>
            ) : (
              <p className="text-sm text-[var(--text-subtle)]">Run job search to see market analysis.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Do you want to remove the resume?"
        confirmLabel="Yes"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRemoveResume}
        onCancel={() => setShowRemoveConfirm(false)}
      />
      {(state.resume || state.profile) && (
        <ResumePreviewDialog
          open={showResumePreview}
          fileName={state.resume?.fileName || "resume.txt"}
          content={resumePreviewText}
          onClose={() => setShowResumePreview(false)}
        />
      )}
    </AppShell>
  );
}
