"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatFreshness,
  formatRemoteType,
  matchCategoryEmoji,
  matchCategoryLabel,
} from "@/lib/utils";
import {
  cleanAdzunaDescription,
  hasAdzunaBoilerplate,
} from "@/lib/jobs/cleanAdzunaDescription";
import type { Job, MatchResult, SkillGap } from "@/types";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { getSavedJobEntry, isJobSaved } from "@/lib/jobs/saved-jobs";

interface JobDetailsResponse {
  job: Job;
  match: MatchResult;
  jobSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  profileSkills: string[];
  relevantProfileSkills?: string[];
  matchedRelevantSkills?: string[];
  extraProfileSkills?: string[];
  skillsInferred?: boolean;
  enrichmentNote?: string;
  descriptionEnriched?: boolean;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { state, updateSavedJob, upsertJobMatch, recordJobViewed } = useApp();

  const [details, setDetails] = useState<JobDetailsResponse | null>(null);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cachedJob = state.jobs.find((j) => j.id === jobId);
  const job = details?.job ?? cachedJob;
  const match = details?.match ?? state.matches[jobId];
  const isCustom = job?.source === "CUSTOM";

  const displayDescription = useMemo(() => {
    if (!job?.description) return "";
    if (job.source !== "ADZUNA") return job.description;
    const cleaned = cleanAdzunaDescription(job.description, job.title);
    return hasAdzunaBoilerplate(cleaned) ? job.description : cleaned;
  }, [job?.description, job?.source, job?.title]);

