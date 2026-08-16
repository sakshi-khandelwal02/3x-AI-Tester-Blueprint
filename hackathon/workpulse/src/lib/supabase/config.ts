/** Supabase + deployment env helpers (no secrets in this module beyond server-only reads). */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  return key;
}

/**
 * ADZUNA_APP_ID classification: SECRET (server-only).
 * Used with ADZUNA_APP_KEY as an API credential pair in server-side fetch calls
 * (adzuna-source.ts, fetchAdzunaJobDetails.ts). Never exposed to the browser.
 */
export function isAdzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim());
}

export const RESUME_STORAGE_BUCKET = "resumes";
