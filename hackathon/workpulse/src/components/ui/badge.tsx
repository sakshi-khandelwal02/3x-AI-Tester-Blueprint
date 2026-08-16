import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "demo";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        variant === "success" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        variant === "warning" && "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        variant === "danger" && "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30",
        variant === "info" && "bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent)]/30",
        variant === "demo" &&
          "bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent)]/30",
        className
      )}
      {...props}
    />
  );
}
