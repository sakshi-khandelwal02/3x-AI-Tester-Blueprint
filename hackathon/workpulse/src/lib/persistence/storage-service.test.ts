import { describe, it, expect } from "vitest";
import { PERSISTENCE_SCHEMA_VERSION, appOwnedKeysForUser, stateStorageKey } from "@/lib/persistence/keys";

describe("persistence keys", () => {
  it("uses versioned schema constant", () => {
    expect(PERSISTENCE_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("scopes reset keys to app-owned storage only", () => {
    const keys = appOwnedKeysForUser("user@test.com");
    expect(keys).toContain(stateStorageKey("user@test.com"));
    expect(keys).toContain("workpulse-auth");
    expect(keys.some((k) => k.includes("work-pulse-theme"))).toBe(false);
  });
});

describe("normalizeAppState via loadCareerState", () => {
  it("returns defaults when window is undefined", async () => {
    const { loadCareerState, defaultCareerState } = await import("@/lib/persistence/storage-service");
    expect(loadCareerState("test-user")).toEqual(defaultCareerState);
  });
});
