"use client";

export interface UserSession {
  userId: string;
  email: string;
  firstName?: string;
  signedInAt: string;
}

export { STORAGE_KEYS, stateStorageKey } from "@/lib/persistence/keys";

import { STORAGE_KEYS, LEGACY_STORAGE_KEYS, stateStorageKey } from "@/lib/persistence/keys";

const AUTH_KEY = STORAGE_KEYS.auth;

function readFirstStorageKey(keys: string[]): string | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

function userIdFromEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/[^a-z0-9._-]/g, "");
}

export function createSession(email: string, firstName?: string): UserSession {
  const normalizedEmail = email.trim().toLowerCase();
  return {
    userId: userIdFromEmail(normalizedEmail),
    email: normalizedEmail,
    firstName: firstName?.trim() || undefined,
    signedInAt: new Date().toISOString(),
  };
}

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readFirstStorageKey([AUTH_KEY, ...LEGACY_STORAGE_KEYS.auth]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (!parsed?.userId || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}
