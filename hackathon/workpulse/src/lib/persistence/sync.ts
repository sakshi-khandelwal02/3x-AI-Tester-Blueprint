"use client";

import type { AppState } from "@/types";
import {
  loadCareerState,
  saveCareerState,
} from "@/lib/persistence/storage-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function isRemotePersistenceEnabled(): boolean {
  return typeof window !== "undefined" && isSupabaseConfigured();
}

export async function fetchRemoteAppState(userId: string): Promise<{
  state: AppState | null;
  persisted: boolean;
  error?: string;
}> {
  if (!isRemotePersistenceEnabled()) {
    return { state: loadCareerState(userId), persisted: false };
  }

  try {
    const res = await fetch("/api/user/state", { credentials: "include" });
    if (res.status === 401) {
      return { state: loadCareerState(userId), persisted: false, error: "Unauthorized" };
    }
    if (!res.ok) {
      return { state: loadCareerState(userId), persisted: false, error: "Remote load failed" };
    }
    const data = await res.json();
    if (data.persisted && data.state) {
      saveCareerState(userId, data.state as AppState);
      return { state: data.state as AppState, persisted: true };
    }
    return { state: loadCareerState(userId), persisted: false };
  } catch {
    return { state: loadCareerState(userId), persisted: false, error: "Network error" };
  }
}

export function scheduleRemoteStateSync(userId: string, state: AppState): void {
  saveCareerState(userId, state);

  if (!isRemotePersistenceEnabled()) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch("/api/user/state", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
    } catch (error) {
      console.warn("Remote state sync failed:", error);
    }
  }, 800);
}

export async function clearRemoteSession(): Promise<void> {
  if (!isRemotePersistenceEnabled()) return;
  try {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
}

export async function clearRemoteUserData(): Promise<void> {
  if (!isRemotePersistenceEnabled()) return;
  try {
    await fetch("/api/user/state", { method: "DELETE", credentials: "include" });
  } catch {
    // ignore
  }
}

export function getResumeUploadEndpoint(): string {
  return isRemotePersistenceEnabled() ? "/api/resume/upload" : "/api/resume/parse";
}