  const matchedSkills = details?.matchedSkills ?? match?.matchedSkills ?? [];
  const missingSkills = details?.missingSkills ?? [
    ...(match?.missingMandatorySkills ?? []),
    ...(match?.missingPreferredSkills ?? []),
  ].filter((s, i, arr) => arr.indexOf(s) === i);
  const jobSkills = details?.jobSkills ?? [...matchedSkills, ...missingSkills].filter(
    (s, i, arr) => arr.indexOf(s) === i
  );
  const relevantProfileSkills = details?.relevantProfileSkills ?? [];
  const resumeMatchedNotRequired = relevantProfileSkills.filter(
    (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
  );

  useEffect(() => {
    if (jobId) recordJobViewed(jobId);
  }, [jobId, recordJobViewed]);

  useEffect(() => {
    if (!state.profile) {
      setLoading(false);
      return;
    }

    const cached = state.jobs.find((j) => j.id === jobId);

    setLoading(true);
    setError(null);

    fetch(`/api/jobs/${jobId}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: state.profile,
        job: cached,
        targetRole: state.preferences?.targetRole || state.profile.currentRole,
      }),
    })
      .then((r) => r.json())
      .then((data: JobDetailsResponse & { error?: string }) => {
        if (data.error || !data.job) {
          setError(data.error || "Could not load job details");
          return;
        }
        setDetails(data);
        upsertJobMatch(data.job, data.match);
      })
      .catch(() => setError("Failed to load job details"))
      .finally(() => setLoading(false));
  }, [jobId, state.profile, state.preferences?.targetRole, upsertJobMatch]);

  useEffect(() => {
    if (!state.profile || !job) return;
    const marketDemand: Record<string, number> = {};
    state.marketAnalysis?.skills.forEach((s) => {
      marketDemand[s.skill] = s.percentage;
    });
    fetch(`/api/jobs/${jobId}/skill-gap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: state.profile,
        marketDemand,
        jobs: state.jobs,
        matches: { ...state.matches, [jobId]: match },
        job,
      }),
    })
      .then((r) => r.json())
      .then((d) => setGaps(d.gaps || []));
  }, [jobId, state.profile, job, state.marketAnalysis, state.jobs, state.matches, match]);

  if (!state.profile) {
    return (
      <AppShell>
        <Card className="p-10 text-center">
          <p className="text-[var(--text-muted)]">Complete your profile to see job match details.</p>
          <Link href="/profile"><Button className="mt-4">Go to Profile</Button></Link>
        </Card>
      </AppShell>
    );
  }

  if (loading && !job) {
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
        <Card className="p-10 text-center">
          <p className="text-[var(--text-muted)]">Job not found. Search jobs or paste a job description first.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/jobs"><Button>Go to Jobs</Button></Link>
            <Link href="/jobs/compare"><Button variant="secondary">Compare External Job</Button></Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  const savedEntry = getSavedJobEntry(state.savedJobs, jobId);
  const isSaved = isJobSaved(state.savedJobs, jobId);

  const markApplied = () => {
    if (!job) return;
    updateSavedJob({
      jobId,
      status: "APPLIED",
      savedAt: savedEntry?.savedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      matchScore: match?.matchScore ?? savedEntry?.matchScore,
      jobSnapshot: job,
      applicationPackage: savedEntry?.applicationPackage,
      resumeOptimization: savedEntry?.resumeOptimization,
    });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href={isCustom ? "/jobs/compare" : "/jobs"}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{job.title}</h1>
          <p className="mt-2 text-lg text-[var(--text-muted)]">
            {job.company} · {job.location}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="default">{formatRemoteType(job.remoteType)}</Badge>
            {!isCustom && <Badge variant="default">{formatFreshness(job.postedAt)}</Badge>}
            {isCustom && <Badge variant="info">External · Pasted</Badge>}
            {job.salary && <Badge variant="success">{job.salary}</Badge>}
          </div>
        </div>
        {match && (
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-bg)] p-5 text-center sm:p-6">
            <div className="text-4xl font-bold text-[var(--accent-text)]">{match.matchScore}%</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {matchCategoryEmoji(match.category)} {matchCategoryLabel(match.category)}
            </div>
            <Badge className="mt-2" variant="info">{match.recommendation.replace(/_/g, " ")}</Badge>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SaveJobButton job={job} matchScore={match?.matchScore} size="md" variant="secondary" />
        {isSaved && savedEntry?.status === "SAVED" && (
          <Button variant="outline" onClick={markApplied}>
            Mark Applied
          </Button>
        )}
        {isSaved && (
          <Link href="/applications">
            <Button variant="ghost">View in Applications</Button>
          </Link>
        )}
        <Link href={`/resume/${jobId}`}>
          <Button className="gap-1">
            <FileText className="h-4 w-4" /> Optimize Resume
          </Button>
        </Link>
        {job.applicationUrl && (
          <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-1">
              <ExternalLink className="h-4 w-4" /> View Full Posting
            </Button>
          </a>
        )}
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing skills against your resume…
        </div>
      )}

      {error && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{error}</CardContent>
        </Card>
      )}

      {/* Skill comparison — primary section */}
      <Card className="mb-6 border-[var(--accent)]/20">
        <CardHeader>
          <CardTitle className="text-lg">Skills Match Summary</CardTitle>
          <p className="text-sm text-[var(--text-muted)]">
            {matchedSkills.length} matched · {missingSkills.length} missing · {jobSkills.length} skills
            detected for this role
          </p>
          {details?.skillsInferred && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Skills expanded from job title + preview text (Adzuna does not provide full descriptions).
              {details.enrichmentNote ? ` ${details.enrichmentNote}` : ""}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" /> Matching — job requires &amp; you have ({matchedSkills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.length > 0 ? (
                  matchedSkills.map((skill) => (
                    <Badge key={skill} variant="success" className="text-sm">
                      ✓ {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">None detected in available job text</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <XCircle className="h-4 w-4" /> Missing — job requires but not on resume ({missingSkills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {missingSkills.length > 0 ? (
                  missingSkills.map((skill) => (
                    <Badge key={skill} variant="warning" className="text-sm">
                      ✗ {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">No gaps among detected requirements</span>
                )}
              </div>
            </div>
          </div>

          {jobSkills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]">
                All job requirements
              </p>
              <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {jobSkills.map((skill) => {
                  const isMatched = matchedSkills.some((m) => m.toLowerCase() === skill.toLowerCase());
                  return (
                    <div key={skill} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-[var(--text-primary)]">{skill}</span>
                      <Badge variant={isMatched ? "success" : "warning"}>
                        {isMatched ? "✓ On resume" : "✗ Missing"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {relevantProfileSkills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]">
                Your resume skills relevant to this role
              </p>
              <div className="flex flex-wrap gap-2">
                {relevantProfileSkills.map((skill) => {
                  const matchesJob = matchedSkills.some((m) => m.toLowerCase() === skill.toLowerCase());
                  return (
                    <Badge key={skill} variant={matchesJob ? "success" : "default"}>
                      {matchesJob ? "✓" : "○"} {skill}
                      {!matchesJob ? " (not listed in job preview)" : ""}
                    </Badge>
                  );
                })}
              </div>
              {resumeMatchedNotRequired.length > 0 && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {resumeMatchedNotRequired.length} skill{resumeMatchedNotRequired.length !== 1 ? "s" : ""} on
                  your resume are relevant to this role but not mentioned in the available job text — they may
                  still help your application.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {match?.scoreBreakdown && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Why {match.matchScore}% match?</CardTitle>
            <p className="text-sm text-[var(--text-muted)]">
              Score combines skills, role fit, experience, and location — not skills alone.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Skills", value: match.scoreBreakdown.skills, weight: "45%" },
                { label: "Role fit", value: match.scoreBreakdown.role, weight: "20%" },
                { label: "Experience", value: match.scoreBreakdown.experience, weight: "20%" },
                { label: "Location", value: match.scoreBreakdown.location, weight: "10%" },
              ].map(({ label, value, weight }) => (
                <div key={label} className="rounded-lg border border-[var(--border)] p-3 text-center">
                  <p className="text-xs text-[var(--text-subtle)]">{label} ({weight})</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{value}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {match && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-[var(--text-subtle)]">Role fit</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{match.roleMatch.note}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-[var(--text-subtle)]">Experience</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{match.experienceMatch.note}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-[var(--text-subtle)]">Location</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{match.locationMatch.note}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {match && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Match Insight &amp; Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{match.reasoningSummary}</p>
            <p className="text-sm text-[var(--accent-text)]">{match.applyAdvice}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
          {job.descriptionPartial && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-sm text-[var(--text-muted)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div>
                Adzuna provides a preview of the job description (not the full posting).
                {job.applicationUrl && (
                  <>
                    {" "}
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--accent-text)] underline"
                    >
                      Open the original job
                    </a>{" "}
                    to read complete requirements and responsibilities.
                  </>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {displayDescription ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {displayDescription}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Description not available in search results.{" "}
              {job.applicationUrl && (
                <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-text)] underline">
                  View on the original site
                </a>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {details?.profileSkills && details.profileSkills.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">All Resume Skills</CardTitle>
            <p className="text-sm text-[var(--text-muted)]">Complete list from your uploaded resume</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {details.profileSkills.map((skill) => {
                const matchesJob = matchedSkills.some((m) => m.toLowerCase() === skill.toLowerCase());
                const isRelevant = relevantProfileSkills.some((r) => r.toLowerCase() === skill.toLowerCase());
                return (
                  <Badge
                    key={skill}
                    variant={matchesJob ? "success" : isRelevant ? "info" : "default"}
                  >
                    {matchesJob ? "✓" : isRelevant ? "○" : "·"} {skill}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {gaps.length > 0 && (
        <Card id="learning-recommendations" className="mb-6 scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Learning Recommendations
            </CardTitle>
            <p className="text-sm text-[var(--text-muted)]">
              Curated docs, tutorials, and videos to close skill gaps for this role.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {gaps.slice(0, 4).map((gap) => (
                <div key={gap.skill} className="rounded-lg border border-[var(--border)] p-4">
                  <div className="font-medium text-[var(--text-primary)]">{gap.skill}</div>
                  <div className="mt-2 text-xs text-[var(--text-subtle)]">
                    Required: {gap.requiredLevel} · Importance: {gap.importance}
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{gap.explanation}</p>
                  {gap.learningResources.some((r) => r.url) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {gap.learningResources.filter((r) => r.url).map((resource) => (
                        <a
                          key={`${gap.skill}-${resource.title}-${resource.url ?? resource.type}`}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-card-solid)] px-3 py-1 text-xs text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {resource.title}
                          <span className="text-[var(--text-subtle)]">· {resource.type}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
