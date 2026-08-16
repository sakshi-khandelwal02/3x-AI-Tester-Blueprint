import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClickableStatCardProps {
  href: string;
  count: number;
  label: string;
  emoji?: string;
  countClassName?: string;
  ariaLabel: string;
}

export function ClickableStatCard({
  href,
  count,
  label,
  emoji,
  countClassName,
  ariaLabel,
}: ClickableStatCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "group block rounded-lg p-4 transition-all",
        "bg-[var(--bg-muted)] hover:bg-[var(--bg-hover)] hover:ring-1 hover:ring-[var(--accent)]/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={cn("text-2xl font-bold", countClassName)}>
            {emoji && <span className="mr-1">{emoji}</span>}
            {count}
          </div>
          <div className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">{label}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--text-subtle)] transition group-hover:text-[var(--accent)] group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
