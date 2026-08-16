import type { ProfessionalProfile } from "@/types";

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Parse first name from full name — handles "Last, First" and email hints */
export function extractFirstNameFromFullName(name: string, email?: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  if (trimmed.includes(",")) {
    const afterComma = trimmed.split(",")[1]?.trim();
    if (afterComma) return capitalize(afterComma.split(/\s+/)[0]);
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return capitalize(parts[0]);

  const fromEmail = inferFirstNameFromEmail(parts, email);
  if (fromEmail) return fromEmail;

  return capitalize(parts[0]);
}

function inferFirstNameFromEmail(nameParts: string[], email?: string): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const emailTokens = local.split(/[._-]+/).filter((t) => t.length >= 2);
  if (emailTokens.length === 0) return null;

  for (const token of emailTokens) {
    const match = nameParts.find(
      (part) => part.toLowerCase() === token || part.toLowerCase().startsWith(token)
    );
    if (match) return capitalize(match);
  }

  if (emailTokens.length >= 2 && nameParts.length >= 2) {
    const secondToken = emailTokens[0];
    const secondPart = nameParts.find((p) => p.toLowerCase().startsWith(secondToken));
    if (secondPart) return capitalize(secondPart);
  }

  return null;
}

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const token = local.split(/[._-]/)[0] ?? local;
  return capitalize(token);
}

/** First name for greetings — avoids generic "Candidate" fallback */
export function getUserFirstName(
  profile?: Pick<ProfessionalProfile, "name" | "email"> | null,
  sessionFirstName?: string | null
): string {
  if (sessionFirstName?.trim()) {
    return capitalize(sessionFirstName.trim().split(/\s+/)[0]);
  }

  if (profile?.name?.trim()) {
    let name = profile.name.trim().replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
    if (name.toLowerCase() !== "candidate" && name.length <= 50) {
      return extractFirstNameFromFullName(name, profile.email);
    }
  }

  if (profile?.email) return firstNameFromEmail(profile.email);
  return "there";
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
