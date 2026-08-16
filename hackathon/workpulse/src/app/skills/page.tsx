"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrendingUp, Target, BookOpen } from "lucide-react";
import { RoleSkillDemandChart } from "@/components/skills/role-skill-demand-chart";
import { computeRoleSkillDemand } from "@/lib/market/roleSkillDemand";
import { getSearchableTargetRole } from "@/lib/resume/parseResumeHeader";

export default function SkillsPage() {
  const { state } = useApp();
  const analysis = state.marketAnalysis;
  const plan = state.learningPlan;
  const opportunity = analysis?.strongestOpportunity;
  const targetRole = getSearchableTargetRole(
    state.profile?.currentRole,
    state.preferences?.targetRole,
    state.profile?.rawResumeText
  );

  const roleSkillDemand = useMemo(() => {
    if (analysis?.roleSkillDemand) return analysis.roleSkillDemand;
    if (state.jobs.length) return computeRoleSkillDemand(state.jobs, targetRole, 48);
    return null;
  }, [analysis?.roleSkillDemand, state.jobs, targetRole]);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Market Intelligence</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Skill demand calculated from {analysis?.totalJobsAnalyzed || 0} retrieved job listings.
        </p>
      </div>

      {!analysis && !roleSkillDemand ? (
        <Card className="p-10 text-center">
          <p className="text-[var(--text-muted)]">Search for jobs to generate market intelligence.</p>
          <Link href="/jobs"><Button className="mt-4">Go to Jobs</Button></Link>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {roleSkillDemand && (
            <Card className="lg:col-span-2 border-[var(--accent)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
                  Skills In Demand — {targetRole}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoleSkillDemandChart data={roleSkillDemand} />
              </CardContent>
            </Card>
          )}

          {analysis && (
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
                IT Skills In Demand (All Roles)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.skills.map((s) => (
                <div key={s.skill} className="mb-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{s.skill}</span>
                    <span className="text-[var(--accent-text)]">{s.percentage}% ({s.jobCount} jobs)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bar-track)]">
                    <div
                      className="h-2 rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(100, s.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                Career Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <div className="text-5xl font-bold text-[var(--accent-text)]">{analysis.readiness.readinessScore}%</div>
                <div className="text-sm text-[var(--text-muted)]">for {analysis.readiness.targetRole}</div>
              </div>
              <div className="mb-4">
                <div className="text-xs uppercase text-[var(--text-subtle)] mb-2">Top Strengths</div>
                {analysis.readiness.topStrengths.map((s) => (
                  <Badge key={s} variant="success" className="mr-1 mb-1">✓ {s}</Badge>
                ))}
              </div>
              <div className="mb-4">
                <div className="text-xs uppercase text-[var(--text-subtle)] mb-2">Top Gaps</div>
                {analysis.readiness.topGaps.length > 0 ? (
                  analysis.readiness.topGaps.map((g, i) => (
                    <div key={g} className="text-sm text-amber-600 dark:text-amber-400">{i + 1}. {g}</div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-subtle)]">No high-confidence skill gaps identified.</p>
                )}
              </div>
              <div className="rounded-lg bg-[var(--bg-muted)] p-3">
                <div className="text-xs text-[var(--text-subtle)]">Highest-impact improvement</div>
                <div className="font-medium text-emerald-600 dark:text-emerald-400">{analysis.readiness.highestImpactImprovement}</div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{analysis.readiness.reason}</p>
              </div>
            </CardContent>
          </Card>

          {opportunity && (
            <Card className="lg:col-span-2 border-[var(--accent)]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[var(--accent)]" />
                  Strongest Market Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-semibold text-xl text-[var(--text-primary)] mb-2">{opportunity.cluster}</div>
                <div className="mb-3">
                  <div className="text-xs uppercase text-[var(--text-subtle)] mb-1">Strongest Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {opportunity.strongestSkills.map((s) => (
                      <Badge key={s} variant="success">{s}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{opportunity.why}</p>
                <p className="text-sm text-[var(--accent-text)]">{opportunity.matchingOpportunities} matching opportunities</p>
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                  High-value skill to develop: <strong>{opportunity.highValueSkillToDevelop}</strong>
                </p>
                <Link href="/jobs?filter=worth-review" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm">View Opportunities</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {analysis.prioritizedGaps && analysis.prioritizedGaps.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Priority Skill Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {analysis.prioritizedGaps.map((g) => (
                  <div
                    key={g.skill}
                    className={`rounded-lg border p-4 ${
                      g.gapType === "adjacent"
                        ? "border-[var(--accent)]/20 bg-[var(--accent-bg)]"
                        : "border-amber-500/20 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--text-primary)]">{g.skill}</span>
                      <div className="flex gap-2">
                        <Badge variant={g.importance === "HIGH" ? "warning" : "default"}>
                          {g.importance}
                        </Badge>
                        <Badge variant="info">{g.gapType === "adjacent" ? "Adjacent" : "Gap"}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]"><strong>Why it matters:</strong> {g.whyItMatters}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]"><strong>Impact:</strong> {g.opportunityImpact}</p>
                    {g.relatedSkills.length > 0 && (
                      <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                        <strong>Resume evidence:</strong> Related skills demonstrated — {g.relatedSkills.join(", ")}
                      </p>
                    )}
                    {g.gapType === "actual_gap" && (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        <strong>Gap:</strong> {g.skill} is not currently demonstrated in your resume.
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analysis.gaps.length > 0 && !analysis.prioritizedGaps?.length && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Career Gaps Detected</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analysis.gaps.map((g) => (
                  <div key={g.skill} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm text-[var(--text-secondary)]">{g.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {plan && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--accent)]" />
                  30-Day Career Improvement Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-[var(--text-muted)]">{plan.summary}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {plan.weeks.map((week) => (
                    <div key={week.week} className="rounded-lg border border-[var(--border)] p-4">
                      <div className="font-medium text-[var(--accent-text)]">Week {week.week}: {week.title}</div>
                      <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                        {week.topics.map((t) => (
                          <li key={t}>• {t}</li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-[var(--text-subtle)]">Project: {week.practiceProject}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </div>
      )}
    </AppShell>
  );
}
