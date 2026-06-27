// ---------------------------------------------------------------------------
// GovLink core domain types — shared by the citizen app, gov dashboard,
// the data layer, and the Beacon API routes.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "Public Safety/Hazards",
  "Roads & Sidewalks",
  "Waste & Sanitation",
  "Electricity/Power Lines",
  "Water/Plumbing",
  "Parks & Trees",
  "Animal/Wildlife",
  "Noise Complaints",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ReportStatus = "sent" | "opened" | "in_progress" | "resolved";

export const STATUS_PIPELINE: ReportStatus[] = [
  "sent",
  "opened",
  "in_progress",
  "resolved",
];

/** Active (non-resolved) statuses for the gov operations queue. */
export const OPEN_STATUS_PIPELINE: ReportStatus[] = STATUS_PIPELINE.filter(
  (s) => s !== "resolved"
);

export type LocationMethod = "gps" | "pin" | "cross-street" | "address";

export interface ReportLocation {
  lat: number;
  lng: number;
  address?: string;
  crossStreet?: string;
  method: LocationMethod;
}

export interface MediaItem {
  id: string;
  /** Data URL (base64) so the prototype survives a refresh via localStorage. */
  dataUrl: string;
  kind: "image" | "video";
  name?: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  anonymous: boolean;
}

/** Beacon intake conversation archived for government review. */
export interface ChatLogEntry {
  role: "user" | "beacon" | "system";
  text: string;
  at: string; // ISO
}

/** One citizen submission folded into a report (originals + corroborations). */
export interface Submission {
  id: string;
  description: string;
  createdAt: string; // ISO
  contact?: ContactInfo;
  /** Approx. distance in metres from the canonical report location, if merged. */
  distanceM?: number;
  /** Beacon intake conversation for this submission, when filed via chat. */
  chatLog?: ChatLogEntry[];
}

export interface InternalNote {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO
}

export interface StatusEvent {
  status: ReportStatus;
  at: string; // ISO
  note?: string;
  /** True when this resolution was a rejection (status still reads "resolved"). */
  rejected?: boolean;
}

export type ServicePriority = "Routine" | "Standard" | "Elevated" | "Critical";

/** Beacon-polished report fields returned by `/api/beacon/formalize`. */
export interface FormalizedReport {
  category: Category;
  formalTitle: string;
  formalDescription: string;
  baseSeverity: number;
  servicePriority: ServicePriority;
}

export interface Report {
  id: string; // tracking ID, e.g. "GL-7K2-4810"
  /** Municipal-style short title shown to city staff. */
  formalTitle?: string;
  /** Gov-facing formal description (Beacon-polished). */
  description: string;
  /** Resident's original wording before formalization. */
  residentDescription?: string;
  /** Triage priority label derived from severity assessment. */
  servicePriority?: ServicePriority;
  category: Category;
  location: ReportLocation;
  media: MediaItem[];
  /** Final severity 1–10 (Beacon judgement on the issue itself). */
  severity: number;
  /** Beacon's base severity from the description alone. */
  baseSeverity: number;
  noticedAt: string; // ISO — auto-filled, editable
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: ReportStatus;
  contact: ContactInfo;
  /** Account id of the reporter, when filed while logged in. */
  reporterId?: string;
  /** Every submission that makes up this report (length === corroborations). */
  submissions: Submission[];
  internalNotes: InternalNote[];
  statusHistory: StatusEvent[];
  /** Archived Beacon intake conversation, when filed via chat. */
  chatLog?: ChatLogEntry[];
  /** Staff member assigned to handle this report. */
  assignedTo?: string;
  /** Citizen-visible resolution note (includes rejection reason when rejected). */
  resolution?: {
    note: string;
    rejected: boolean;
    resolvedAt: string;
  };
}

export interface Account {
  id: string;
  username: string;
  password: string; // demo only — never do this in production
  role: "citizen" | "government";
  displayName: string;
  email?: string;
  phone?: string;
}

/** The number of distinct residents who reported an issue. */
export function corroborations(report: Report): number {
  return Math.max(1, report.submissions.length);
}

export interface ReportChatSection {
  label: string;
  entries: ChatLogEntry[];
}

/** Chat logs grouped by submission (original + corroborations). */
export function reportChatSections(report: Report): ReportChatSection[] {
  return report.submissions
    .map((s, i) => ({
      label: i === 0 ? "Original submission" : `Corroboration ${i}`,
      entries: s.chatLog ?? (i === 0 ? report.chatLog : undefined) ?? [],
    }))
    .filter((s) => s.entries.length > 0);
}

export function allReportChatEntries(report: Report): ChatLogEntry[] {
  return reportChatSections(report).flatMap((s) => s.entries);
}
