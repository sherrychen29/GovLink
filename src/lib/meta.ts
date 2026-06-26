// Presentation metadata for categories, statuses, and severity.
// Kept as plain data (no React/lucide imports) so it is safe on the server.

import type { Category, ReportStatus } from "./types";

export interface CategoryMeta {
  /** lucide-react icon name, resolved by <CategoryIcon /> on the client. */
  icon: string;
  /** tint classes for chips/badges */
  chip: string;
  /** solid dot color for compact contexts */
  dot: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  "Water/Plumbing": {
    icon: "Droplets",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-500",
  },
  "Roads & Sidewalks": {
    icon: "Construction",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  "Electricity/Power Lines": {
    icon: "Zap",
    chip: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    dot: "bg-yellow-500",
  },
  "Waste & Sanitation": {
    icon: "Trash2",
    chip: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
    dot: "bg-lime-600",
  },
  "Parks & Trees": {
    icon: "Trees",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-600",
  },
  "Noise Complaints": {
    icon: "Volume2",
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    dot: "bg-violet-500",
  },
  "Animal/Wildlife": {
    icon: "PawPrint",
    chip: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    dot: "bg-orange-500",
  },
  "Public Safety/Hazards": {
    icon: "TriangleAlert",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
  },
  Other: {
    icon: "CircleHelp",
    chip: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    dot: "bg-slate-500",
  },
};

export interface StatusMeta {
  label: string;
  icon: string;
  /** pill classes */
  pill: string;
  /** small dot color */
  dot: string;
  /** description used in tracker tooltips / aria */
  description: string;
}

export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  sent: {
    label: "Sent",
    icon: "Send",
    pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    dot: "bg-slate-400",
    description: "Received by the city. Awaiting review.",
  },
  opened: {
    label: "Opened",
    icon: "MailOpen",
    pill: "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
    dot: "bg-accent-500",
    description: "A staff member has reviewed your report.",
  },
  in_progress: {
    label: "In Progress",
    icon: "Loader",
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    description: "Crews are actively working on this issue.",
  },
  resolved: {
    label: "Resolved",
    icon: "CircleCheck",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    description: "This issue has been closed out.",
  },
};

// ---- Severity ------------------------------------------------------------

export type SeverityBand = "low" | "moderate" | "high" | "critical";

export function severityBand(severity: number): SeverityBand {
  if (severity <= 3) return "low";
  if (severity <= 6) return "moderate";
  if (severity <= 8) return "high";
  return "critical";
}

export interface SeverityMeta {
  label: string;
  /** hex used for map markers */
  hex: string;
  /** text + bg classes */
  text: string;
  bar: string; // fill color for the severity bar
  chip: string;
}

export const SEVERITY_META: Record<SeverityBand, SeverityMeta> = {
  low: {
    label: "Low",
    hex: "#16a34a",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  moderate: {
    label: "Moderate",
    hex: "#eab308",
    text: "text-yellow-700",
    bar: "bg-yellow-400",
    chip: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  },
  high: {
    label: "High",
    hex: "#f97316",
    text: "text-orange-700",
    bar: "bg-orange-500",
    chip: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
  critical: {
    label: "Critical",
    hex: "#dc2626",
    text: "text-red-700",
    bar: "bg-red-500",
    chip: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

export function severityMeta(severity: number): SeverityMeta {
  return SEVERITY_META[severityBand(severity)];
}

/** Map legend entries — keeps marker colors and dashboard legend in sync. */
export const SEVERITY_LEGEND: Array<{ hex: string; label: string }> = [
  { hex: SEVERITY_META.low.hex, label: "1–3 Low" },
  { hex: SEVERITY_META.moderate.hex, label: "4–6 Moderate" },
  { hex: SEVERITY_META.high.hex, label: "7–8 High" },
  { hex: SEVERITY_META.critical.hex, label: "9–10 Critical" },
];
