# WorkPulse — Screenshot Guide

Screenshots from a full demo walkthrough with a real resume (`Sakshi_Khandelwal_Resume.pdf`). They follow the exact user journey documented in the README.

**Live demo:** https://workpulse-delta-eight.vercel.app

---

## End-to-end demo flow

| Step | File | Screen | Action |
|------|------|--------|--------|
| 1 | `01-signin.png` | Sign in | Enter email + first name → **Continue** |
| 2 | `02-profile-upload.png` | My Profile → Upload | Upload PDF/Word resume (or Use Demo Profile) |
| 3 | `03-profile-confirm.png` | My Profile → Confirm | Review extracted name, role, skills → **Confirm & View Roles** |
| 4 | `04-profile-roles.png` | My Profile → Roles | Pick a recommended role (e.g. Senior Quality Automation Specialist) |
| 5 | `05-profile-preferences.png` | My Profile → Preferences | Set target role, location, remote preference → **Find Jobs** |
| 6 | `06-jobs-filters.png` | Job Discovery | Apply freshness, location, and work-type filters → **Search Jobs** |
| 7 | `07-jobs-save.png` | Job Discovery | Review match scores → click **Save** on jobs worth tracking |
| 8 | `08-job-detail-skills.png` | Job detail | Open a job → see matched vs missing skills |
| 9 | `09-job-match-breakdown.png` | Job detail | Review **Why 77% match?** score breakdown |
| 10 | `10-job-learning-recommendations.png` | Job detail | Scroll to **Learning Recommendations** → open Docs/Video links |
| 11 | `11-resume-optimize-overview.png` | Resume Optimization | Click **Optimize Resume** → see ATS estimate (before/after) |
| 12 | `12-resume-optimize-suggestions.png` | Resume Optimization | Review line-by-line suggestions + skill gaps to learn first |
| 13 | `13-market-intelligence-demand.png` | Market Intelligence | View skill demand chart from retrieved jobs + career readiness |
| 14 | `14-market-intelligence-gaps.png` | Market Intelligence | See strongest opportunity + priority skill gaps |
| 15 | `15-career-plan.png` | Skills (Career Plan) | 30-day improvement plan based on market gaps |
| 16 | `16-applications-saved.png` | Applications → Saved | Jobs saved from discovery with match scores |
| 17 | `17-applications-status.png` | Applications → Applied / Interview | Mark **Applied**, **Interview**, **Rejected**, or **Dismiss** |
| 18 | `18-compare-external-job.png` | Compare External Job | Paste a job from LinkedIn or company site |
| 19 | `19-compare-external-results.png` | Compare External Job | Instant match analysis against your resume |

---

## Step-by-step (for judges)

### 1. Sign in
Open the [live demo](https://workpulse-delta-eight.vercel.app) → **Sign in & Upload Resume** → enter any email (e.g. `sakshi@gmail.com`) → **Continue**.

### 2–5. Build your profile
**My Profile** wizard (4 steps):
1. **Upload** — drag & drop resume
2. **Confirm** — verify AI-extracted skills and experience
3. **Roles** — select best-fit career role
4. **Preferences** — set location/remote → **Find Jobs**

### 6–7. Discover & save jobs
**Jobs** → set filters (e.g. Last 6 Hours) → **Search Jobs** → **Save** promising listings.

### 8–10. Deep-dive a job
Click any job → review skills match, score breakdown, and **Learning Recommendations** (curated docs & videos).

### 11–12. Optimize resume
**Optimize Resume** → review ATS compatibility estimate → copy approved suggestions (never auto-applies changes).

### 13–15. Market intelligence & career plan
**Market Intelligence** → skill demand from your search results → **Skills** page for 30-day learning roadmap.

### 16–17. Track applications
**Applications** → manage pipeline: Saved → Applied → Interview → Rejected. Dismiss or remove jobs anytime.

### 18–19. Compare external jobs (bonus)
**Compare Job** → paste any job description → get the same match analysis as discovered jobs.

---

## File inventory

All screenshots live in `docs/screenshots/`:

```
01-signin.png
02-profile-upload.png
03-profile-confirm.png
04-profile-roles.png
05-profile-preferences.png
06-jobs-filters.png
07-jobs-save.png
08-job-detail-skills.png
09-job-match-breakdown.png
10-job-learning-recommendations.png
11-resume-optimize-overview.png
12-resume-optimize-suggestions.png
13-market-intelligence-demand.png
14-market-intelligence-gaps.png
15-career-plan.png
16-applications-saved.png
17-applications-status.png
18-compare-external-job.png
19-compare-external-results.png
```

---

## Notes for hackathon reviewers

- **No database required** — profile, jobs, and saved applications persist in browser `localStorage`
- **Password optional** — only shown when Supabase env vars are configured
- **Demo jobs** — 23 built-in listings when Adzuna API is unavailable; live Adzuna on Vercel when configured
- **AI optional** — rule-based fallbacks work without `OPENAI_API_KEY`
- **Human-in-the-loop** — user confirms profile, approves resume changes, applies manually on company sites

---

## Updating screenshots

Replace PNGs in `docs/screenshots/` after re-running the demo flow, or capture sign-in automatically:

```bash
npm install --no-save playwright@1.49.0
npx playwright install chromium
node scripts/capture-screenshots.mjs
```

Manual screenshots from production:

```bash
SCREENSHOT_BASE_URL=https://workpulse-delta-eight.vercel.app node scripts/capture-screenshots.mjs
```
