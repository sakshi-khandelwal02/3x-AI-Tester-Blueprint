import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relative posted time — uses precise elapsed time so labels match freshness filters */
export function formatFreshness(postedAt: string): string {
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const ms = Date.now() - date.getTime();
  if (ms < 0) return "Just now";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(ms / 3_600_000);
  const remainderMinutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours < 24) {
    if (remainderMinutes === 0) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    return `${hours}h ${remainderMinutes}m ago`;
  }

  if (hours < 48) return "Yesterday";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function freshnessEmoji(postedAt: string): string {
  const hours =
    (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "⚡";
  if (hours < 2) return "🔥";
  if (hours < 24) return "🟢";
  if (hours < 48) return "📅";
  return "📅";
}

export function matchCategoryEmoji(category: string): string {
  switch (category) {
    case "EXCELLENT_MATCH":
      return "🔥";
    case "GOOD_MATCH":
      return "🟢";
    case "STRETCH_OPPORTUNITY":
      return "🟡";
    default:
      return "🔴";
  }
}

export function matchCategoryLabel(category: string): string {
  switch (category) {
    case "EXCELLENT_MATCH":
      return "Excellent Match";
    case "GOOD_MATCH":
      return "Good Match";
    case "STRETCH_OPPORTUNITY":
      return "Stretch Opportunity";
    default:
      return "Low Match";
  }
}

/** Human-readable work arrangement — never show raw UNKNOWN in UI */
export function formatRemoteType(remoteType: string): string {
  switch (remoteType) {
    case "REMOTE":
      return "Remote";
    case "HYBRID":
      return "Hybrid";
    case "ONSITE":
      return "On-site";
    case "UNKNOWN":
      return "Not specified";
    default:
      return "Not specified";
  }
}

/** Strip HTML from Adzuna / pasted job descriptions for display */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
