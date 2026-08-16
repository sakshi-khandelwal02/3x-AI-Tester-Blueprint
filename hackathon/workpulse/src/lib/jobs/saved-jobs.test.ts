import { describe, it, expect } from "vitest";
import {
  buildSavedJobEntry,
  isJobSaved,
  resolveSavedJob,
} from "@/lib/jobs/saved-jobs";
import type { Job, SavedJob } from "@/types";

const sampleJob: Job = {
  id: "job-1",
  title: "Backend Engineer",
  company: "Acme",
  location: "Remote",
  remoteType: "REMOTE",
  description: "Build APIs",
  postedAt: new Date().toISOString(),
  source: "MOCK",
  sourceUrl: "",
  applicationUrl: "https://example.com/apply",
  employmentType: "FULL_TIME",
  skills: ["Node.js"],
};

describe("saved-jobs helpers", () => {
  it("detects saved jobs excluding dismissed", () => {
    const saved: SavedJob[] = [
      { jobId: "job-1", status: "SAVED", savedAt: "", updatedAt: "" },
      { jobId: "job-2", status: "DISMISSED", savedAt: "", updatedAt: "" },
    ];
    expect(isJobSaved(saved, "job-1")).toBe(true);
    expect(isJobSaved(saved, "job-2")).toBe(false);
  });

  it("stores job snapshot when saving", () => {
    const entry = buildSavedJobEntry(sampleJob, undefined, { matchScore: 88 });
    expect(entry.jobSnapshot?.title).toBe("Backend Engineer");
    expect(entry.matchScore).toBe(88);
  });

  it("resolves job from snapshot when not in current search", () => {
    const saved: SavedJob[] = [
      {
        jobId: "job-1",
        status: "SAVED",
        savedAt: "",
        updatedAt: "",
        jobSnapshot: sampleJob,
      },
    ];
    expect(resolveSavedJob("job-1", [], saved)?.company).toBe("Acme");
  });
});
