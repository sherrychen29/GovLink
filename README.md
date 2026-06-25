# GovLink — Civic Reporting Platform

GovLink is a two-sided web platform that connects city residents with their
local government for **non-emergency** civic issues — potholes, broken
streetlights, water leaks, unsafe park equipment, and more. Residents report
problems and track them to resolution; city staff triage and resolve them on a
live operations dashboard.

Built for FutureHacks. Stack: **Next.js (App Router) · TypeScript · Tailwind CSS
· Leaflet/OpenStreetMap · OpenAI**.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then paste your OpenAI key into .env.local
npm run dev                  # http://localhost:3000
```

> **Beacon works with or without an OpenAI key.** If `OPENAI_API_KEY` is unset,
> Beacon automatically falls back to a built-in heuristic engine, so the demo is
> always functional. With a key set, the chat, severity judgement, and duplicate
> detection are powered by the model.

### Demo accounts (password `demo` for all)

| Username     | Role       | Lands on                |
| ------------ | ---------- | ----------------------- |
| `government` | Government | Operations dashboard    |
| `citizen1`   | Citizen    | Account → their reports |
| `citizen2`   | Citizen    | "                       |
| `citizen3`   | Citizen    | "                       |

The app ships with realistic seeded reports — including a **corroborated/merged
set** (a Cedar St pothole reported by 3 residents) and a **rejected-as-resolved**
example — so both sides look alive on first load.

---

## Security — the OpenAI key

- The key is read **only** from `OPENAI_API_KEY` in server-side API routes
  (`src/app/api/beacon/**`). It is never imported into client code or sent to the
  browser.
- `.env.local` is gitignored. `.env.example` holds a placeholder.
- ⚠️ If you pasted a real key during setup/chat, **rotate it** — treat any shared
  key as compromised.

---

## Meet Beacon

Beacon is the in-app assistant. It does two jobs, both server-side:

**1. Citizen intake chat** (`POST /api/beacon/chat`)
A calm clarifying-question flow that assembles a standardized report. It returns
structured JSON and handles special cases instead of filing junk:

- **Emergency** (fire, injury, crime in progress) → does not file; surfaces a
  prominent "Call 911".
- **Too vague** → asks one targeted follow-up.
- **Spam / nonsense** → politely voids with an explanation.

**2. Report logic** (`POST /api/beacon/file`)

- **Severity (1–10)** = Beacon's judgement of seriousness, weighted upward by the
  number of corroborating reports.
- **Duplicate detection & merging** = on filing, Beacon compares the new report
  against nearby open reports (category + proximity + description) and either
  files new or **merges** into the existing case, recomputing severity upward and
  recording each resident submission.

---

## How it's organized

```
src/
  app/
    page.tsx                 Landing
    login/                   Login + optional citizen registration
    report/                  Citizen reporting flow (Beacon + live report panel)
    track/  track/[id]/      Status tracking (by ID, email, or phone)
    resolved/                Public transparency feed of resolved issues
    account/                 Signed-in citizen's reports
    gov/                     Government operations dashboard (map + list + filters)
    api/beacon/chat/         Beacon intake (server-side OpenAI)
    api/beacon/file/         Beacon dedup/merge decision (server-side OpenAI)
  components/                UI: Logo, StatusPill, Severity, maps, BeaconChat, gov/*
  lib/
    types.ts                 Domain model
    store.ts                 Data layer (localStorage + useSyncExternalStore)
    seed.ts                  Seeded reports + demo accounts
    beacon-logic.ts          Severity weighting + heuristic fallback brain
    openai.ts                Server-only OpenAI client
    filters.ts               Dashboard filtering + sorting
    meta.ts / utils.ts       Presentation metadata + helpers
```

### Data layer

The prototype persists to **localStorage** so the demo survives a refresh. The
store exposes a DB-shaped action surface (`createReport`, `mergeSubmission`,
`updateStatus`, `addInternalNote`, …) — swapping localStorage for real API calls
would not change any component. Use **Reset demo data** in the footer to restore
the seeded state.

---

## Accessibility

WCAG AA color contrast, full keyboard navigation with visible focus rings,
semantic HTML + ARIA (labels on inputs, the map, the chat, status pills),
`aria-live` announcements for Beacon's replies and submission confirmations, and
`prefers-reduced-motion` support throughout.
