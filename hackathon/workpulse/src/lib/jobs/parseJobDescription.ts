import { v4 as uuidv4 } from "uuid";
import { extractSkillsFromText } from "@/lib/skills/normalize";
import type { Job, RemoteType } from "@/types";

export interface ParsedJobInput {
  description: string;
  title?: string;
  company?: string;
  location?: string;
}

function inferRemoteType(description: string, location?: string): RemoteType {
  const text = `${description} ${location || ""}`.toLowerCase();
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh")) {
    return "REMOTE";
  }
  if (text.includes("hybrid")) return "HYBRID";
  if (text.includes("onsite") || text.includes("on-site") || text.includes("on site")) {
    return "ONSITE";
  }
  return "UNKNOWN";
}

function inferTitleFromText(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  if (first.length > 0 && first.length <= 80 && !first.endsWith(":")) {
    return first;
  }
  const roleMatch = text.match(
    /(?:job title|position|role)\s*[:\-]\s*(.+)/i
  );
  if (roleMatch?.[1]) {
    return roleMatch[1].trim().slice(0, 80);
  }
  return "Pasted Job Posting";
}

function inferCompanyFromText(text: string): string | undefined {
  const match = text.match(/(?:company|employer|organization)\s*[:\-]\s*(.+)/i);
  return match?.[1]?.trim().slice(0, 80);
}

function inferLocationFromText(text: string): string | undefined {
  const match = text.match(/(?:location|based in|work location)\s*[:\-]\s*(.+)/i);
  return match?.[1]?.trim().slice(0, 80);
}

/** Build a Job object from pasted job description text */
export function parseJobDescription(input: ParsedJobInput): Job {
  const description = input.description.trim();
  if (description.length < 50) {
    throw new Error("Job description is too short. Paste the full posting (at least 50 characters).");
  }

  const title = input.title?.trim() || inferTitleFromText(description);
  const company = input.company?.trim() || inferCompanyFromText(description) || "External Job";
  const location = input.location?.trim() || inferLocationFromText(description) || "Not specified";

  return {
    id: `custom-${uuidv4()}`,
    title,
    company,
    location,
    remoteType: inferRemoteType(description, location),
    description,
    postedAt: new Date().toISOString(),
    source: "CUSTOM",
    sourceUrl: "",
    applicationUrl: "",
    employmentType: "UNKNOWN",
    skills: extractSkillsFromText(description),
  };
}
