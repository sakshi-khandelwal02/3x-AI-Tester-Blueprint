"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Target,
  ClipboardPaste,
  User,
  FileText,
  Radar,
  LogOut,
  Menu,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { useApp } from "@/components/providers/app-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getUserFirstName } from "@/lib/user/displayName";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase, jobsOnly: true },
  { href: "/jobs/compare", label: "Compare Job", icon: ClipboardPaste, exact: true },
  { href: "/skills", label: "Market Intelligence", icon: TrendingUp, exact: true },
  { href: "/profile?step=upload", label: "My Profile", icon: User, exact: true },
  { href: "/applications", label: "Applications", icon: FileText, exact: true },
];

function isNavActive(pathname: string, item: (typeof navItems)[0]): boolean {
  if (item.href.startsWith("/profile")) {
    return pathname === "/profile" || pathname.startsWith("/profile");
  }
  if (item.href === "/jobs/compare") return pathname === "/jobs/compare";
  if (item.jobsOnly) {
    return (
      pathname === "/jobs" ||
      (pathname.startsWith("/jobs/") && pathname !== "/jobs/compare")
    );
  }
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const { href, label, icon: Icon } = item;
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "border border-[var(--accent)]/30 bg-[var(--accent-bg-active)] text-[var(--accent-text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const router = useRouter();
  const { state, resetDemo } = useApp();
  const { user, signOut } = useAuth();
  const firstName = getUserFirstName(state.profile, user?.firstName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    router.push("/signin");
  };

  const handleResetDemo = async () => {
    await resetDemo();
    await signOut();
    setShowResetConfirm(false);
    onClose?.();
    router.push("/signin");
  };

  const panel = (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg">
          <Radar className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">WorkPulse</h1>
          <p className="text-xs text-[var(--text-subtle)]">AI Career Intelligence</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="md:hidden rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {user && (
        <div className="mx-4 mt-3 rounded-lg bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
          Signed in as{" "}
          <span className="font-medium text-[var(--accent-text)]">{firstName}</span>
          <div className="mt-0.5 truncate text-[10px] text-[var(--text-subtle)]">{user.email}</div>
        </div>
      )}

      <SidebarNav onNavigate={onClose} />

      <div className="border-t border-[var(--border)] space-y-3 p-4">
        <ThemeToggle className="w-full justify-center gap-2" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2 text-[var(--text-muted)]"
          onClick={() => setShowResetConfirm(true)}
        >
          <RotateCcw className="h-4 w-4" /> Reset demo
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-[var(--text-muted)]" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Target className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span>Search less. Understand more.</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset demo?"
        description="Clears your profile, resume analysis, job results, and preferences from this browser. Your sign-in session will also be cleared. Theme preference is kept."
        confirmLabel="Reset demo"
        onConfirm={handleResetDemo}
        onCancel={() => setShowResetConfirm(false)}
      />
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] backdrop-blur-xl md:flex">
        {panel}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu overlay" onClick={onClose} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] shadow-xl">
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGate>
      <div
        className="min-h-screen"
        style={{
          background: `linear-gradient(to bottom right, var(--bg-page-gradient-from), var(--bg-page-gradient-via), var(--bg-page-gradient-to))`,
        }}
      >
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="min-h-screen md:ml-64">
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/95 px-4 py-3 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-[var(--text-primary)]">WorkPulse</span>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
