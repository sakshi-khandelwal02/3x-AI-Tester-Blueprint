"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveSavedJob } from "@/lib/jobs/saved-jobs";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import type { ApplicationStatus } from "@/types";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "success" | "info" | "warning" | "danger" }> = {
  SAVED: { label: "Saved", variant: "info" },
  APPLIED: { label: "Applied", variant: "success" },
  INTERVIEW: { label: "Interview", variant: "warning" },
  REJECTED: { label: "Rejected", variant: "danger" },
  DISMISSED: { label: "Dismissed", variant: "default" },
};

const GROUP_ORDER = ["saved", "applied", "interview", "rejected", "dismissed"] as const;

const STATUS_ACTIONS: Partial<Record<ApplicationStatus, { label: string; next: ApplicationStatus }[]>> = {
  SAVED: [
    { label: "Mark Applied", next: "APPLIED" },
    { label: "Interview", next: "INTERVIEW" },
  ],
  APPLIED: [
    { label: "Interview", next: "INTERVIEW" },
    { label: "Rejected", next: "REJECTED" },
  ],
  INTERVIEW: [{ label: "Rejected", next: "REJECTED" }],
};

export default function ApplicationsPage() {
  const { state, updateSavedJob, unsaveJob } = useApp();

  const activeSaved = state.savedJobs.filter((s) => s.status !== "DISMISSED");

  const updateStatus = (jobId: string, status: ApplicationStatus) => {
    const existing = state.savedJobs.find((s) => s.jobId === jobId);
    if (!existing) return;
    const job = resolveSavedJob(jobId, state.jobs, state.savedJobs);
    updateSavedJob({
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      jobSnapshot: job ?? existing.jobSnapshot,
    });
  };

  const grouped = {
    saved: state.savedJobs.filter((s) => s.status === "SAVED"),
    applied: state.savedJobs.filter((s) => s.status === "APPLIED"),
    interview: state.savedJobs.filter((s) => s.status === "INTERVIEW"),
    rejected: state.savedJobs.filter((s) => s.status === "REJECTED"),
    dismissed: state.savedJobs.filter((s) => s.status === "DISMISSED"),
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Applications</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Jobs you save from Job Discovery appear here. Track status from saved → applied → interview.
        </p>
      </div>

      {activeSaved.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[var(--text-muted)]">
            No saved jobs yet. Browse jobs and click Save on any listing to start tracking.
          </p>
          <Link href="/jobs"><Button className="mt-4">Browse Jobs</Button></Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="mb-3 text-lg font-semibold capitalize text-[var(--text-primary)]">{group}</h2>
                <div className="space-y-3">
                  {items.map((saved) => {
                    const job = resolveSavedJob(saved.jobId, state.jobs, state.savedJobs);
                    const statusInfo = STATUS_LABELS[saved.status];
                    const actions = STATUS_ACTIONS[saved.status] ?? [];
                    return (
                      <Card key={saved.jobId}>
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            {job ? (
                              <>
                                <div className="font-medium text-[var(--text-primary)]">{job.title}</div>
                                <div className="text-sm text-[var(--text-muted)]">
                                  {job.company} · {job.location}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium text-[var(--text-primary)]">Job details unavailable</div>
                                <div className="text-sm text-[var(--text-muted)]">ID: {saved.jobId}</div>
                              </>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {saved.matchScore !== undefined && (
                                <Badge variant="success">{saved.matchScore}% match</Badge>
                              )}
                              <span className="text-xs text-[var(--text-subtle)]">
                                Saved {format(new Date(saved.savedAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            {saved.applicationPackage?.ready && (
                              <Badge variant="success">Ready ✓</Badge>
                            )}
                            {job && (
                              <>
                                <Link href={`/jobs/${saved.jobId}`}>
                                  <Button variant="ghost" size="sm">View</Button>
                                </Link>
                                <Link href={`/resume/${saved.jobId}`}>
                                  <Button variant="outline" size="sm" className="gap-1">
                                    <FileText className="h-3 w-3" /> Resume
                                  </Button>
                                </Link>
                                {job.applicationUrl && (
                                  <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm">
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </a>
                                )}
                              </>
                            )}
                            {actions.map((action) => (
                              <Button
                                key={action.next}
                                size="sm"
                                onClick={() => updateStatus(saved.jobId, action.next)}
                              >
                                {action.label}
                              </Button>
                            ))}
                            {saved.status !== "DISMISSED" && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(saved.jobId, "DISMISSED")}>
                                Dismiss
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => unsaveJob(saved.jobId)}
                              aria-label="Remove from saved jobs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
