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

The login quick-pick buttons show **government** and **citizen1** only; **citizen2**
and **citizen3** are listed on the form and work with the same password.

Fresh installs start with **empty reports**. On the **login page**, use
**Generate samples** to load nine curated demo tickets, or **Reset demo** to
clear all reports.



## Meet Beacon

Beacon is the in-app assistant. It does three jobs, all server-side:

**1. Citizen intake chat** (`POST /api/beacon/chat`)
A step-by-step chat flow with inline map, photo, and review widgets. It returns
structured JSON and handles special cases instead of filing junk:

- **Emergency** (fire, injury, crime in progress) → does not file; surfaces a
  prominent "Call 911".
- **Out of scope** (neighbor disputes, private property, police matters) →
  redirects with guidance on who to contact instead.
- **Too vague** → asks one targeted follow-up.
- **Spam / nonsense** → politely voids with an explanation.

**2. Report formalization** (`POST /api/beacon/formalize`)
Polishes resident wording into municipal work-order language before filing.

**3. Report logic** (`POST /api/beacon/file`)

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
    report/                  Citizen reporting (BeaconIntake + manual form)
    track/  track/[id]/      Status tracking (by ID, email, or phone)
    resolved/                Public transparency feed of resolved issues
    account/                 Signed-in citizen's reports
    gov/                     Government operations dashboard (map + list + filters)
    error.tsx, global-error.tsx, not-found.tsx
    api/beacon/chat/         Beacon intake (server-side OpenAI)
    api/beacon/formalize/    Municipal language polish
    api/beacon/file/         Beacon dedup/merge decision (server-side OpenAI)
  components/
    BeaconIntake.tsx         Chat-first intake with inline widgets
    gov/                     Dashboard (FilterPanel, FormalReportModal, IssueTable)
    CollapsibleFilterBar.tsx Shared expandable filter header
    MultiSelectDropdown.tsx  Checkbox multi-select dropdown
    ResolvedFilterPanel.tsx  Resolved issues page filters
    map/                     LocationPicker, LocationPickerDynamic, ReportMap
    …                        Shared UI (Logo, StatusPill, Severity, etc.)
  lib/
    types.ts                 Domain model
    store.ts                 Data layer (localStorage + useSyncExternalStore)
    seed.ts                  Demo accounts, city config, report builder
    seed-helpers.ts            Relative timestamps for sample reports
    sample-reports.ts          Curated demo reports (login "Generate samples")
    beacon-logic.ts          Severity weighting + heuristic fallback brain
    formalize-report.ts      Client helper for formalization API
    file-report.ts           Shared filing pipeline (dedup + persist)
    openai.ts                Server-only OpenAI client
    filters.ts               Gov dashboard filtering + sorting
    resolved-filters.ts      Resolved feed filtering
    meta.ts / utils.ts       Presentation metadata + helpers
```

### Data layer

The prototype persists to **localStorage** so the demo survives a refresh. The
store exposes a DB-shaped action surface (`createReport`, `mergeSubmission`,
`updateStatus`, `addInternalNote`, …) — swapping localStorage for real API calls
would not change any component. Use **Reset demo** or **Generate samples** on
the login page to reset or reload demo state.

---

## Accessibility

WCAG AA color contrast, full keyboard navigation with visible focus rings,
semantic HTML + ARIA (labels on inputs, the map, the chat, status pills),
`aria-live` announcements for Beacon's replies and submission confirmations, and
`prefers-reduced-motion` support throughout.
