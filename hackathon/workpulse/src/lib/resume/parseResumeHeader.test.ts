import { describe, it, expect } from "vitest";
import {
  extractNameFromResumeText,
  extractCurrentRoleFromResumeText,
  getSearchableTargetRole,
  isContactOrAddressLine,
  normalizeResumeText,
} from "@/lib/resume/parseResumeHeader";

const GLUED_HEADER = `AVNEET AGNIHOTRI1240, Shiv Sadan, Tubewell Road, Khati Baba, Jhansi-284003, U.P, India+91-8982134351 | agnihotri.avneet@gmail.comLinkedIn

PROFESSIONAL SUMMARY
Senior DevOps Engineer with 8+ years of experience in cloud infrastructure.`;

describe("resume header parsing", () => {
  it("extracts person name from glued DOCX header", () => {
    const text = normalizeResumeText(GLUED_HEADER);
    expect(extractNameFromResumeText(text)).toBe("Avneet Agnihotri");
  });

  it("extracts role from summary not address line", () => {
    const text = normalizeResumeText(GLUED_HEADER);
    expect(extractCurrentRoleFromResumeText(text)).toBe("Senior DevOps Engineer");
  });

  it("rejects address as searchable target role", () => {
    const text = normalizeResumeText(GLUED_HEADER);
    const bad = "AVNEET AGNIHOTRI1240, Shiv Sadan, Tubewell Road";
    expect(isContactOrAddressLine(bad)).toBe(true);
    expect(getSearchableTargetRole(bad, bad, text)).toBe("Senior DevOps Engineer");
  });
});

describe("next resume version", () => {
  function nextResumeVersion(latest: number | null | undefined): number {
    return (latest ?? 0) + 1;
  }

  it("increments version for resume history", () => {
    expect(nextResumeVersion(null)).toBe(1);
    expect(nextResumeVersion(1)).toBe(2);
    expect(nextResumeVersion(5)).toBe(6);
  });
});
