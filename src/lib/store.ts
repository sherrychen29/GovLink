"use client";

// ---------------------------------------------------------------------------
// The single client-side data layer for GovLink. Backed by localStorage so the
// demo survives a refresh, exposed through useSyncExternalStore so React stays
// in sync. The action surface (createReport / mergeSubmission / updateStatus …)
// is intentionally DB-shaped: swapping localStorage for fetch() calls to a real
// backend would not change any component.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from "react";
import type {
  Account,
  ContactInfo,
  InternalNote,
  MediaItem,
  Report,
  ReportLocation,
  ReportStatus,
  ServicePriority,
  Submission,
} from "./types";
import { clamp } from "./beacon-logic";
import { buildSeedReports, SEED_ACCOUNTS } from "./seed";
import { generateTicketId, uid } from "./utils";

const STORAGE_KEY = "govlink.state.v3";

interface GovLinkState {
  reports: Report[];
  accounts: Account[];
  currentUserId: string | null;
  hydrated: boolean;
}

const EMPTY_STATE: GovLinkState = {
  reports: [],
  accounts: [],
  currentUserId: null,
  hydrated: false,
};

let state: GovLinkState = EMPTY_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    const { reports, accounts, currentUserId } = state;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reports, accounts, currentUserId })
    );
  } catch {
    /* quota / private mode — keep working in-memory */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: Partial<GovLinkState>, write = true) {
  state = { ...state, ...next };
  if (write) persist();
  emit();
}

function ensureLoaded() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  let loaded: Partial<GovLinkState> | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = JSON.parse(raw);
  } catch {
    loaded = null;
  }
  if (loaded && Array.isArray(loaded.reports) && loaded.reports.length) {
    state = {
      reports: loaded.reports,
      accounts:
        loaded.accounts && loaded.accounts.length
          ? loaded.accounts
          : SEED_ACCOUNTS,
      currentUserId: loaded.currentUserId ?? null,
      hydrated: true,
    };
  } else {
    state = {
      reports: [],
      accounts: SEED_ACCOUNTS,
      currentUserId: null,
      hydrated: true,
    };
    persist();
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): GovLinkState {
  return state;
}

function getServerSnapshot(): GovLinkState {
  return EMPTY_STATE;
}

// --- Hooks -----------------------------------------------------------------

function useGovLink(): GovLinkState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useReports(): { reports: Report[]; hydrated: boolean } {
  const s = useGovLink();
  return { reports: s.reports, hydrated: s.hydrated };
}

export function useReport(id: string | null | undefined): {
  report: Report | undefined;
  hydrated: boolean;
} {
  const s = useGovLink();
  return {
    report: id ? s.reports.find((r) => r.id === id) : undefined,
    hydrated: s.hydrated,
  };
}

export function useCurrentUser(): {
  user: Account | null;
  hydrated: boolean;
} {
  const s = useGovLink();
  return {
    user: s.accounts.find((a) => a.id === s.currentUserId) ?? null,
    hydrated: s.hydrated,
  };
}

// --- Auth actions ----------------------------------------------------------

export function login(username: string, password: string): Account | null {
  ensureLoaded();
  const acc = state.accounts.find(
    (a) =>
      a.username.toLowerCase() === username.trim().toLowerCase() &&
      a.password === password
  );
  if (!acc) return null;
  setState({ currentUserId: acc.id });
  return acc;
}

export function logout() {
  setState({ currentUserId: null });
}

export function registerCitizen(input: {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  phone?: string;
}): { ok: true; account: Account } | { ok: false; error: string } {
  ensureLoaded();
  const exists = state.accounts.some(
    (a) => a.username.toLowerCase() === input.username.trim().toLowerCase()
  );
  if (exists) return { ok: false, error: "That username is already taken." };
  const account: Account = {
    id: uid("acc"),
    username: input.username.trim(),
    password: input.password,
    role: "citizen",
    displayName: input.displayName.trim() || input.username.trim(),
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
  };
  setState({
    accounts: [...state.accounts, account],
    currentUserId: account.id,
  });
  return { ok: true, account };
}

// --- Report queries --------------------------------------------------------

/** Open reports a new submission could corroborate (not resolved). */
export function openReports(): Report[] {
  ensureLoaded();
  return state.reports.filter((r) => r.status !== "resolved");
}

/** Lookup by ticket id, email, or phone — used by status tracking. */
export function findReports(query: string): Report[] {
  ensureLoaded();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return state.reports.filter((r) => {
    if (r.id.toLowerCase() === q) return true;
    return r.submissions.some(
      (s) =>
        s.contact?.email?.toLowerCase() === q ||
        s.contact?.phone?.replace(/\D/g, "") === q.replace(/\D/g, "")
    );
  });
}

