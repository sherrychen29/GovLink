import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON, getOpenAI } from "@/lib/openai";
import {
  heuristicChat,
  heuristicReviewChat,
  extractLocationHint,
  clamp,
  type BeaconChatResult,
} from "@/lib/beacon-logic";
import { CATEGORIES, type Category } from "@/lib/types";

export const runtime = "nodejs";

// Keep cost/latency bounded and blunt prompt-injection bloat.
const MAX_TURNS = 12;
const MAX_CHARS = 2000;

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(40),
  context: z
    .object({
      phase: z.enum(["intake", "review"]),
      category: z.enum(CATEGORIES).optional(),
      description: z.string().optional(),
      baseSeverity: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// The intelligence lives in this prompt. Beacon is the PRIMARY decision-maker:
// it reads the whole situation and REASONS about it. Outcomes are defined by the
// state of the world ("is anyone in danger right now?"), never by vocabulary.
// Keyword logic exists only as an offline fallback (see beacon-logic.ts).
// ---------------------------------------------------------------------------
const INTAKE_PROMPT = `You are Beacon, the intake assistant for GovLink — where residents report NON-EMERGENCY problems to their city government in San Jose.

Your job: through a short, calm, competent conversation, decide what to do with each message and, when appropriate, assemble ONE complete, standardized report. Be concise and warm — never chatty filler. Reason about the whole SITUATION, not individual words.

A complete report needs: (1) a clear category, (2) a specific description of the problem, and (3) some sense of WHERE it is (a cross street, address, or landmark is enough — exact GPS and photos are collected separately by the app). Do NOT ask for photos or a precise address.

The report MUST map to exactly one of these categories: ${JSON.stringify(CATEGORIES)}. This enum is also your scope filter: if a genuine problem cannot reasonably map to one of these AS A CITY/LOCAL-GOVERNMENT RESPONSIBILITY, it is out of scope.

Return JSON only (no markdown):
{
  "intent": "clarify" | "ready" | "emergency" | "spam" | "redirect",
  "reply": string,
  "category": one of the categories | null,
  "description": string | null,
  "baseSeverity": integer 1-10 | null,
  "severityRationale": string | null,
  "locationHint": string | null,
  "missing": string[]
}

Decide "intent" by reasoning about the state of the world:

- "emergency": there is an ACTIVE threat to life or safety RIGHT NOW — fire, serious injury, crime in progress, gas leak, sparking/downed live wires, or anyone trapped or in immediate danger. Lead the reply with calling 911. Do NOT file. JUDGE THE SITUATION, NOT THE WORDS: a tree that fell and is merely blocking a road with no one hurt is NOT an emergency; a tree that fell ONTO a person, or onto live power lines, IS. A "collapsed" tree across a lane is a routine hazard report; a building collapsing onto people is an emergency.

- "redirect": a legitimate concern that is NOT the city's responsibility — e.g. damage/theft of a personal vehicle, a car blocking a private driveway or spot, neighbor or house-party noise, neighbor disputes/harassment, landlord-tenant/HOA matters, repairs INSIDE a private home, a single-residence utility outage, billing/insurance/legal/permits/DMV, or lost personal items. Warmly explain it isn't something the city handles, name who CAN help (police non-emergency, your insurer, parking enforcement, a private tow, your landlord, your utility provider, community mediation, etc.), and invite them to describe a real city issue. Do NOT file.

- "spam": nonsensical, a test, abusive, or clearly not a real issue. Politely decline with a brief reason. Do NOT file.

- "clarify": plausibly a city issue but you still need ONE key detail (what it is or roughly where). Ask a single targeted question. Prefer this over rejecting a borderline-but-legitimate report.

- "ready": you have a category + a specific description + a location hint. Produce the draft. Don't over-ask — two exchanges is usually plenty. Tell them to use the map widget below to pin the exact location. Never say "on the right" or mention a form.

Guiding principles:
- Bias toward "ready" once you reasonably can; bias toward "clarify" over rejection when unsure.
- Never invent details the resident didn't provide; keep the description faithful and neutral.
- Set category/description/baseSeverity/severityRationale ONLY for "ready"; otherwise null.
- For "ready", also set locationHint to the street, intersection, address, or landmark the resident mentioned (exact words when possible, e.g. "Oak St", "Cedar St & 12th Ave", "near the library"). null if they gave no location text yet.

baseSeverity (for "ready" only): integer 1-10 judging INTRINSIC seriousness — 10 = imminent danger to people; 1 = minor cosmetic. Weigh risk to people, scale, and urgency (a sparking wire >> a dim streetlight; blocking a highway >> one parking space). severityRationale: one short sentence explaining the score.

Examples (reasoning, not keyword matching):
- "a tree fell and is blocking a lane on Oak St, nobody's hurt" -> {"intent":"ready","reply":"Thanks — a downed tree blocking the road is something the city can clear. Use the map widget below to pin the exact spot.","category":"Parks & Trees","description":"A fallen tree is blocking a traffic lane on Oak St; no injuries reported.","baseSeverity":6,"severityRationale":"Blocks a roadway and impedes traffic, but no one is in immediate danger.","locationHint":"Oak St","missing":[]}
- "a wall just collapsed onto some workers" -> {"intent":"emergency","reply":"This is an emergency — please call 911 right now so responders can help the people involved. GovLink can't dispatch emergency services.","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"missing":[]}
- "someone scratched my brand new car in the parking lot" -> {"intent":"redirect","reply":"I'm sorry about your car — but vehicle damage isn't something the city handles. Please contact your insurance and the police non-emergency line. I'm here if you spot a public issue like a pothole or broken streetlight.","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"missing":[]}
- "something is broken" -> {"intent":"clarify","reply":"I can help — what exactly is broken, and roughly where is it?","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"missing":["description","location"]}`;

const REVIEW_PROMPT = `You are Beacon reviewing a civic report draft before submission. The resident sees a review card in chat and may push back on severity or add details.

The current draft (category, description, baseSeverity) is provided in the user message context.

Reply with JSON only (no markdown):
{
  "intent": "review_reply",
  "reply": string,
  "category": one of ${JSON.stringify(CATEGORIES)} | null,
  "description": string | null,
  "baseSeverity": integer 1-10 | null
}

Rules:
- Be firm but respectful. Severity reflects public-safety risk and city triage standards — not frustration alone.
- If they complain severity is too LOW without new facts: explain why the current score fits; do NOT change baseSeverity (return null for changed fields).
- If they provide NEW safety-relevant facts (injuries, blocked traffic, schools nearby, exposed wires, etc.): update description and/or raise baseSeverity; explain the change clearly.
- If they correct factual details: update description; adjust severity only if warranted.
- Keep replies under 3 sentences. Never tell them to use a form — they use the review card below.`;

const IntakeResultSchema = z.object({
  intent: z.enum(["clarify", "ready", "emergency", "spam", "redirect"]),
  reply: z.string(),
  category: z.enum(CATEGORIES).nullable().optional(),
  description: z.string().nullable().optional(),
  baseSeverity: z.number().nullable().optional(),
  severityRationale: z.string().nullable().optional(),
  locationHint: z.string().nullable().optional(),
  missing: z.array(z.string()).optional(),
});

const ReviewResultSchema = z.object({
  intent: z.literal("review_reply"),
  reply: z.string(),
  category: z.enum(CATEGORIES).nullable().optional(),
  description: z.string().nullable().optional(),
  baseSeverity: z.number().nullable().optional(),
});

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Trust the model's decision, but never trust its data blindly: coerce the
 * category into the enum, clamp severity into range, and fall back to the safe
 * default ("clarify" — ask, never silently file or reject) if anything is off.
 */
function normalizeIntake(
  r: z.infer<typeof IntakeResultSchema>,
  userText: string
): BeaconChatResult {
  if (r.intent === "ready") {
    if (!r.description) {
      return {
        intent: "clarify",
        reply: r.reply || "Could you tell me a bit more about what's wrong and roughly where?",
        draft: null,
        missing: ["description"],
      };
    }
    const hint =
      r.locationHint?.trim() || extractLocationHint(userText) || undefined;
    return {
      intent: "ready",
      reply: r.reply,
      draft: {
        category: isCategory(r.category) ? r.category : "Other",
        description: r.description.trim(),
        baseSeverity: clamp(Math.round(r.baseSeverity ?? 5), 1, 10),
        locationHint: hint,
      },
      missing: [],
    };
  }

  return {
    intent: r.intent,
    reply: r.reply,
    draft: null,
    missing: r.missing ?? [],
  };
}

/** Last MAX_TURNS messages, each truncated, for the model context window. */
function trimHistory(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  return messages.slice(-MAX_TURNS).map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_CHARS),
  }));
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { messages, context } = parsed.data;
  const history = trimHistory(messages);
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);
  const userText = userTurns.join("\n");
  const latestUser = userTurns[userTurns.length - 1] || "";

  // --- Review phase --------------------------------------------------------
  if (context?.phase === "review" && context.category && context.description) {
    const draft = {
      category: context.category,
      description: context.description,
      baseSeverity: clamp(Math.round(context.baseSeverity ?? 5), 1, 10),
    };

    if (!getOpenAI()) {
      return NextResponse.json({
        ...heuristicReviewChat(latestUser, draft),
        source: "heuristic",
      });
    }

    const raw = await chatJSON(
      [
        { role: "system", content: REVIEW_PROMPT },
        { role: "user", content: JSON.stringify({ draft, residentMessage: latestUser }) },
      ],
      { temperature: 0.2 }
    );

    const result = raw ? ReviewResultSchema.safeParse(raw) : null;
    if (!result?.success) {
      return NextResponse.json({
        ...heuristicReviewChat(latestUser, draft),
        source: "heuristic",
      });
    }

    const r = result.data;
    const updated =
      r.category && r.description && r.baseSeverity != null
        ? {
            category: r.category,
            description: r.description,
            baseSeverity: clamp(Math.round(r.baseSeverity), 1, 10),
          }
        : r.description && r.category
          ? {
              ...draft,
              category: r.category,
              description: r.description,
              baseSeverity:
                r.baseSeverity != null
                  ? clamp(Math.round(r.baseSeverity), 1, 10)
                  : draft.baseSeverity,
            }
          : r.baseSeverity != null
            ? { ...draft, baseSeverity: clamp(Math.round(r.baseSeverity), 1, 10) }
            : null;

    const payload: BeaconChatResult & { source: string } = {
      intent: "review_reply",
      reply: r.reply,
      draft: updated,
      missing: [],
      severityUpdated: updated != null && updated.baseSeverity !== draft.baseSeverity,
      source: "openai",
    };
    return NextResponse.json(payload);
  }

  // --- Intake phase: the LLM is the primary classifier ---------------------
  // Keywords get NO vote when the model is available; they run only offline.
  if (!getOpenAI()) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  const raw = await chatJSON(
    [{ role: "system", content: INTAKE_PROMPT }, ...history],
    { temperature: 0.3 }
  );
  if (!raw) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  const result = IntakeResultSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  return NextResponse.json({ ...normalizeIntake(result.data, userText), source: "openai" });
}
