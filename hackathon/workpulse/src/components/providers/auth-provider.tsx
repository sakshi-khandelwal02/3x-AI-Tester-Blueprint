"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearSession,
  createSession,
  getSession,
  setSession,
  type UserSession,
} from "@/lib/auth/session";
import { clearRemoteSession } from "@/lib/persistence/sync";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface AuthContextValue {
  user: UserSession | null;
  ready: boolean;
  persistenceEnabled: boolean;
  signIn: (email: string, password?: string, firstName?: string) => Promise<UserSession>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromApiUser(user: {
  userId: string;
  email: string;
  firstName?: string;
  signedInAt?: string;
}): UserSession {
  return {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    signedInAt: user.signedInAt ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const persistenceEnabled = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (persistenceEnabled) {
        try {
          const res = await fetch("/api/auth/session", { credentials: "include" });
          const data = await res.json();
          if (!cancelled && data.user) {
            const session = sessionFromApiUser(data.user);
            setSession(session);
            setUser(session);
            setReady(true);
            return;
          }
        } catch {
          // fall through to local session
        }
      }

      if (!cancelled) {
        setUser(getSession());
        setReady(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [persistenceEnabled]);

  const signIn = useCallback(
    async (email: string, password?: string, firstName?: string) => {
      if (persistenceEnabled) {
        if (!password || password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        const res = await fetch("/api/auth/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName }),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          throw new Error(data.error || "Sign in failed.");
        }
        const session = sessionFromApiUser(data.user);
        setSession(session);
        setUser(session);
        return session;
      }

      const session = createSession(email, firstName);
      setSession(session);
      setUser(session);
      return session;
    },
    [persistenceEnabled]
  );

  const signOut = useCallback(async () => {
    await clearRemoteSession();
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, persistenceEnabled, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