// --- Report mutations ------------------------------------------------------

export interface NewReportInput {
  category: Report["category"];
  description: string;
  location: ReportLocation;
  media: MediaItem[];
  contact: ContactInfo;
  baseSeverity: number;
  noticedAt: string;
  reporterId?: string;
  formalTitle?: string;
  residentDescription?: string;
  servicePriority?: ServicePriority;
  chatLog?: Report["chatLog"];
}

export function createReport(input: NewReportInput): Report {
  ensureLoaded();
  const now = new Date().toISOString();
  const residentText = input.residentDescription ?? input.description;
  const submission: Submission = {
    id: uid("sub"),
    description: residentText,
    createdAt: now,
    contact: input.contact,
    chatLog: input.chatLog,
  };
  const report: Report = {
    id: generateTicketId(),
    formalTitle: input.formalTitle,
    description: input.description,
    residentDescription: residentText,
    servicePriority: input.servicePriority,
    category: input.category,
    location: input.location,
    media: input.media,
    severity: clamp(input.baseSeverity, 1, 10),
    baseSeverity: input.baseSeverity,
    noticedAt: input.noticedAt,
    createdAt: now,
    updatedAt: now,
    status: "sent",
    contact: input.contact,
    reporterId: input.reporterId,
    submissions: [submission],
    internalNotes: [],
    statusHistory: [{ status: "sent", at: now }],
    chatLog: input.chatLog,
  };
  setState({ reports: [report, ...state.reports] });
  return report;
}

/** Fold a new submission into an existing report and recompute severity. */
export function mergeSubmission(
  targetId: string,
  input: NewReportInput & { distanceM?: number }
): Report | null {
  ensureLoaded();
  const target = state.reports.find((r) => r.id === targetId);
  if (!target) return null;
  const now = new Date().toISOString();
  const residentText = input.residentDescription ?? input.description;
  const submission: Submission = {
    id: uid("sub"),
    description: residentText,
    createdAt: now,
    contact: input.contact,
    distanceM: input.distanceM,
    chatLog: input.chatLog,
  };
  const newBase = Math.max(target.baseSeverity, input.baseSeverity);
  const submissions = [...target.submissions, submission];
  const updated: Report = {
    ...target,
    baseSeverity: newBase,
    severity: clamp(newBase, 1, 10),
    submissions,
    media: [...target.media, ...input.media].slice(0, 6),
    updatedAt: now,
    ...(input.formalTitle && !target.formalTitle
      ? { formalTitle: input.formalTitle }
      : {}),
  };
  setState({
    reports: state.reports.map((r) => (r.id === targetId ? updated : r)),
  });
  return updated;
}

export function updateStatus(
  id: string,
  status: ReportStatus,
  opts: { note?: string; rejected?: boolean } = {}
): Report | null {
  ensureLoaded();
  const target = state.reports.find((r) => r.id === id);
  if (!target) return null;
  const now = new Date().toISOString();
  const event = {
    status,
    at: now,
    note: opts.note,
    rejected: status === "resolved" ? opts.rejected : undefined,
  };
  const updated: Report = {
    ...target,
    status,
    updatedAt: now,
    statusHistory: [...target.statusHistory, event],
    resolution:
      status === "resolved"
        ? {
            note:
              opts.note ||
              (opts.rejected
                ? "This request was reviewed and declined."
                : "This issue has been resolved."),
            rejected: !!opts.rejected,
            resolvedAt: now,
          }
        : target.resolution,
  };
  setState({
    reports: state.reports.map((r) => (r.id === id ? updated : r)),
  });
  return updated;
}

export function addInternalNote(
  id: string,
  text: string,
  author: string
): Report | null {
  ensureLoaded();
  const target = state.reports.find((r) => r.id === id);
  if (!target) return null;
  const note: InternalNote = {
    id: uid("note"),
    text: text.trim(),
    author,
    createdAt: new Date().toISOString(),
  };
  const updated: Report = {
    ...target,
    internalNotes: [...target.internalNotes, note],
  };
  setState({
    reports: state.reports.map((r) => (r.id === id ? updated : r)),
  });
  return updated;
}

/** Wipe all reports and sign out; keeps only the built-in demo accounts. */
export function clearAllData() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  state = {
    reports: [],
    accounts: SEED_ACCOUNTS,
    currentUserId: null,
    hydrated: true,
  };
  persist();
  emit();
}

/** Dev helper: wipe localStorage and reseed (exposed in the UI footer). */
export function resetDemoData() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  state = {
    reports: buildSeedReports(),
    accounts: SEED_ACCOUNTS,
    currentUserId: null,
    hydrated: true,
  };
  persist();
  emit();
}
