// ---------------------------------------------------------------------------
// Beacon's deterministic logic. Runs server-side.
// Severity weighting from corroborating reports (always used).
// ---------------------------------------------------------------------------

import {
  type Category,
  type ServicePriority,
} from "./types";

export type BeaconIntent =
  | "clarify"
  | "ready"
  | "emergency"
  | "spam"
  | "redirect"
  | "review_reply";

export interface BeaconDraft {
  category: Category;
  description: string;
  baseSeverity: number; // 1–10 from the description alone
  /** Street, intersection, or landmark text from chat — pre-fills map search. */
  locationHint?: string;
}

export interface BeaconChatResult {
  intent: BeaconIntent;
  reply: string;
  draft: BeaconDraft | null;
  /** fields Beacon still wants before it can file */
  missing: string[];
  /** Set when review-phase chat adjusts severity. */
  severityUpdated?: boolean;
  /** Skip ahead to the photo-upload step when the resident asks to add media. */
  advanceTo?: "photos" | null;
}

// --- Severity weighting ----------------------------------------------------

/**
 * Final severity = base judgement, weighted upward by how many separate
 * residents reported the same issue. Exponential decay: the first corroboration
 * matters most ("not one cranky person — confirmed"), later ones taper off.
 *
 *   bump = 3.2 * (1 - e^(-(reports-1) / 2.2))
 */
export function weightedSeverity(
  baseSeverity: number,
  corroborations: number
): number {
  const base = clamp(baseSeverity, 1, 10);
  const extra = Math.max(0, corroborations - 1);
  const bump = extra === 0 ? 0 : 3.2 * (1 - Math.exp(-extra / 2.2));
  return clamp(Math.round(base + bump), 1, 10);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Pull a searchable location string from resident chat text.
 * Returns null for vague phrases only.
 */
export function extractLocationHint(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const vague =
    /^(my|our|the|a)\s+(neighborhood|area|block|street|road|block)$/i;
  const skip = /\b(my|our)\s+(house|home|driveway|yard|apartment)\b/i;

  const intersection = t.match(
    /\b([\w\s.'-]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\s*&\s*[\w\s.'-]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/i
  );
  if (intersection) return intersection[1].trim();

  const addressed = t.match(
    /\b(\d+\s+[\w\s.'-]+?(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/i
  );
  if (addressed) return addressed[1].trim();

  const prepped = t.match(
    /\b(?:on|at|along|near|by|from|off|outside|in front of)\s+(?:the\s+)?([\w\s.'-]*?\d*\s*[\w\s.'-]*?(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Highway|Hwy|Park|Library|School|Plaza|Mall|Center|Centre|Bridge|Parkway))\b/i
  );
  if (prepped) {
    const hint = prepped[1].trim();
    if (!vague.test(hint) && !skip.test(hint) && hint.length >= 3) return hint;
  }

  const landmark = t.match(
    /\b(?:near|at|by|outside|in front of|next to)\s+(?:the\s+)?([a-z][\w\s'-]{2,48}?)(?:[.,]|$|\s+(?:and|where|that|which|no one|nobody))\b/i
  );
  if (landmark) {
    const lm = landmark[1].trim();
    if (
      lm.length >= 4 &&
      !vague.test(lm) &&
      !skip.test(lm) &&
      !/^(here|there|it|this|that)$/i.test(lm)
    ) {
      return lm;
    }
  }

  return null;
}

// --- Priority mapping ------------------------------------------------------

export function priorityFromSeverity(severity: number): ServicePriority {
  const s = clamp(Math.round(severity), 1, 10);
  if (s <= 3) return "Routine";
  if (s <= 6) return "Standard";
  if (s <= 8) return "Elevated";
  return "Critical";
}
