// ---------------------------------------------------------------------------
// Beacon's deterministic logic. Runs server-side. Two roles:
//   1. Severity weighting from corroborating reports (always used).
//   2. A heuristic fallback "brain" used when OPENAI_API_KEY is missing or the
//      OpenAI call fails, so the prototype always behaves sensibly.
// ---------------------------------------------------------------------------

import { CATEGORIES, type Category } from "./types";

export type BeaconIntent = "clarify" | "ready" | "emergency" | "spam";

export interface BeaconDraft {
  category: Category;
  description: string;
  baseSeverity: number; // 1–10 from the description alone
}

export interface BeaconChatResult {
  intent: BeaconIntent;
  reply: string;
  draft: BeaconDraft | null;
  /** fields Beacon still wants before it can file */
  missing: string[];
}

// --- Severity weighting ----------------------------------------------------

/**
 * Final severity = AI's base judgement, weighted upward by how many separate
 * residents reported the same issue. Diminishing returns, capped at 10.
 */
export function weightedSeverity(
  baseSeverity: number,
  corroborations: number
): number {
  const base = clamp(baseSeverity, 1, 10);
  const extra = Math.max(0, corroborations - 1);
  // +0.9 per extra report, with gentle diminishing returns, capped at +3.
  const bonus = Math.min(3, Math.round(extra * 0.9 * 10) / 10);
  return clamp(Math.round(base + bonus), 1, 10);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// --- Heuristic fallback engine --------------------------------------------

const EMERGENCY_PATTERNS = [
  /\bfire\b/i,
  /\bsmoke\b/i,
  /\bgun(shot|fire|man)?\b/i,
  /\bshoot(ing)?\b/i,
  /\bstab(bing|bed)?\b/i,
  /\bbleeding\b/i,
  /\bunconscious\b/i,
  /\bnot breathing\b/i,
  /\bheart attack\b/i,
  /\bdrowning\b/i,
  /\boverdose\b/i,
  /\bactive shooter\b/i,
  /\bsomeone('?s| is)? (hurt|injured|dying|trapped)\b/i,
  /\bcollaps(e|ed|ing)\b/i,
  /\bexplosion\b/i,
  /\bgas leak\b/i,
  /\bbreak(-| )?in (in progress|happening)\b/i,
  /\bbeing (attacked|assaulted|robbed)\b/i,
];

const CATEGORY_KEYWORDS: Record<Category, RegExp[]> = {
  "Water/Plumbing": [
    /water/i,
    /leak/i,
    /pipe/i,
    /hydrant/i,
    /flood/i,
    /sewer/i,
    /drain/i,
    /main break/i,
  ],
  "Roads & Sidewalks": [
    /pothole/i,
    /road/i,
    /street/i,
    /sidewalk/i,
    /pavement/i,
    /curb/i,
    /asphalt/i,
    /crosswalk/i,
    /traffic light/i,
    /stop sign/i,
    /signal/i,
  ],
  "Electricity/Power Lines": [
    /power/i,
    /electric/i,
    /wire/i,
    /power line/i,
    /transformer/i,
    /outage/i,
    /street ?light/i,
    /lamp ?post/i,
  ],
  "Waste & Sanitation": [
    /trash/i,
    /garbage/i,
    /waste/i,
    /dump(ing|ed)?/i,
    /litter/i,
    /recycl/i,
    /bin/i,
    /overflow/i,
  ],
  "Parks & Trees": [
    /park\b/i,
    /tree/i,
    /branch/i,
    /playground/i,
    /bench/i,
    /trail/i,
    /grass/i,
    /field/i,
  ],
  "Noise Complaints": [/noise/i, /loud/i, /music/i, /party/i, /barking/i, /construction noise/i],
  "Animal/Wildlife": [
    /animal/i,
    /dog/i,
    /cat/i,
    /raccoon/i,
    /coyote/i,
    /wildlife/i,
    /dead animal/i,
    /stray/i,
    /rat/i,
    /possum/i,
  ],
  "Public Safety/Hazards": [
    /hazard/i,
    /danger/i,
    /unsafe/i,
    /broken glass/i,
    /sharp/i,
    /open manhole/i,
    /exposed/i,
    /graffiti/i,
    /vandal/i,
  ],
  Other: [],
};

const SEVERITY_HINTS: Array<{ re: RegExp; weight: number }> = [
  { re: /\b(child|kid|school|playground|elderly|disabled)\b/i, weight: 2 },
  { re: /\b(exposed|live wire|electric|sparking)\b/i, weight: 3 },
  { re: /\b(blocking|blocked|cannot pass|impassable)\b/i, weight: 2 },
  { re: /\b(injur|trip|fall|fell|accident)\b/i, weight: 2 },
  { re: /\b(major|severe|huge|massive|deep|large)\b/i, weight: 1 },
  { re: /\b(busy|main road|intersection|highway|downtown)\b/i, weight: 1 },
  { re: /\b(weeks?|months?|long time|still not)\b/i, weight: 1 },
  { re: /\b(minor|small|slight|cosmetic|tiny)\b/i, weight: -2 },
];

export function detectCategory(text: string): Category {
  let best: Category = "Other";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    const score = CATEGORY_KEYWORDS[cat].reduce(
      (acc, re) => acc + (re.test(text) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

export function estimateBaseSeverity(text: string, category: Category): number {
  // Category baselines reflect typical risk to the public.
  const baseline: Record<Category, number> = {
    "Public Safety/Hazards": 6,
    "Electricity/Power Lines": 6,
    "Water/Plumbing": 5,
    "Roads & Sidewalks": 4,
    "Animal/Wildlife": 4,
    "Parks & Trees": 3,
    "Waste & Sanitation": 3,
    "Noise Complaints": 2,
    Other: 3,
  };
  let score = baseline[category];
  for (const hint of SEVERITY_HINTS) {
    if (hint.re.test(text)) score += hint.weight;
  }
  return clamp(Math.round(score), 1, 10);
}

function looksLikeSpam(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4) return true;
  const letters = (trimmed.match(/[a-z]/gi) || []).length;
  if (letters / trimmed.length < 0.4) return true; // mostly symbols/numbers
  if (/^(.)\1{5,}$/.test(trimmed.replace(/\s/g, ""))) return true; // "aaaaaa"
  if (/^[asdfghjkl;'qwertyuiopzxcvbnm ]{0,}$/.test(trimmed) && trimmed.length < 12 && !/\s/.test(trimmed)) {
    // single keyboard-mash token
    if (!/\b(leak|tree|road|noise|trash|power|fire|dog)\b/i.test(trimmed)) return true;
  }
  return false;
}

function isTooVague(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  // Generic non-descriptions
  return /^(help|problem|issue|broken|something( is)? wrong|fix this|there('?s| is) a problem)\.?$/i.test(
    text.trim()
  );
}

/**
 * Heuristic stand-in for the OpenAI chat when no key is configured.
 * Mirrors the structured contract the API route returns.
 */
export function heuristicChat(conversation: string[]): BeaconChatResult {
  const userText = conversation.join("\n").trim();
  const latest = conversation[conversation.length - 1] || "";

  if (EMERGENCY_PATTERNS.some((re) => re.test(userText))) {
    return {
      intent: "emergency",
      reply:
        "This sounds like an emergency. Please call 911 right now — GovLink is only for non-urgent civic issues and can't dispatch emergency responders. Once everyone is safe, come back and I'll happily file a report.",
      draft: null,
      missing: [],
    };
  }

  if (looksLikeSpam(latest) && conversation.length <= 1) {
    return {
      intent: "spam",
      reply:
        "I wasn't able to make sense of that. If you're reporting a real issue in the city, tell me what's wrong and where — for example, \"a streetlight is out on Maple Ave near 5th.\"",
      draft: null,
      missing: ["description"],
    };
  }

  const category = detectCategory(userText);
  const wordCount = userText.split(/\s+/).filter(Boolean).length;

  if (isTooVague(userText) || (category === "Other" && wordCount < 8)) {
    return {
      intent: "clarify",
      reply:
        "Got it — I want to file this correctly. Can you tell me a bit more about what exactly is wrong, and roughly where it is (a street, cross-street, or landmark)?",
      draft: null,
      missing: ["description", "location"],
    };
  }

  const baseSeverity = estimateBaseSeverity(userText, category);
  return {
    intent: "ready",
    reply:
      "Thanks — I have what I need. I've drafted your report on the right. Set the location and add any photos, then file it whenever you're ready.",
    draft: {
      category,
      description: cleanDescription(userText),
      baseSeverity,
    },
    missing: [],
  };
}

function cleanDescription(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 600 ? compact.slice(0, 597) + "…" : compact;
}

/** Heuristic dedup: same category + within ~120m + lexical overlap. */
export function heuristicDuplicate(
  draft: { category: Category; description: string; lat: number; lng: number },
  candidates: Array<{
    id: string;
    category: Category;
    description: string;
    lat: number;
    lng: number;
  }>
): { matchId: string | null; rationale: string } {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dist = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
  const draftTokens = tokens(draft.description);

  for (const c of candidates) {
    if (c.category !== draft.category) continue;
    const d = dist(draft.lat, draft.lng, c.lat, c.lng);
    if (d > 130) continue;
    const cTokens = tokens(c.description);
    const overlap = [...draftTokens].filter((t) => cTokens.has(t)).length;
    const overlapRatio = overlap / Math.max(1, Math.min(draftTokens.size, cTokens.size));
    if (overlapRatio >= 0.25) {
      return {
        matchId: c.id,
        rationale: `Same category within ${Math.round(d)}m and overlapping description — corroborates ${c.id}.`,
      };
    }
  }
  return { matchId: null, rationale: "No nearby open report matched; filing a new ticket." };
}
