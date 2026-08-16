# WorkPulse — Screenshot Guide

This document describes each screenshot included in the README and how to regenerate them.

## Live demo

**Production URL:** https://workpulse-delta-eight.vercel.app

## Screenshots

| File | Page | Description |
|------|------|-------------|
| `01-home.png` | Landing (`/`) | Hero, value proposition, and feature cards |
| `02-signin.png` | Sign in (`/signin`) | Email-only demo auth (localStorage mode) |
| `03-profile.png` | Profile (`/profile`) | Resume upload and demo profile option |
| `04-dashboard.png` | Dashboard (`/dashboard`) | Career overview, match stats, resume summary |
| `05-jobs-discovery.png` | Jobs (`/jobs`) | Job search with freshness filters and match badges |
| `06-job-detail.png` | Job detail (`/jobs/[id]`) | Match score, Save button, skill gaps, learning resources |
| `07-applications.png` | Applications (`/applications`) | Saved jobs tracker (Saved → Applied → Interview) |
| `08-skills.png` | Skills (`/skills`) | Market skill demand and career readiness |

## Regenerate screenshots

From the project root:

```bash
npm install --no-save playwright@1.49.0
npx playwright install chromium
node scripts/capture-screenshots.mjs
```

Optional — capture from localhost:

```bash
npm run dev
SCREENSHOT_BASE_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
```

Screenshots are written to `docs/screenshots/`.

## Recommended demo flow (for judges)

1. Open the [live demo](https://workpulse-delta-eight.vercel.app)
2. Click **Sign in & Upload Resume** → enter any email → **Continue**
3. On Profile, click **Use Demo Profile (Backend Engineer)** → confirm
4. Go to **Jobs** → **Search Jobs** → open a high-match listing
5. Click **Save** → open **Applications** to track status
6. Open **Optimize Resume** on a saved job → approve changes
7. Visit **Skills** for market demand and learning roadmap

## Notes for hackathon reviewers

- **No database required** — profile, jobs, and saved applications persist in browser `localStorage`
- **Password optional** — only shown when Supabase env vars are configured
- **Live jobs** — Adzuna API on Vercel; falls back to 23 demo jobs if API unavailable
- **AI optional** — rule-based fallbacks work without `OPENAI_API_KEY`
