"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { isJobSaved } from "@/lib/jobs/saved-jobs";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";

interface SaveJobButtonProps {
  job: Job;
  matchScore?: number;
  size?: "sm" | "md";
  variant?: "secondary" | "outline" | "ghost";
  showLabel?: boolean;
  className?: string;
}

export function SaveJobButton({
  job,
  matchScore,
  size = "sm",
  variant = "outline",
  showLabel = true,
  className,
}: SaveJobButtonProps) {
  const { state, saveJob, unsaveJob } = useApp();
  const saved = isJobSaved(state.savedJobs, job.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      unsaveJob(job.id);
    } else {
      saveJob(job, { matchScore });
    }
  };

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : variant}
      size={size}
      onClick={handleClick}
      className={cn("gap-1", saved && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400", className)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4 fill-current" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {showLabel && (saved ? "Saved" : "Save")}
    </Button>
  );
}
