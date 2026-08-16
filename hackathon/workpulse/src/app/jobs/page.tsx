"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import {
  formatFreshness,
  freshnessEmoji,
  formatRemoteType,
  matchCategoryEmoji,
} from "@/lib/utils";
import {
  filterKeyFromParam,
  FILTER_LABELS,
  jobMatchesFilter,
  getRecentCutoffMs,
  type JobFilterKey,
} from "@/lib/matching/categories";
import {
  LOCATION_GROUPS,
  ANY_LOCATION,
  REMOTE_TYPE_OPTIONS,
  formatSearchCriteriaSummary,
  applyJobDisplayFilters,
} from "@/lib/jobs/locationFilter";
import { sortJobsByPostedAt } from "@/lib/jobs/types";
import { getSearchableTargetRole } from "@/lib/resume/parseResumeHeader";
import type { FreshnessFilter, RemoteType } from "@/types";
import { Search, Loader2, Filter, X, MapPin, Building2, ClipboardPaste } from "lucide-react";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { isJobSaved } from "@/lib/jobs/saved-jobs";
import { cn } from "@/lib/utils";

const FRESHNESS_OPTIONS: { value: FreshnessFilter; label: string }[] = [
  { value: "1h", label: "Last 1 Hour" },
  { value: "2h", label: "Last 2 Hours" },
  { value: "6h", label: "Last 6 Hours" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "2d", label: "Last 2 Days" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 1 Month" },
];

const CATEGORY_FILTERS: { key: JobFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "worth-review", label: "⭐ Worth Review" },
  { key: "excellent", label: "🔥 Excellent" },
  { key: "good", label: "🟢 Good" },
  { key: "stretch", label: "🟡 Stretch" },
  { key: "recent", label: "⚡ Recent" },
];

