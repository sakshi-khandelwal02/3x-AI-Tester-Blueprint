import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/20",
        variant === "secondary" &&
          "bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]",
        variant === "ghost" &&
          "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        variant === "danger" && "bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-600/30",
        variant === "outline" &&
          "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    />
  );
}
