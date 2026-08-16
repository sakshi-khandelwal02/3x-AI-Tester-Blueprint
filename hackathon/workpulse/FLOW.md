# WorkPulse — Application Flow

> **Tagline:** Don't just find jobs. Know which ones are worth applying to.

## End-to-End User Flow

```mermaid
flowchart TD
    A[👤 User Opens WorkPulse] --> B[📄 Upload Resume PDF]
    B --> C[🤖 AI Profile Extraction]
    C --> D{User Confirms Profile?}
    D -->|No| C
    D -->|Yes| E[🎯 AI Role Suggestions]
    E --> F[⚙️ Set Career Preferences]
    F --> G[🔍 Job Discovery]
    
    G --> H{API Available?}
    H -->|Adzuna API| I[Live Job Data]
    H -->|No / Failed| J[Demo Mode - MockJobSource]
    
    I --> K[Job Normalization]
    J --> K
    
    K --> L[📊 Job Relevance Filter]
    L --> M[🧮 Candidate-Job Matching]
    M --> N[📋 Match Categories]
    
    N --> O[🔥 Excellent Match]
    N --> P[🟢 Good Match]
    N --> Q[🟡 Stretch Opportunity]
    N --> R[🔴 Low Match]
    
    O --> S[📖 Why Match Explanation]
    P --> S
    Q --> S
    
    S --> T[⚠️ Skill Gap Analysis]
    T --> U[📈 Market Demand Analysis]
    U --> V[📚 Personalized Learning Plan]
    
    S --> W[📝 ATS Resume Optimization]
    W --> X[👁️ User Approves Each Change]
    X --> Y[✅ Tailored Resume Generated]
    Y --> Z[📦 Application Package]
    Z --> AA[🔗 Open Original Job - User Applies]
    
    style J fill:#f97316,color:#fff
    style O fill:#ef4444,color:#fff
    style P fill:#22c55e,color:#fff
    style Q fill:#eab308,color:#000
    style Z fill:#6366f1,color:#fff
```

## Demo Flow (3-Minute Walkthrough)

```mermaid
sequenceDiagram
    participant U as User
    participant CR as WorkPulse
    participant AI as AI Engine
    participant JS as Job Source

    U->>CR: Upload resume (or demo profile)
    CR->>AI: parseResume()
    AI-->>CR: Structured profile
    U->>CR: Confirm profile
    CR->>AI: suggestRoles()
    AI-->>U: Backend Engineer 94%, Platform Engineer 81%...
    U->>CR: Select "Backend Engineer"
    U->>CR: Filter: Last 2 hours
    CR->>JS: searchJobs()
    JS-->>CR: 23 opportunities (7 strong matches)
    CR->>AI: calculateMatch() for each job
    U->>CR: Open 94% match job
    CR-->>U: Match explanation + skill gaps
    CR->>AI: analyzeMarketSkills()
    AI-->>U: Kubernetes in 43% of jobs
    CR->>AI: createLearningPlan()
    AI-->>U: 30-day improvement plan
    U->>CR: Optimize Resume
    CR->>AI: optimizeResume()
    AI-->>U: ATS 72% → 91% (estimated)
    U->>CR: Approve 4 changes
    CR->>AI: generateApplicationPackage()
    AI-->>U: Resume + Cover Letter + Checklist
    U->>CR: Open Original Job → Apply manually
```

## Architecture Overview

```mermaid
flowchart LR
    subgraph Frontend["Next.js Frontend"]
        UI[Dashboard / Jobs / Profile / Skills / Resume]
        LS[(localStorage)]
    end

    subgraph API["API Routes"]
        R1[/api/resume/parse]
        R2[/api/jobs/search]
        R3[/api/market/analyze]
        R4[/api/resume/optimize]
    end

    subgraph AI["AI Modules"]
        A1[parseResume]
        A2[suggestRoles]
        A3[calculateMatch]
        A4[analyzeMarketSkills]
        A5[optimizeResume]
    end

    subgraph Jobs["Job Sources"]
        ADZ[AdzunaJobSource]
        MOCK[MockJobSource]
    end

    UI --> LS
    UI --> API
    API --> AI
    API --> Jobs
    ADZ -.->|fallback| MOCK
```

## Match Decision Logic

```mermaid
flowchart TD
    A[Job Retrieved] --> B[Role Relevance >= 30%?]
    B -->|No| Z[Filter Out]
    B -->|Yes| C[Calculate Match Score]
    C --> D{Score >= 85?}
    D -->|Yes| E[🔥 EXCELLENT - APPLY NOW]
    D -->|No| F{Score >= 70?}
    F -->|Yes| G[🟢 GOOD - PREPARE THEN APPLY]
    F -->|No| H{Score >= 50?}
    H -->|Yes| I[🟡 STRETCH - CONSIDER]
    H -->|No| J[🔴 LOW - SKIP]
```

## Data Storage

| Data | Storage | Notes |
|------|---------|-------|
| Profile, preferences | localStorage | Client-side, no DB required |
| Jobs, matches | Session state | Refreshed on search |
| Saved jobs, applications | localStorage | Persists across sessions |
| Demo jobs | Seeded in code | 23 realistic IT jobs |

> **Note:** No external database is required for the MVP. Optional Supabase/Postgres can be added later for multi-device sync.

## Responsible AI Checkpoints

1. **Profile extraction** → User must confirm before use
2. **Resume changes** → Each change requires individual approval
3. **Missing skills** → Never added as fake experience
4. **ATS scores** → Clearly labeled as AI estimates
5. **Demo mode** → Clearly labeled "DEMO DATA" in UI
6. **Applications** → User opens original job; no auto-submission