function JobsPageContent() {
  const searchParams = useSearchParams();
  const { state, setJobs, setMatches, setMarketAnalysis, setLearningPlan, setLastSearchFreshness, recordFilterExplored } = useApp();
  const [freshness, setFreshness] = useState<FreshnessFilter>(
    state.lastSearchFreshness || "7d"
  );
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [anyLocation, setAnyLocation] = useState(true);
  const [remoteType, setRemoteType] = useState<RemoteType | "ANY">(
    state.lastSearchRemoteType || state.preferences?.remotePreference || "ANY"
  );
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<JobFilterKey>("all");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [hasSearched, setHasSearched] = useState(state.jobs.length > 0);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const effectiveLocation = customLocation.trim() || location;
  const displayLocation = anyLocation && !effectiveLocation ? undefined : effectiveLocation || undefined;

  const searchJobs = useCallback(async () => {
    if (!state.profile) return;
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: state.profile,
          preferences: state.preferences,
          interactions: state.interactions,
          savedJobs: state.savedJobs,
          freshness,
          anyLocation: anyLocation && !effectiveLocation,
          location: anyLocation && !effectiveLocation ? "" : effectiveLocation,
        }),
      });
      const data = await res.json();
      setHasSearched(true);
      setSearchMessage(data.message || null);
      setJobs(data.jobs, data.demoMode === true, freshness, remoteType);
      setMatches(data.matches);

      if (data.jobs.length === 0) {
        setMarketAnalysis(undefined);
        setLearningPlan(undefined);
        return;
      }

      const marketRes = await fetch("/api/market/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: data.jobs,
          profile: state.profile,
          matches: data.matches,
          targetRole: state.preferences?.targetRole,
        }),
      });
      const market = await marketRes.json();
      setMarketAnalysis(market);

      const planRes = await fetch("/api/learning/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: state.profile,
          targetRole: state.preferences?.targetRole || state.profile.currentRole,
          gaps: market.readiness?.topGaps || [],
          marketSkills: market.skills || [],
        }),
      });
      const planData = await planRes.json();
      setLearningPlan(planData.plan);
    } finally {
      setLoading(false);
    }
  }, [
    state.profile,
    state.preferences,
    freshness,
    anyLocation,
    effectiveLocation,
    remoteType,
    setJobs,
    setMatches,
    setMarketAnalysis,
    setLearningPlan,
  ]);

  useEffect(() => {
    const paramFilter = filterKeyFromParam(searchParams.get("filter"));
    setFilter(paramFilter);
    if (paramFilter !== "all") {
      recordFilterExplored(paramFilter);
    }
  }, [searchParams, recordFilterExplored]);

  /** Freshness is applied client-side on cached results (same as work type) — avoids API re-fetch drift */
  const displayFilteredJobs = useMemo(
    () =>
      applyJobDisplayFilters(state.jobs, {
        freshness,
        remoteType,
        location: displayLocation,
      }),
    [state.jobs, freshness, remoteType, displayLocation]
  );

  const recentCutoffMs = getRecentCutoffMs(freshness);

  const filteredJobs = useMemo(
    () =>
      sortJobsByPostedAt(
        displayFilteredJobs.filter((job) => {
          if (showSavedOnly && !isJobSaved(state.savedJobs, job.id)) return false;
          return jobMatchesFilter(job.id, state.matches, filter, job.postedAt, recentCutoffMs);
        })
      ),
    [displayFilteredJobs, state.matches, state.savedJobs, filter, recentCutoffMs, showSavedOnly]
  );

  const savedCount = state.savedJobs.filter((s) => s.status === "SAVED").length;

  const emptyMessage = () => {
    if (!state.profile) return "Complete your profile first.";
    if (!hasSearched) return "Select a location and click Search Jobs to fetch live listings from Adzuna.";
    if (state.jobs.length === 0) {
      return (
        searchMessage ||
        `Zero jobs found based on the criteria you selected (${formatSearchCriteriaSummary({
          targetRole: getSearchableTargetRole(
            state.profile?.currentRole,
            state.preferences?.targetRole,
            state.profile?.rawResumeText
          ),
          location: effectiveLocation,
          remoteType,
          freshness,
        })}). Try a different location, work type, or freshness filter.`
      );
    }
    if (displayFilteredJobs.length === 0 && state.jobs.length > 0) {
      const label = FRESHNESS_OPTIONS.find((o) => o.value === freshness)?.label || freshness;
      const remoteLabel = remoteType !== "ANY" ? ` · ${remoteType}` : "";
      return `No jobs match your filters (${label}${remoteLabel}${displayLocation ? ` · ${displayLocation}` : ""}). Try All types or a wider freshness window, then Search Jobs.`;
    }
    if (filteredJobs.length === 0 && displayFilteredJobs.length > 0) {
      if (showSavedOnly) {
        return savedCount === 0
          ? "No saved jobs yet. Click Save on any job to track it in Applications."
          : "None of your saved jobs match the current filters. Try clearing filters or run a new search.";
      }
      return `No jobs match the current category filter (${FILTER_LABELS[filter]}). Try "All" or broaden your search criteria.`;
    }
    if (filter === "excellent") return "No Excellent Matches right now. Explore Good Matches or Stretch Opportunities.";
    if (filter === "good") return "No Good Matches in current results. Try expanding your freshness filter.";
    if (filter === "stretch") return "No Stretch Opportunities found. Review all jobs or adjust your target role.";
    if (filter === "worth-review") return "No opportunities worth reviewing yet. Run a job search.";
    if (filter === "recent") return `No jobs posted recently in your current results. Try a wider freshness filter.`;
    return "No jobs match the current filter.";
  };

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Job Discovery</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Target:{" "}
            {getSearchableTargetRole(
              state.profile?.currentRole,
              state.preferences?.targetRole,
              state.profile?.rawResumeText
            ) || "Set profile first"}
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {state.demoMode ? "Demo jobs" : "Live · Adzuna"}
            </span>
          </p>
          {filter !== "all" && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-bg)] px-3 py-1 text-sm text-[var(--accent-text)]">
              Filter: {FILTER_LABELS[filter]}
              <Link href="/jobs" className="hover:opacity-80" aria-label="Clear filter">
                <X className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
        <Button onClick={searchJobs} disabled={loading || !state.profile} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search Jobs
        </Button>
        <Link href="/jobs/compare">
          <Button variant="outline" className="gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Compare External Job
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Freshness:</span>
            {FRESHNESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFreshness(opt.value);
                  setLastSearchFreshness(opt.value);
                  if (hasSearched) setSearchMessage(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  freshness === opt.value
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border-strong)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {hasSearched && (
            <p className="text-xs text-[var(--text-subtle)]">
              Freshness filters apply instantly to your last search. Click Search Jobs to fetch a new batch from Adzuna.
            </p>
          )}

          <div className="grid gap-4 border-t border-[var(--border)] pt-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                Location
              </Label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setAnyLocation(true);
                    setLocation("");
                    setCustomLocation("");
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    anyLocation && !customLocation && !location
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border-strong)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  {ANY_LOCATION.label}
                </button>
                {LOCATION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.presets.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setAnyLocation(false);
                            setLocation(preset.value);
                            setCustomLocation("");
                          }}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition",
                            !anyLocation && !customLocation && location === preset.value
                              ? "bg-[var(--accent)] text-white"
                              : "border border-[var(--border-strong)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Input
                className="mt-2"
                placeholder="Or type any city (e.g. Nagpur, Manchester, San Francisco)"
                value={customLocation}
                onChange={(e) => {
                  setCustomLocation(e.target.value);
                  if (e.target.value.trim()) setAnyLocation(false);
                }}
              />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                Work type
              </Label>
              <div className="flex flex-wrap gap-2">
                {REMOTE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRemoteType(opt.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition",
                      remoteType === opt.value
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border-strong)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(anyLocation && !effectiveLocation) || effectiveLocation || remoteType !== "ANY" ? (
            <p className="text-xs text-[var(--text-subtle)]">
              Active filters:{" "}
              {anyLocation && !effectiveLocation
                ? "Any location (India, UK, US)"
                : effectiveLocation}
              {remoteType !== "ANY" ? ` · ${remoteType}` : ""}
              {" · "}
              {FRESHNESS_OPTIONS.find((o) => o.value === freshness)?.label}
              {remoteType !== "ANY" ? " · work type filters apply instantly" : ""}
              {" · "}Click Search Jobs after changing location
            </p>
          ) : (
            <p className="text-xs text-[var(--text-subtle)]">
              Searching India, UK, and US together (Any location).
              {" · "}
              {FRESHNESS_OPTIONS.find((o) => o.value === freshness)?.label}
              {" · "}Click Search Jobs to fetch listings
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/jobs" : `/jobs?filter=${f.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              filter === f.key && !showSavedOnly
                ? "border border-[var(--accent)]/30 bg-[var(--accent-bg-active)] text-[var(--accent-text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {f.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setShowSavedOnly((v) => !v)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            showSavedOnly
              ? "border border-[var(--accent)]/30 bg-[var(--accent-bg-active)] text-[var(--accent-text)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          🔖 Saved{savedCount > 0 ? ` (${savedCount})` : ""}
        </button>
        {savedCount > 0 && (
          <Link
            href="/applications"
            className="ml-auto text-sm text-[var(--accent-text)] underline-offset-2 hover:underline"
          >
            View Applications →
          </Link>
        )}
      </div>

      {filteredJobs.length > 0 && (
        <p className="mb-3 text-sm text-[var(--text-subtle)]">
          Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          {displayFilteredJobs.length !== filteredJobs.length
            ? ` (${displayFilteredJobs.length} after work type / freshness)`
            : state.jobs.length > displayFilteredJobs.length
              ? ` of ${state.jobs.length} fetched`
              : ""}
          {filter !== "all" ? ` · ${FILTER_LABELS[filter]}` : ""}
          {" · "}
          {FRESHNESS_OPTIONS.find((o) => o.value === freshness)?.label}
          {remoteType !== "ANY" ? ` · ${formatRemoteType(remoteType)}` : ""}
          {effectiveLocation ? ` · ${effectiveLocation}` : ""}
        </p>
      )}

      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-[var(--text-muted)]">
              {emptyMessage()}
              {state.jobs.length === 0 && state.profile && !hasSearched && (
                <Button onClick={searchJobs} disabled={loading} className="mt-4">
                  Search Jobs
                </Button>
              )}
              {hasSearched && state.jobs.length === 0 && (
                <Button onClick={searchJobs} disabled={loading} variant="secondary" className="mt-4">
                  Search again
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const match = state.matches[job.id];
            return (
              <Card
                key={job.id}
                className="transition hover:border-[var(--accent)]/40 hover:shadow-lg"
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">{job.title}</h3>
                      {match && (
                        <Badge
                          variant={
                            match.category === "EXCELLENT_MATCH"
                              ? "success"
                              : match.category === "GOOD_MATCH"
                                ? "info"
                                : "warning"
                          }
                        >
                          {matchCategoryEmoji(match.category)} {match.matchScore}%
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                      {job.company}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {job.location} ·{" "}
                      <span className="text-[var(--accent-text)]">{formatRemoteType(job.remoteType)}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.skills.slice(0, 6).map((s) => (
                        <Badge key={s} variant="default">{s}</Badge>
                      ))}
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <SaveJobButton job={job} matchScore={match?.matchScore} />
                    <div className="text-sm text-[var(--text-muted)]">
                      {freshnessEmoji(job.postedAt)} {formatFreshness(job.postedAt)}
                    </div>
                    {job.salary && (
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {job.salary}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        </AppShell>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}
