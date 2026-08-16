import { describe, it, expect } from "vitest";
import { formatFreshness } from "@/lib/utils";
import { filterByFreshness, getFreshnessCutoffMs } from "@/lib/jobs/types";
import type { Job } from "@/types";

function jobPostedMsAgo(msAgo: number): Job {
  return {
    id: `job-${msAgo}`,
    title: "Engineer",
    company: "Co",
    location: "Remote",
    remoteType: "REMOTE",
    description: "test",
    postedAt: new Date(Date.now() - msAgo).toISOString(),
    source: "MOCK",
    sourceUrl: "",
    applicationUrl: "",
    employmentType: "FULL_TIME",
    skills: [],
  };
}

describe("formatFreshness vs freshness filter", () => {
  it("labels 2h 45m ago precisely (not rounded down to 2 hours)", () => {
    const msAgo = (2 * 60 + 45) * 60_000;
    const postedAt = new Date(Date.now() - msAgo).toISOString();
    expect(formatFreshness(postedAt)).toBe("2h 45m ago");
  });

  it("excludes 2h 45m job from Last 2 Hours filter", () => {
    const jobs = [jobPostedMsAgo((2 * 60 + 45) * 60_000)];
    const filtered = filterByFreshness(jobs, "2h");
    expect(filtered).toHaveLength(0);
  });

  it("includes 1h 30m job in Last 2 Hours filter", () => {
    const jobs = [jobPostedMsAgo(90 * 60_000)];
    const filtered = filterByFreshness(jobs, "2h");
    expect(filtered).toHaveLength(1);
    expect(formatFreshness(jobs[0].postedAt)).toBe("1h 30m ago");
  });

  it("includes 2h 45m job in Last 6 Hours filter", () => {
    const jobs = [jobPostedMsAgo((2 * 60 + 45) * 60_000)];
    expect(filterByFreshness(jobs, "6h")).toHaveLength(1);
  });
});

describe("getFreshnessCutoffMs", () => {
  it("uses exact windows for sub-day filters", () => {
    const now = Date.parse("2026-08-16T12:00:00.000Z");
    expect(getFreshnessCutoffMs("2h", now)).toBe(now - 2 * 60 * 60 * 1000);
  });
});
