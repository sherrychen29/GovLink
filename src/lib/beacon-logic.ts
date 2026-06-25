// ---------------------------------------------------------------------------
// Beacon's deterministic logic. Runs server-side. Two roles:
//   1. Severity weighting from corroborating reports (always used).
//   2. A heuristic fallback "brain" used when OPENAI_API_KEY is missing or the
//      OpenAI call fails, so the prototype always behaves sensibly.
// ---------------------------------------------------------------------------

import {
  CATEGORIES,
  type Category,
  type FormalizedReport,
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

// --- Heuristic fallback engine --------------------------------------------
//
// This engine ONLY runs offline (no API key) or if the model call fails. It is
// a degraded safety net, not the primary brain. Lesson from the "tree collapse"
// bug: emergencies are matched by UNAMBIGUOUS MULTI-WORD DANGER PHRASES, never
// by lone words. Generic words like "collapse", "fire" (cf. "fire hydrant"), or
// "shooting" (cf. "shooting hoops") are deliberately NOT routing gates — words
// like "collapse" live in the severity booster list instead (see SEVERITY_HINTS).

const EMERGENCY_PATTERNS = [
  /\b(on fire|house fire|building fire|car fire|structure fire|actively burning|fire is spreading)\b/i,
  /\bgas leak\b/i,
  /\bsmell(s|ing)? (of )?gas\b/i,
  /\bcarbon monoxide\b/i,
  /\bnot breathing\b/i,
  /\bcan'?t breathe\b/i,
  /\bheart attack\b/i,
  /\bhaving a stroke\b/i,
  /\boverdos(e|ing)\b/i,
  /\b(is |someone is |they'?re )?unconscious\b/i,
  /\b(severe|severely|badly|heavily) bleeding\b/i,
  /\bbleeding (badly|heavily|out|everywhere)\b/i,
  /\b(active shooter|being shot|gun ?shots?|a shooting|someone shooting|opened fire)\b/i,
  /\b(a stabbing|being stabbed|someone stabbed)\b/i,
  /\bbeing (attacked|assaulted|robbed|mugged|kidnapped)\b/i,
  /\b(break-?in|burglary|home invasion) (in progress|happening|right now)\b/i,
  /\bexplosion\b/i,
  /\b(downed|live|sparking|arcing) (power )?(wire|line)s?\b/i,
  /\bpower line.{0,16}(is )?(down|sparking|arcing|on the ground)\b/i,
  /\bsomeone('?s| is)? (hurt|injured|dying|trapped|drowning|in danger)\b/i,
  /\b(is|are|got) (trapped|drowning|dying)\b/i,
  /\btrapped (under|inside|beneath)\b/i,
  /\b(collapsed?|fell|fallen) on(to)? (someone|somebody|people|a person|him|her|them|a child|workers?)\b/i,
  /\bcall 911\b/i,
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

// Words that NUDGE a non-emergency report's score up or down. This is the right
// role for keywords: weak features for SCORING, never hard gates for routing.
// "collapse", "sinkhole", "downed", etc. raise severity here instead of
// (wrongly) tripping the 911 path.
const SEVERITY_HINTS: Array<{ re: RegExp; weight: number }> = [
  { re: /\b(exposed|live wire|sparking|arcing|electrocut)\b/i, weight: 3 },
  { re: /\b(collaps(e|ed|ing)|sink ?hole|downed|fallen (tree|branch|pole|line))\b/i, weight: 3 },
  { re: /\b(child|kid|school|playground|elderly|disabled)\b/i, weight: 2 },
  { re: /\b(blocking|blocked|cannot pass|impassable|in the road|in the street)\b/i, weight: 2 },
  { re: /\b(injur|trip|fall|fell|accident|hazard|dangerous|unsafe)\b/i, weight: 2 },
  { re: /\b(major|severe|huge|massive|deep|large|gushing|flooding)\b/i, weight: 1 },
  { re: /\b(busy|main road|intersection|highway|downtown)\b/i, weight: 1 },
  { re: /\b(weeks?|months?|long time|still not)\b/i, weight: 1 },
  { re: /\b(minor|small|slight|cosmetic|tiny)\b/i, weight: -2 },
];

function detectCategory(text: string): Category {
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

function estimateBaseSeverity(text: string, category: Category): number {
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

// --- Out-of-scope detection (private matters / wrong department) -----------
//
// Rather than brittle exact-phrase regexes, each domain is described by groups
// of concept keywords combined with logic. A report is redirected only when the
// signals for a domain co-occur AND no clear public-infrastructure signal is
// present. This catches natural variation ("scratched my new car", "my car got
// keyed in the lot") that fixed phrases would miss.

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/**
 * Specific public-infrastructure nouns that keep a report IN scope even when a
 * private-sounding word also appears. Deliberately specific — no bare
 * "street"/"road", which show up in private contexts too.
 */
const PUBLIC_INFRA_SIGNALS = [
  /\bpot ?hole/i,
  /\bstreet ?light/i,
  /\bstop sign\b/i,
  /\btraffic (light|signal)/i,
  /\bsidewalk/i,
  /\bcrosswalk/i,
  /\b(fire )?hydrant/i,
  /\bwater main/i,
  /\b(sewer|storm drain|manhole|catch basin)/i,
  /\bpublic (park|property|road|street|land|space|restroom|toilet)/i,
  /\bplayground/i,
  /\billegal(ly)? dump/i,
  /\bdowned (power )?(line|tree|branch)/i,
  /\bpower line/i,
  /\bgraffiti (on|at|across).{0,24}(wall|underpass|bridge|sign|park|public|building|fence along)/i,
  /\b(dead animal|roadkill)\b/i,
  /\babandoned (car|vehicle|cart)/i,
  /\bcity (tree|property|road|park|bench)/i,
  /\bin the (road|roadway|street|intersection|park|median)\b/i,
];

const PERSONAL_REF = [/\bmy\b/i, /\bour\b/i, /\bmine\b/i, /\bsomeone\b/i, /\bsomebody\b/i];

interface ScopeDomain {
  id: string;
  /** Returns true when the message belongs to this out-of-scope domain. */
  matches: (t: string) => boolean;
  reply: string;
}

const SCOPE_DOMAINS: ScopeDomain[] = [
  // Personal vehicle damage / theft / break-in → police + insurance
  {
    id: "vehicle",
    matches: (t) =>
      hasAny(t, [/\bcars?\b/i, /\bvehicles?\b/i, /\bautos?\b/i, /\btrucks?\b/i, /\bvan\b/i, /\bsuv\b/i, /\bmotorcycles?\b/i, /\bsedan\b/i, /\bbumper\b/i, /\bwindshield\b/i]) &&
      hasAny(t, [/\bscratch/i, /\bkey(ed|ing)?\b/i, /\bdent/i, /\bvandal/i, /\bdamag/i, /\bsmash/i, /\bbroke?n? into\b/i, /\bbreak[- ]?in/i, /\bhit (and run|my|the)/i, /\bsideswip/i, /\bstole|stolen|theft/i, /\btowed\b/i]) &&
      hasAny(t, PERSONAL_REF),
    reply:
      "I'm sorry about your vehicle — but the city can't help with that. Damage, break-ins, or theft involving a personal vehicle should go to your insurance and the police non-emergency line (or 911 if it's happening now). I'm here if you spot a public issue like a pothole or broken streetlight.",
  },

  // Private driveway / parking disputes → parking enforcement / tow
  {
    id: "driveway",
    matches: (t) =>
      hasAny(t, [/\bblock(ing|ed|s)?\b/i, /\bparked?\b/i, /\bparking\b/i, /\bwon'?t move\b/i, /\btow(ed|ing)?\b/i, /\bcan'?t (get|back) out\b/i]) &&
      hasAny(t, [/\bdriveway\b/i, /\bgarage\b/i, /\bmy (parking )?(spot|space)\b/i, /\bin front of (my|our) (house|home)\b/i, /\bassigned (spot|space)\b/i]),
    reply:
      "A vehicle blocking a private driveway or spot is handled by parking enforcement (if it's on the public street) or the police non-emergency line / a private tow — not a city repair ticket. I can help if you notice a public infrastructure problem instead.",
  },
  // Parking citation disputes
  {
    id: "parking-ticket",
    matches: (t) =>
      hasAny(t, [/\bparking (ticket|citation|fine)\b/i]) &&
      hasAny(t, [/\bdispute\b/i, /\bappeal\b/i, /\bfight\b/i, /\bcontest\b/i, /\bunfair\b/i, /\bwrong\b/i]),
    reply:
      "Parking ticket disputes go through the city's citations office or the court, not this reporting line. I can help with public infrastructure — broken meters, faded road markings, or hazards in the roadway.",
  },

  // Theft / crime against personal property → police
  {
    id: "theft",
    matches: (t) =>
      hasAny(t, [/\bstole|stolen|theft|robbed|burglar|mugged\b/i, /\bbroke?n? into\b/i, /\bbreak[- ]?in\b/i]) &&
      hasAny(t, [...PERSONAL_REF, /\bpackage|mail|parcel|delivery|amazon|ups|fedex\b/i, /\bwallet|purse|phone|laptop|bike|bicycle|jewelry|catalytic\b/i, /\bhouse|home|apartment|garage|shed\b/i]),
    reply:
      "Theft and break-ins should be reported to the police — use the non-emergency line, or call 911 if it's in progress. The city can't investigate crimes, but I'm here for public infrastructure problems like potholes or broken streetlights.",
  },

  // Residential / neighbor / party noise → police non-emergency / mediation
  {
    id: "noise",
    matches: (t) => {
      const neighbor = hasAny(t, [/\bneighbou?rs?\b/i, /\bnext door\b/i, /\bupstairs\b/i, /\bdownstairs\b/i, /\broommate\b/i, /\bapartment (above|below|next)\b/i, /\bhouse party\b/i, /\bparty\b/i]);
      const noise = hasAny(t, [/\bloud\b/i, /\bnois(e|y)\b/i, /\bmusic\b/i, /\byelling\b/i, /\bscreaming\b/i, /\bbass\b/i, /\bcan'?t sleep\b/i, /\bkeep(s|ing)? me (up|awake)\b/i, /\bblasting\b/i, /\bwind ?chime/i]);
      return neighbor && noise;
    },
    reply:
      "Noise from a neighbor or a party is best handled by the police non-emergency line while it's happening, or community mediation for ongoing issues — the city can't file it as an infrastructure report. I'm here for things like broken streetlights or potholes, though.",
  },

  // Interpersonal neighbor disputes → police / mediation
  {
    id: "neighbor-dispute",
    matches: (t) =>
      hasAny(t, [/\bneighbou?rs?\b/i, /\bnext door\b/i]) &&
      hasAny(t, [/\brude\b/i, /\bmean\b/i, /\bharass/i, /\bstalk/i, /\bspying\b/i, /\bthreaten/i, /\byell(ing|ed)?\b/i, /\bfight(ing)?\b/i, /\bdispute\b/i, /\bfence\b/i, /\bproperty line\b/i, /\bboundary\b/i]),
    reply:
      "Disputes with a neighbor — harassment, fences, property lines — are civil or police matters, not city service requests. For threats, use the police non-emergency line; for disagreements, community mediation can help. I'm here for public infrastructure issues.",
  },

  // Landlord / tenant / HOA / housing → housing authority / tenant rights
  {
    id: "housing",
    matches: (t) =>
      hasAny(t, [/\blandlord\b/i, /\btenant\b/i, /\brenter\b/i, /\blease\b/i, /\bevict(ion|ing|ed)?\b/i, /\bsecurity deposit\b/i, /\bhoa\b/i, /\bhomeowners? association\b/i, /\brent (is )?(due|owed|increase)/i]),
    reply:
      "Landlord, tenant, and HOA matters are handled outside the city's service line — a tenant-rights group, your HOA, or the housing authority can help. I'm here for public infrastructure problems like sidewalks, streetlights, and water mains.",
  },

  // Repairs inside a private home → owner / landlord
  {
    id: "private-home",
    matches: (t) => {
      const inside = hasAny(t, [/\binside (my|our|the) (house|home|apartment|condo|unit|place)\b/i, /\bin my (house|home|apartment|condo|unit|kitchen|bathroom|bedroom)\b/i]);
      const fixture = hasAny(t, [/\btoilet\b/i, /\bsink\b/i, /\bfaucet\b/i, /\bshower\b/i, /\bbathtub\b/i, /\bappliance\b/i, /\bair ?condition|a\/?c\b/i, /\bfurnace\b/i, /\bheater\b/i, /\bwater heater\b/i, /\bfridge|refrigerator\b/i, /\bceiling\b/i, /\boutlet\b/i, /\bbreaker\b/i, /\bmy roof\b/i, /\bdishwasher\b/i]);
      const myFixtureBroken =
        hasAny(t, [/\bmy (toilet|sink|faucet|shower|bathtub|appliance|furnace|heater|water heater|fridge|refrigerator|ceiling|outlet|roof|dishwasher|ac|a\/c|air conditioner)\b/i]);
      return inside || (fixture && myFixtureBroken);
    },
    reply:
      "Repairs inside a home are the owner's or landlord's responsibility, not a city matter. The city handles public systems — water mains in the street, sewers, hydrants. Let me know if you spot one of those.",
  },

  // Power/water out inside a residence → utility provider
  {
    id: "utility-outage",
    matches: (t) =>
      hasAny(t, [/\bpower\b/i, /\belectric/i, /\bwater\b/i, /\bgas\b/i, /\binternet\b/i, /\bcable\b/i]) &&
      hasAny(t, [/\bout (in|inside|at) (my|our)\b/i, /\bno (power|water|electricity|gas|heat)\b/i]) &&
      hasAny(t, [/\bhouse|home|apartment|unit|place\b/i]) &&
      !hasAny(t, [/\bwhole (street|block|neighborhood)\b/i, /\bstreetlight|traffic (light|signal)\b/i]),
    reply:
      "A power, water, or service outage inside your home is your utility provider's to fix — give them a call. If streetlights or traffic signals are out, or there's a downed line in a public area, describe that and I can help.",
  },

  // Utility billing / legal / insurance / permits → other offices
  {
    id: "admin",
    matches: (t) =>
      hasAny(t, [/\b(my )?(water|gas|electric|utility) bill\b/i, /\binsurance\b/i, /\bclaim\b/i, /\blawyer|attorney|lawsuit|sue\b/i, /\bsmall claims\b/i, /\bbuilding permit\b/i, /\bbusiness license\b/i, /\bpassport\b/i, /\bdmv\b/i, /\bdriver'?s? license\b/i, /\bproperty tax|taxes\b/i, /\bcontractor (scam|overcharg|didn'?t finish|bad job)/i]),
    reply:
      "That's handled by another office — your provider, insurer, the permit center, or the relevant agency — rather than the city's service line. I'm here for public infrastructure problems like potholes, broken streetlights, or park hazards.",
  },

  // Lost personal items → lost-and-found
  {
    id: "lost-item",
    matches: (t) =>
      hasAny(t, [/\blost (my|our|a)\b/i, /\bcan'?t find my\b/i, /\bmisplaced\b/i]) &&
      hasAny(t, [/\bwallet|purse|phone|keys|passport|id\b/i, /\bring|jewelry|laptop|bag\b/i, /\bdog|cat|pet\b/i]),
    reply:
      "Lost personal items aren't something the city tracks — try local lost-and-found or the police non-emergency line. For a lost pet, animal services may help. I can file public infrastructure issues whenever you need.",
  },

  // Neighbor's pet nuisance (distinct from a stray/injured animal in public)
  {
    id: "neighbor-pet",
    matches: (t) =>
      hasAny(t, [/\bneighbou?rs?\b/i, /\bnext door\b/i]) &&
      hasAny(t, [/\bdog|cat|pet|puppy\b/i]) &&
      hasAny(t, [/\bbark/i, /\bpoop/i, /\bwaste\b/i, /\baggressive\b/i, /\bloose\b/i, /\bjumps? the fence\b/i, /\bwon'?t stop\b/i]),
    reply:
      "A neighbor's pet is usually handled by animal services or the police non-emergency line, not a city service request. If you see a stray, injured, or dead animal in a public area, I can help file that.",
  },
];

/**
 * Returns a redirect message if the text describes something the city wouldn't
 * handle, or null if it's plausibly a public-infrastructure issue.
 */
function classifyOutOfScope(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // A clear public-infrastructure signal keeps the report in scope.
  if (hasAny(t, PUBLIC_INFRA_SIGNALS)) return null;
  for (const domain of SCOPE_DOMAINS) {
    if (domain.matches(t)) return domain.reply;
  }
  return null;
}

/**
 * Pull a searchable location string from resident chat text (fallback when the
 * model doesn't return locationHint). Returns null for vague phrases only.
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

/**
 * Heuristic stand-in for the OpenAI chat when no key is configured. It mirrors
 * the same classify-before-filing contract: every message is sorted into one
 * intent, and ONLY "ready" yields a draft that can become a filed report.
 *
 * Priority order: emergency → spam → out-of-scope → too vague → ready.
 */
export function heuristicChat(conversation: string[]): BeaconChatResult {
  const userText = conversation.join("\n").trim();
  const latest = conversation[conversation.length - 1] || "";

  // 1. Emergencies are never filed — direct to 911.
  if (EMERGENCY_PATTERNS.some((re) => re.test(userText))) {
    return {
      intent: "emergency",
      reply:
        "This sounds like an emergency. Please call 911 right now — GovLink is for non-urgent issues and can't dispatch responders. Once everyone is safe, come back and I'll gladly file a report.",
      draft: null,
      missing: [],
    };
  }

  // 2. Obvious junk on the first turn — decline, don't file.
  if (looksLikeSpam(latest) && conversation.length <= 1) {
    return {
      intent: "spam",
      reply:
        "I couldn't make sense of that. If you're reporting a real city issue, tell me what's wrong — for example, \"a streetlight is out on Maple Ave.\"",
      draft: null,
      missing: ["description"],
    };
  }

  // 3. Real concern, but not the city's responsibility — redirect, don't file.
  const redirect = classifyOutOfScope(userText);
  if (redirect) {
    return {
      intent: "redirect",
      reply: redirect,
      draft: null,
      missing: [],
    };
  }

  // 4. Plausible city issue but too thin to file — ask one clarifying question.
  const category = detectCategory(userText);
  const wordCount = userText.split(/\s+/).filter(Boolean).length;
  if (isTooVague(userText) || (category === "Other" && wordCount < 8)) {
    return {
      intent: "clarify",
      reply:
        "Got it — I want to file this correctly. Can you tell me a bit more about what's wrong, how serious it looks, and whether anyone's at risk?",
      draft: null,
      missing: ["description"],
    };
  }

  // 5. Clear public issue — the only path that produces a fileable draft.
  const baseSeverity = estimateBaseSeverity(userText, category);
  const locationHint = extractLocationHint(userText) ?? undefined;
  return {
    intent: "ready",
    reply:
      "Thanks — I understand the issue. Use the map below to pin the exact location.",
    draft: {
      category,
      description: cleanDescription(userText),
      baseSeverity,
      locationHint,
    },
    missing: [],
  };
}

const SEVERITY_COMPLAINT =
  /\b(more (urgent|important|severe|critical)|should be higher|rank(ed)? higher|too low|not high enough|underrate)\b/i;

const NEW_RISK_INFO =
  /\b(child|kid|school|elderly|disabled|injur|accident|hospital|bus stop|blocking|blocked|impassable|oncoming|swerv|collision|live wire|sparking|gas leak|sinkhole|main break)\b/i;

/** Review-phase chat: firm on severity unless new facts warrant an adjustment. */
export function heuristicReviewChat(
  message: string,
  draft: BeaconDraft
): BeaconChatResult {
  const text = message.trim();
  if (!text) {
    return {
      intent: "review_reply",
      reply: "Tell me what you'd like to change and I'll take another look.",
      draft: null,
      missing: [],
    };
  }

  const wantsHigher = SEVERITY_COMPLAINT.test(text);
  const newRisk = NEW_RISK_INFO.test(text);

  if (wantsHigher && newRisk) {
    const bumped = clamp(Math.max(draft.baseSeverity + 2, 7), 1, 10);
    return {
      intent: "review_reply",
      reply: `That's important context — I've raised the severity to ${bumped}/10 based on the safety risk you described. The review card below is updated.`,
      draft: { ...draft, baseSeverity: bumped },
      missing: [],
      severityUpdated: true,
    };
  }

  if (wantsHigher) {
    return {
      intent: "review_reply",
      reply: `I hear you. Severity ${draft.baseSeverity}/10 reflects what you've shared so far — city teams triage against active safety risks, corroboration, and location. If there's a specific new detail (someone hurt, traffic blocked, exposed wires), tell me and I can reassess.`,
      draft: null,
      missing: [],
    };
  }

  if (text.length > 12 && !wantsHigher) {
    const merged = cleanDescription(`${draft.description} ${text}`);
    const category = detectCategory(merged);
    const baseSeverity = estimateBaseSeverity(merged, category);
    const severityChanged = baseSeverity !== draft.baseSeverity;
    return {
      intent: "review_reply",
      reply: severityChanged
        ? `Updated the description${severityChanged ? ` and adjusted severity to ${baseSeverity}/10` : ""} based on what you added. Check the review card below.`
        : "I've updated the description with that detail. Take another look at the review card below.",
      draft: {
        category,
        description: merged,
        baseSeverity,
      },
      missing: [],
      severityUpdated: severityChanged,
    };
  }

  return {
    intent: "review_reply",
    reply:
      "The report below reflects what you've told me. If something factual is missing or wrong, describe it and I'll update the draft.",
    draft: null,
    missing: [],
  };
}

function cleanDescription(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 600 ? compact.slice(0, 597) + "…" : compact;
}

// --- Report formalization (municipal work-order style) ---------------------

const CATEGORY_SHORT: Record<Category, string> = {
  "Water/Plumbing": "Water / Plumbing",
  "Roads & Sidewalks": "Road & Sidewalk",
  "Electricity/Power Lines": "Electrical / Utility",
  "Waste & Sanitation": "Waste & Sanitation",
  "Parks & Trees": "Parks & Trees",
  "Noise Complaints": "Noise Complaint",
  "Animal/Wildlife": "Animal / Wildlife",
  "Public Safety/Hazards": "Public Safety Hazard",
  Other: "General Service Request",
};

export function priorityFromSeverity(severity: number): ServicePriority {
  const s = clamp(Math.round(severity), 1, 10);
  if (s <= 3) return "Routine";
  if (s <= 6) return "Standard";
  if (s <= 8) return "Elevated";
  return "Critical";
}

function formalizeProse(text: string): string {
  let s = text.trim().replace(/\s+/g, " ");
  s = s.replace(/\bi'm\b/gi, "I am").replace(/\bit's\b/gi, "it is");
  s = s.replace(/\bdon't\b/gi, "do not").replace(/\bcan't\b/gi, "cannot");
  if (s.length && !/[.!?]$/.test(s)) s += ".";
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function locationSnippet(locationLabel?: string): string {
  if (!locationLabel?.trim()) return "Location to be confirmed";
  const parts = locationLabel.split(",").map((p) => p.trim()).slice(0, 2);
  return parts.join(", ");
}

/**
 * Heuristic stand-in when OpenAI is unavailable — produces municipal-style
 * language suitable for city staff triage queues.
 */
export function heuristicFormalize(input: {
  description: string;
  category?: Category;
  locationLabel?: string;
}): FormalizedReport {
  const raw = input.description.trim();
  const category =
    input.category && CATEGORIES.includes(input.category)
      ? input.category
      : detectCategory(raw);
  const baseSeverity = estimateBaseSeverity(raw, category);
  const servicePriority = priorityFromSeverity(baseSeverity);
  const loc = locationSnippet(input.locationLabel);
  const shortCat = CATEGORY_SHORT[category];
  const prose = formalizeProse(raw);

  const formalTitle = `${shortCat} — ${loc}`.slice(0, 120);
  const formalDescription = [
    `SERVICE REQUEST — ${category.toUpperCase()}.`,
    `Location reference: ${loc}.`,
    `Reported condition: The reporting party indicates ${prose.charAt(0).toLowerCase()}${prose.slice(1)}`,
    `Priority assessment: ${baseSeverity}/10 (${servicePriority}).`,
    "Source: Resident intake via GovLink.",
  ].join(" ");

  return {
    category,
    formalTitle,
    formalDescription,
    baseSeverity,
    servicePriority,
  };
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
