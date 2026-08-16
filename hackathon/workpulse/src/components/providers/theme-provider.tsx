"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/lib/persistence/keys";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = [STORAGE_KEYS.theme, ...LEGACY_STORAGE_KEYS.theme];
    for (const key of keys) {
      const stored = localStorage.getItem(key) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveInitialTheme(): Theme {
  const stored = readStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = resolveInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
    localStorage.setItem(STORAGE_KEYS.theme, initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEYS.theme, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEYS.theme, next);
      applyTheme(next);
      return next;
    });
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[var(--bg-page)]" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
