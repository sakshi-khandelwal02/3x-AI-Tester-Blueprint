import { describe, it, expect } from "vitest";
import {
  recordJobDismissed,
  recordJobViewed,
  rankJobsWithInteractions,
} from "@/lib/matching/personalization";
import type { Job, MatchResult } from "@/types";

const sampleJob = (id: string, company: string): Job => ({
  id,
  title: "DevOps Engineer",
  company,
  location: "Remote",
  remoteType: "REMOTE",
  description: "Kubernetes AWS",
  postedAt: new Date().toISOString(),
  source: "MOCK",
  sourceUrl: "",
  applicationUrl: "",
  employmentType: "FULL_TIME",
  skills: ["Kubernetes", "AWS"],
});

describe("personalization", () => {
  it("records job views", () => {
    const next = recordJobViewed(undefined, "job-1");
    expect(next.viewedJobs["job-1"]).toBeTruthy();
  });

  it("records dismissed jobs without duplicates", () => {
    const once = recordJobDismissed(undefined, "job-2");
    const twice = recordJobDismissed(once, "job-2");
    expect(twice.dismissedJobIds).toEqual(["job-2"]);
  });

  it("boosts saved jobs in ranking", () => {
    const jobs = [sampleJob("a", "Acme"), sampleJob("b", "Beta")];
    const matches: Record<string, MatchResult> = {
      a: { jobId: "a", matchScore: 70, category: "GOOD_MATCH" } as MatchResult,
      b: { jobId: "b", matchScore: 72, category: "GOOD_MATCH" } as MatchResult,
    };
    const ranked = rankJobsWithInteractions(jobs, matches, undefined, [
      { jobId: "a", status: "SAVED", savedAt: "", updatedAt: "" },
    ]);
    expect(ranked[0].id).toBe("a");
  });
});
