"use client";

import type { RoleSkillDemandResult } from "@/lib/market/roleSkillDemand";

interface RoleSkillDemandChartProps {
  data: RoleSkillDemandResult;
  className?: string;
}

export function RoleSkillDemandChart({ data, className }: RoleSkillDemandChartProps) {
  if (data.jobsAnalyzed === 0 || data.skills.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Search for jobs matching &quot;{data.targetRole}&quot; to see role-specific skill demand.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Skills in demand — {data.targetRole}
          </h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            {data.windowLabel} · {data.jobsAnalyzed} job{data.jobsAnalyzed !== 1 ? "s" : ""} analyzed
          </p>
        </div>
      </div>
      <div className="space-y-3 font-mono text-sm">
        {data.skills.map((item) => (
          <div key={item.skill} className="flex items-center gap-3">
            <span
              className="w-28 shrink-0 truncate text-right text-[var(--text-secondary)] sm:w-32"
              title={item.skill}
            >
              {item.skill}
            </span>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="h-2.5 flex-1 rounded-sm bg-[var(--bar-track)] overflow-hidden">
                <div
                  className="h-full rounded-sm bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all duration-500"
                  style={{ width: `${item.barWidth}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-semibold text-[var(--accent-text)]">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--text-subtle)]">
        Percentages reflect how often each skill appears in retrieved {data.targetRole} listings.
      </p>
    </div>
  );
}
