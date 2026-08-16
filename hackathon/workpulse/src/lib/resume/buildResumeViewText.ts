import type { ProfessionalProfile } from "@/types";

/** Build readable resume text for in-app preview */
export function buildResumeViewText(profile: ProfessionalProfile): string {
  if (profile.rawResumeText?.trim()) {
    return profile.rawResumeText.trim();
  }

  const lines: string[] = [];
  lines.push(profile.name);
  if (profile.email) lines.push(profile.email);
  lines.push("");
  lines.push(profile.currentRole);
  lines.push(`${profile.experienceYears}+ years experience`);
  lines.push("");

  if (profile.professionalSummary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(profile.professionalSummary);
    lines.push("");
  }

  if (profile.skills.length > 0) {
    lines.push("SKILLS");
    lines.push(profile.skills.join(" · "));
    lines.push("");
  }

  if (profile.roles.length > 0) {
    lines.push("EXPERIENCE");
    for (const role of profile.roles) {
      lines.push(`${role.title}${role.company ? ` — ${role.company}` : ""}${role.duration ? ` (${role.duration})` : ""}`);
      role.responsibilities.forEach((r) => lines.push(`• ${r}`));
      if (role.technologies.length) lines.push(`Technologies: ${role.technologies.join(", ")}`);
      lines.push("");
    }
  }

  if (profile.projects.length > 0) {
    lines.push("PROJECTS");
    for (const project of profile.projects) {
      lines.push(`${project.name}: ${project.description}`);
      if (project.technologies.length) lines.push(`Tech: ${project.technologies.join(", ")}`);
    }
    lines.push("");
  }

  if (profile.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    profile.certifications.forEach((c) => lines.push(`• ${c}`));
  }

  return lines.join("\n").trim();
}
