"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/sidebar";
import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEMO_PROFILE_TEXT } from "@/lib/jobs/mock-data";
import { mergeProfileSkillFields, getDisplaySkills } from "@/lib/skills/profileSkills";
import type { CareerPreferences, ProfessionalProfile } from "@/types";
import { Upload, CheckCircle, Sparkles, Loader2, FileText, RefreshCw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getResumeUploadEndpoint } from "@/lib/persistence/sync";
import { cn } from "@/lib/utils";

type ProfileStep = "upload" | "confirm" | "roles" | "preferences";

const STEPS: { id: ProfileStep; label: string; number: number }[] = [
  { id: "upload", label: "Upload", number: 1 },
  { id: "confirm", label: "Confirm", number: 2 },
  { id: "roles", label: "Roles", number: 3 },
  { id: "preferences", label: "Preferences", number: 4 },
];

function parseStepParam(value: string | null): ProfileStep | null {
  if (value === "upload" || value === "confirm" || value === "roles" || value === "preferences") {
    return value;
  }
  return null;
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setProfile, setPreferences, setRoleSuggestions: saveRoleSuggestions, applyNewResume, removeResume } = useApp();

  const [step, setStep] = useState<ProfileStep>("upload");
  const [loading, setLoading] = useState(false);
  const [profile, setLocalProfile] = useState<ProfessionalProfile | null>(state.profile || null);
  const [roleSuggestions, setRoleSuggestions] = useState(state.roleSuggestions || []);
  const [detectedTrack, setDetectedTrack] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState<string | null>(null);
  const [experienceLabel, setExperienceLabel] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(state.preferences?.targetRole || "");
  const [aiPowered, setAiPowered] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [prefs, setPrefs] = useState<CareerPreferences>(
    state.preferences || {
      desiredJobTitle: "",
      alternativeJobTitles: [],
      preferredLocations: ["Remote"],
      remotePreference: "REMOTE",
      employmentType: "FULL_TIME",
      preferredIndustries: [],
      technologiesOfInterest: [],
      companiesOfInterest: [],
      companiesToExclude: [],
    }
  );

  // Default to Upload (step 1); honor ?step= for deep links (Replace, My Profile)
  useEffect(() => {
    const requested = parseStepParam(searchParams.get("step"));
    if (requested) {
      setStep(requested);
      return;
    }
    setStep("upload");
  }, [searchParams]);

  // Sync from global state when navigating back — never merge with a different resume
  useEffect(() => {
    if (!state.profile) {
      setLocalProfile(null);
      return;
    }
    if (!profile || profile.id !== state.profile.id) {
      setLocalProfile(state.profile);
      return;
    }
    if (state.profile.updatedAt > profile.updatedAt) {
      setLocalProfile(state.profile);
    }
    if (state.roleSuggestions?.length) setRoleSuggestions(state.roleSuggestions);
    if (state.preferences) {
      setPrefs(state.preferences);
      setSelectedRole(state.preferences.targetRole || state.preferences.desiredJobTitle || "");
    }
  }, [state.profile, state.roleSuggestions, state.preferences]);

  const canAccessStep = useCallback(
    (target: ProfileStep): boolean => {
      switch (target) {
        case "upload":
          return true;
        case "confirm":
          return Boolean(profile);
        case "roles":
          return Boolean(profile?.confirmed || roleSuggestions.length > 0);
        case "preferences":
          return Boolean(profile?.confirmed);
        default:
          return false;
      }
    },
    [profile, roleSuggestions.length]
  );

  const goToStep = (target: ProfileStep) => {
    if (!canAccessStep(target)) return;
    // Persist local profile edits when leaving confirm
    if (step === "confirm" && profile) {
      setProfile({ ...profile, updatedAt: new Date().toISOString() });
    }
    setStep(target);
  };

  const handleRemoveResume = () => {
    removeResume();
    setLocalProfile(null);
    setRoleSuggestions([]);
    saveRoleSuggestions([]);
    setSelectedRole("");
    setUploadError(null);
    setShowRemoveConfirm(false);
    setStep("upload");
  };

  const applyParsedProfile = (parsed: ProfessionalProfile, ai: boolean, fileName: string, fileType?: string) => {
    const normalized = mergeProfileSkillFields({ ...parsed, confirmed: false });
    applyNewResume(
      {
        fileName,
        uploadedAt: new Date().toISOString(),
        fileType,
      },
      normalized
    );
    setLocalProfile(normalized);
    setAiPowered(ai);
    setUploadError(null);
    setRoleSuggestions([]);
    saveRoleSuggestions([]);
    setStep("confirm");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(getResumeUploadEndpoint(), { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setUploadError(data.error || "Failed to parse resume. Please try again.");
        return;
      }
      if (data.profile) {
        applyParsedProfile(
          data.profile,
          data.aiPowered,
          file.name,
          file.type || file.name.split(".").pop()
        );
      }
    } catch {
      setUploadError("Failed to parse resume. Please try again.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const loadDemoProfile = async () => {
    setLoading(true);
    setUploadError(null);
    try {
      const endpoint = getResumeUploadEndpoint();
      if (endpoint === "/api/resume/upload") {
        const formData = new FormData();
        formData.append("text", DEMO_PROFILE_TEXT);
        const res = await fetch(endpoint, { method: "POST", body: formData, credentials: "include" });
        const data = await res.json();
        if (data.profile) {
          applyParsedProfile(data.profile, data.aiPowered, "Demo_Backend_Engineer_Resume.txt", "text/plain");
        }
      } else {
        const res = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: DEMO_PROFILE_TEXT }),
        });
        const data = await res.json();
        if (data.profile) {
          applyParsedProfile(data.profile, data.aiPowered, "Demo_Backend_Engineer_Resume.txt", "text/plain");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleSuggestions = async (confirmedProfile: ProfessionalProfile) => {
    const res = await fetch("/api/roles/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: confirmedProfile }),
    });
    const data = await res.json();
    const suggestions = data.suggestions || [];
    setDetectedTrack(data.detectedTrack || null);
    setTrackLabel(data.trackLabel || null);
    setExperienceLabel(data.experienceLabel || null);
    setRoleSuggestions(suggestions);
    saveRoleSuggestions(suggestions);
    return suggestions;
  };

  const confirmProfile = async (andGoToRoles = true) => {
    if (!profile) return;
    const confirmed = mergeProfileSkillFields({
      ...profile,
      confirmed: true,
      updatedAt: new Date().toISOString(),
    });
    setLocalProfile(confirmed);
    setProfile(confirmed);
    setLoading(true);
    try {
      await fetchRoleSuggestions(confirmed);
      if (andGoToRoles) setStep("roles");
    } finally {
      setLoading(false);
    }
  };

  const saveProfileEdits = () => {
    if (!profile) return;
    const updated = { ...profile, updatedAt: new Date().toISOString() };
    setLocalProfile(updated);
    setProfile(updated);
  };

  const selectRole = (role: string) => {
    setSelectedRole(role);
    setPrefs((p) => ({ ...p, targetRole: role, desiredJobTitle: role }));
    setStep("preferences");
  };

  const savePreferences = () => {
    if (!profile) return;
    setPreferences({ ...prefs, targetRole: selectedRole || prefs.desiredJobTitle });
  };

  const saveAndContinue = () => {
    savePreferences();
    router.push("/jobs");
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Profile</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Upload your resume, confirm extracted data, and set career preferences. You can revisit any step anytime.
        </p>
      </div>

      {/* Clickable step tabs */}
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Profile setup steps">
        {STEPS.map(({ id, label, number }) => {
          const accessible = canAccessStep(id);
          const active = step === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => goToStep(id)}
              disabled={!accessible}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                active
                  ? "border border-[var(--accent)]/40 bg-[var(--accent-bg-active)] text-[var(--accent-text)]"
                  : accessible
                    ? "cursor-pointer border border-[var(--border-strong)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    : "cursor-not-allowed border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-subtle)]"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  active
                    ? "bg-[var(--accent)] text-white"
                    : accessible
                      ? "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                      : "bg-[var(--border)] text-[var(--text-subtle)]"
                )}
              >
                {number}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {step === "upload" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>
              PDF, Word (.doc, .docx), .txt — upload anytime to refresh your profile with updated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.resume && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">Current resume</div>
                      <div className="text-sm text-[var(--text-secondary)]">{state.resume.fileName}</div>
                      <div className="text-xs text-[var(--text-subtle)]">
                        Uploaded {format(new Date(state.resume.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                      {profile?.confirmed && (
                        <Badge variant="success" className="mt-2">Profile confirmed</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {profile?.confirmed && (
                      <Button variant="ghost" size="sm" onClick={() => goToStep("confirm")}>
                        Edit profile
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowRemoveConfirm(true)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)]/50 p-12 transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent-bg)]">
              <Upload className="mb-4 h-10 w-10 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {state.resume ? "Upload a new resume to replace current" : "Click to upload PDF or Word resume"}
              </span>
              <span className="mt-1 text-xs text-[var(--text-subtle)]">.pdf · .doc · .docx · .txt</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>

            {uploadError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing resume…
              </div>
            )}

            <Button variant="secondary" onClick={loadDemoProfile} disabled={loading} className="w-full">
              Use Demo Profile (Backend Engineer)
            </Button>

            {profile?.confirmed && (
              <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-2">
                <Button variant="outline" size="sm" onClick={() => goToStep("confirm")}>
                  Review profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToStep("roles")}>
                  View role suggestions
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToStep("preferences")}>
                  Edit preferences
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "confirm" && !profile && (
        <Card className="max-w-lg text-center">
          <CardContent className="p-10">
            <p className="mb-4 text-[var(--text-muted)]">Upload a resume first to review extracted profile data.</p>
            <Button onClick={() => setStep("upload")}>Go to Upload</Button>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Confirm Profile {aiPowered && <Badge variant="info">AI Extracted</Badge>}
            </CardTitle>
            <CardDescription>
              Review and edit extracted data. This is used for job matching and skill analysis.
              {state.resume && (
                <span className="block mt-1 text-xs text-[var(--text-subtle)]">
                  Source: {state.resume.fileName}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => setLocalProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Current Role</Label>
                <Input
                  value={profile.currentRole}
                  onChange={(e) => setLocalProfile({ ...profile, currentRole: e.target.value })}
                />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={profile.experienceYears}
                  onChange={(e) =>
                    setLocalProfile({ ...profile, experienceYears: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Professional Summary</Label>
              <Textarea
                value={profile.professionalSummary}
                onChange={(e) => setLocalProfile({ ...profile, professionalSummary: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Skills from your resume</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {getDisplaySkills(profile).map((skill) => (
                  <Badge key={skill} variant="info">{skill}</Badge>
                ))}
              </div>
              <Input
                className="mt-2"
                placeholder="Add skills comma-separated"
                onBlur={(e) => {
                  const newSkills = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  if (newSkills.length) {
                    setLocalProfile({
                      ...profile,
                      skills: [...new Set([...profile.skills, ...newSkills])],
                      updatedAt: new Date().toISOString(),
                    });
                    e.target.value = "";
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => confirmProfile(true)} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirm &amp; View Roles
              </Button>
              <Button variant="secondary" onClick={saveProfileEdits}>
                Save edits
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1">
                <Upload className="h-3 w-3" /> Re-upload resume
              </Button>
              <Button variant="danger" onClick={() => setShowRemoveConfirm(true)} className="gap-1">
                <Trash2 className="h-3 w-3" /> Remove resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "roles" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                Your Profile Could Match
              </CardTitle>
              <CardDescription>
                {trackLabel && experienceLabel
                  ? `Based on your resume — ${experienceLabel} · ${trackLabel}`
                  : trackLabel
                    ? `Based on your resume — ${trackLabel}`
                    : "Based on your uploaded resume — select a target role or skip"}
              </CardDescription>
            </div>
            {profile?.confirmed && (
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={async () => {
                  if (!profile) return;
                  setLoading(true);
                  try {
                    await fetchRoleSuggestions(profile);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="gap-1 shrink-0"
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {roleSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="mb-4 text-[var(--text-muted)]">
                  {profile?.confirmed
                    ? "No role suggestions yet. Refresh or confirm your profile first."
                    : "Confirm your profile to generate role suggestions."}
                </p>
                {profile?.confirmed ? (
                  <Button
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await fetchRoleSuggestions(profile);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Generate suggestions
                  </Button>
                ) : (
                  <Button onClick={() => goToStep("confirm")}>Go to Confirm</Button>
                )}
              </div>
            ) : (
              roleSuggestions.map((r, index) => {
                const fromResume =
                  profile?.currentRole &&
                  r.role.toLowerCase().includes(
                    profile.currentRole.toLowerCase().split(/\s+/).slice(-2).join(" ")
                  );
                const isTopMatch = index === 0 || fromResume;
                return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => selectRole(r.role)}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card-solid)] p-4 text-left transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {r.compatibility >= 85 ? "🔥" : r.compatibility >= 70 ? "🟢" : "🟡"} {r.role}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {fromResume && (
                        <Badge variant="info">On your resume</Badge>
                      )}
                      {isTopMatch && !fromResume && (
                        <Badge variant="info">Best match</Badge>
                      )}
                      <Badge variant="success">{r.compatibility}% compatibility</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{r.reasons[0]}</p>
                </button>
              );})
            )}
            {roleSuggestions.length > 0 && (
              <Button variant="outline" className="w-full mt-2" onClick={() => setStep("preferences")}>
                Skip — set preferences manually
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === "preferences" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Career Preferences</CardTitle>
            <CardDescription>Update anytime — changes apply to your next job search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Target Role</Label>
              <Input
                value={selectedRole || prefs.desiredJobTitle}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setPrefs({ ...prefs, desiredJobTitle: e.target.value, targetRole: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Preferred Locations</Label>
              <Input
                value={prefs.preferredLocations.join(", ")}
                onChange={(e) =>
                  setPrefs({ ...prefs, preferredLocations: e.target.value.split(",").map((s) => s.trim()) })
                }
              />
            </div>
            <div>
              <Label>Remote Preference</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)]"
                value={prefs.remotePreference}
                onChange={(e) =>
                  setPrefs({ ...prefs, remotePreference: e.target.value as CareerPreferences["remotePreference"] })
                }
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
                <option value="ANY">Any</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveAndContinue} className="gap-1">
                Find Jobs →
              </Button>
              <Button variant="secondary" onClick={savePreferences}>
                Save preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Do you want to remove the resume?"
        confirmLabel="Yes"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRemoveResume}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        </AppShell>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
