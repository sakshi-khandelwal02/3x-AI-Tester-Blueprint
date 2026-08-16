import { describe, it, expect } from "vitest";
import { isSupabaseConfigured, isAdzunaConfigured } from "@/lib/supabase/config";

describe("environment configuration", () => {
  it("detects Supabase when public URL and anon key are set", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(isSupabaseConfigured()).toBe(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  it("treats Adzuna credentials as server-only pair", () => {
    const originalId = process.env.ADZUNA_APP_ID;
    const originalKey = process.env.ADZUNA_APP_KEY;
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
    expect(isAdzunaConfigured()).toBe(false);
    process.env.ADZUNA_APP_ID = "id";
    process.env.ADZUNA_APP_KEY = "key";
    expect(isAdzunaConfigured()).toBe(true);
    expect(process.env.ADZUNA_APP_ID?.startsWith("NEXT_PUBLIC_")).not.toBe(true);
    process.env.ADZUNA_APP_ID = originalId;
    process.env.ADZUNA_APP_KEY = originalKey;
  });
});
