# WorkPulse

**Don't just find jobs. Know which ones are worth applying to.**

Search less. Understand more. Apply smarter.

| | |
|---|---|
| **Live App** | [https://workpulse-delta-eight.vercel.app](https://workpulse-delta-eight.vercel.app) |
| **Stack** | Next.js 16 · TypeScript · Tailwind CSS · OpenAI · Adzuna |
| **Persistence** | Browser localStorage (no database required) |

---

## Problem Statement

Job seekers face thousands of listings every day, but traditional job boards offer **volume without insight**. Candidates cannot easily answer:

- Which jobs actually match their skills and experience?
- *Why* they match or don't match a specific role?
- What skills they're missing and how in-demand those skills are?
- Which applications are worth prioritizing?
- How to tailor a resume truthfully for a specific job?

Existing tools either show generic match percentages, push auto-apply bots, or give resume advice disconnected from the candidate's real profile. The result: wasted applications, missed opportunities, and no clear learning path.

---

## Solution

**WorkPulse** is an AI-powered personal career intelligence platform that turns job search from scrolling into decision-making.

| Step | What WorkPulse Does |
|------|---------------------|
| 1. **Profile** | Upload a resume (PDF, Word, or text) → AI extracts a structured professional profile |
| 2. **Discovery** | Search live IT jobs from **Adzuna** with freshness, location, and work-type filters |
| 3. **Matching** | Evidence-based match scores with categories: Excellent, Good, Stretch, Low |
| 4. **Explain** | "Why match?" breakdown — skills, experience, role, location |
| 5. **Skill gaps** | Per-job gap analysis with market demand from real retrieved listings |
| 6. **Learning** | 30-day personalized roadmap based on your gaps |
| 7. **Resume** | ATS optimization with **human approval** for every change (never fabricates experience) |
| 8. **Applications** | Save jobs, track status (Saved → Applied → Interview → Rejected), prep materials |

### What makes WorkPulse different

| Job Boards | WorkPulse |
|------------|-----------|
| Show all jobs | Show jobs worth *your* time |
| Generic filters | AI match with explanations |
| No skill analysis | Skill gaps + market demand |
| One-size resume | Job-specific ATS optimization |
| Auto-apply bots | Human-in-the-loop, user-controlled |

### Key features

- AI profile extraction for any IT role
- Live job search via **Adzuna API** (India, UK, US)
- Match engine with transparent score breakdown
- Market skill intelligence from actual job listings
- Save jobs and track applications in one place
- Light / dark theme
- Compare external jobs by pasting any job description

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **UI** | Tailwind CSS v4, Lucide icons |
| **Validation** | Zod |
| **AI** | OpenAI API (optional — rule-based fallbacks when unset) |
| **Jobs API** | [Adzuna](https://developer.adzuna.com/) — live job listings |
| **Resume parsing** | pdf-parse, mammoth, word-extractor |
| **Persistence** | Browser localStorage (hackathon default) |
| **Cloud auth/sync** | Supabase (optional) |
| **Testing** | Vitest |
| **Deployment** | Vercel |

### AI modules

| Module | Purpose |
|--------|---------|
| `parseResume()` | Extract structured profile from resume |
| `suggestRoles()` | Recommend suitable IT career roles |
| `calculateMatch()` | Evidence-based job matching |
| `analyzeSkillGap()` | Per-job skill gap analysis |
| `analyzeMarketSkills()` | Demand from retrieved listings |
| `createLearningPlan()` | 30-day personalized roadmap |
| `optimizeResume()` | ATS keyword optimization |
| `generateCoverLetter()` | Application package generation |

All AI outputs are validated with Zod schemas.

---

## How to Run

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
cd hackathon/workpulse
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ADZUNA_APP_ID` | **Yes** | Adzuna App ID ([developer portal](https://developer.adzuna.com/)) |
| `ADZUNA_APP_KEY` | **Yes** | Adzuna App Key |
| `ADZUNA_COUNTRY` | **Yes** | Country code: `in`, `us`, `gb`, etc. |
| `OPENAI_API_KEY` | No | Enables full AI features (rule-based logic works without it) |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Enables cloud auth + sync |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key |

> **Job search requires Adzuna credentials.** Set `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and `ADZUNA_COUNTRY` in `.env.local` for local development and in the Vercel project dashboard for production.

### 3. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Other commands

```bash
npm run build      # Production build
npm run start      # Run production server
npm run test       # Run Vitest tests
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

### 5. Deploy to Vercel

```bash
npx vercel deploy --prod
```

Set `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and `ADZUNA_COUNTRY` in the Vercel project dashboard (already configured on production).

---

## Live Application

**https://workpulse-delta-eight.vercel.app**

Alternate URL: https://workpulse-sakshi-khandelwal.vercel.app

### Walkthrough (full user journey)

Follow this path on the [live app](https://workpulse-delta-eight.vercel.app) — screenshots for each step are below.

1. **Sign in** — enter email + first name → Continue  
2. **My Profile → Upload** — upload your resume (PDF, Word, or `.txt`)  
3. **Confirm** — review extracted skills, experience, and summary  
4. **Roles** — pick a recommended career role from your resume  
5. **Preferences** — set location & remote preference → **Find Jobs**  
6. **Job Discovery** — apply filters (freshness, location, work type) → **Search Jobs**  
7. **Save jobs** — bookmark listings worth applying to  
8. **Job detail** — check matched vs missing skills and match score breakdown  
9. **Learning Recommendations** — open curated Docs & Video links for skill gaps  
10. **Optimize Resume** — review ATS estimate and line-by-line suggestions  
11. **Market Intelligence** — skill demand from your search + priority gaps  
12. **Career Plan** — 30-day learning roadmap on the Skills page  
13. **Applications** — track Saved → Applied → Interview; dismiss or remove jobs  
14. **Compare External Job** *(bonus)* — paste any job URL/description for instant match analysis  

See [docs/SCREENSHOTS.md](./docs/SCREENSHOTS.md) for the complete screenshot index.

### Authentication note

- **Current Vercel deploy:** Email + optional first name only. No password. Data stored in your browser.
- **Supabase mode:** Password field appears automatically when Supabase env vars are configured. Passwords are stored by Supabase Auth — not in this app's database.

---

## Screenshots

Full walkthrough with a real resume upload. See [docs/SCREENSHOTS.md](./docs/SCREENSHOTS.md) for step descriptions.

### 1. Sign in

![Sign in with email](./docs/screenshots/01-signin.png)

### 2. Upload resume (My Profile)

![Upload resume on My Profile](./docs/screenshots/02-profile-upload.png)

### 3. Confirm extracted profile

![Confirm profile — review skills and experience](./docs/screenshots/03-profile-confirm.png)

### 4. Select career role

![Role suggestions based on resume](./docs/screenshots/04-profile-roles.png)

### 5. Set career preferences

![Career preferences — location and remote](./docs/screenshots/05-profile-preferences.png)

### 6. Search jobs with filters

![Job discovery — freshness, location, work type filters](./docs/screenshots/06-jobs-filters.png)

### 7. Save jobs from results

![Job listings with Save button and match scores](./docs/screenshots/07-jobs-save.png)

### 8. Job detail — skills match

![Job detail — matched and missing skills](./docs/screenshots/08-job-detail-skills.png)

### 9. Match score breakdown

![Why 77% match — skills, role, experience, location](./docs/screenshots/09-job-match-breakdown.png)

### 10. Learning recommendations

![Learning resources — docs and videos for skill gaps](./docs/screenshots/10-job-learning-recommendations.png)

### 11. Resume optimization overview

![ATS compatibility estimate — before and after](./docs/screenshots/11-resume-optimize-overview.png)

### 12. Resume optimization suggestions

![Line-by-line resume suggestions and skill gaps](./docs/screenshots/12-resume-optimize-suggestions.png)

### 13. Market Intelligence — skill demand

![Market skill demand chart and career readiness](./docs/screenshots/13-market-intelligence-demand.png)

### 14. Market Intelligence — priority gaps

![Strongest market opportunity and priority skill gaps](./docs/screenshots/14-market-intelligence-gaps.png)

### 15. 30-day career plan

![30-day career improvement plan](./docs/screenshots/15-career-plan.png)

### 16. Applications — saved jobs

![Applications tracker — saved jobs with match scores](./docs/screenshots/16-applications-saved.png)

### 17. Applications — status tracking

![Applications — Applied and Interview stages](./docs/screenshots/17-applications-status.png)

### 18. Compare external job (paste description)

![Compare external job — paste from LinkedIn or company site](./docs/screenshots/18-compare-external-job.png)

### 19. Compare external job — match results

![External job match analysis — 68% stretch opportunity](./docs/screenshots/19-compare-external-results.png)

---

## Project structure

```
hackathon/workpulse/
├── docs/
│   ├── screenshots/       # README screenshots
│   └── SCREENSHOTS.md     # Screenshot guide
├── scripts/
│   └── capture-screenshots.mjs
├── src/
│   ├── app/               # Pages & API routes
│   ├── components/        # UI, layout, providers
│   ├── lib/               # AI, jobs, matching, persistence
│   └── types/             # TypeScript types
├── FLOW.md                # Mermaid architecture diagrams
└── .env.example
```

See [FLOW.md](./FLOW.md) for end-to-end user flow and architecture diagrams.

---

## Architecture highlights

- **Job ingestion** — `AdzunaJobSource` fetches live listings; freshness filters apply client-side on retrieved results
- **Match engine** — Weighted scoring: skills (35%), role (25%), experience (20%), location (10%), mandatory skills (10%)
- **Human-in-the-loop** — User confirms profile, approves every resume change, applies manually on company sites
- **CRISP persistence** — Centralized localStorage service with schema versioning and session reset

---

## Limitations (hackathon scope)

- Profile and saved jobs stored in browser localStorage — no cross-device sync unless Supabase is configured
- No LinkedIn/Indeed scraping (by design)
- No automatic job application submission
- ATS scores are estimates, not exact ATS engine results
- Job freshness depends on Adzuna provider data

---

## Responsible AI

- Never fabricates candidate experience
- Never fabricates salary or job URLs
- User confirms profile before matching
- User approves every resume modification
- User controls all applications

---

## License

MIT License — Open source for hackathon and community use.

---

**Job boards tell you what jobs exist. WorkPulse tells you which jobs matter to YOU.**
