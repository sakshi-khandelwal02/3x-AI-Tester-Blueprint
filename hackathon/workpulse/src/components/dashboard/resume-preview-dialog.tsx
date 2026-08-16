"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ResumePreviewDialogProps {
  open: boolean;
  fileName: string;
  content: string;
  onClose: () => void;
}

export function ResumePreviewDialog({
  open,
  fileName,
  content,
  onClose,
}: ResumePreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.replace(/\.(pdf|docx?)$/i, "") + "_preview.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const displayContent =
    content.trim() ||
    "Resume text is not available. Re-upload your resume from My Profile to restore the preview.";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close resume preview"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card-solid)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-muted)] px-5 py-4">
          <div>
            <h2 id="resume-preview-title" className="font-semibold text-[var(--text-primary)]">
              Latest Resume
            </h2>
            <p className="text-sm text-[var(--text-muted)]">{fileName}</p>
          </div>
          <div className="flex gap-2">
            {content.trim() && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                Download
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-[200px] overflow-y-auto bg-[var(--bg-card-solid)] px-5 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-primary)]">
            {displayContent}
          </pre>
        </div>
      </div>
    </div>,
    document.body
  );
}
