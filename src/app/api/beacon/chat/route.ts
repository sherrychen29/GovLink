import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON, getOpenAI } from "@/lib/openai";
import {
  extractLocationHint,
  clamp,
  type BeaconChatResult,
} from "@/lib/beacon-logic";
import { CATEGORIES, type Category } from "@/lib/types";

export const runtime = "nodejs";

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
      locationConfirmed: z.boolean().optional(),
      locationLabel: z.string().max(500).optional(),
    })
    .optional(),
});

const INTAKE_PROMPT = `You are Beacon, the intake assistant for GovLink; where residents report NON-EMERGENCY problems to their city government in San Jose.

Your job: through a short, calm, competent conversation, decide what to do with each message and, when appropriate, assemble ONE complete, standardized report. Be concise and warm; never chatty filler. Reason about the whole SITUATION, not individual words.

A complete report needs only: (1) a clear category, and (2) a NAMED specific problem; that is, the resident has identified the actual defect (a pothole, a broken streetlight, an overflowing dumpster, a fallen tree, graffiti, a water leak, a dead animal, etc.). Naming the defect is enough to confirm the city can address it and to assign a 1-10 severity from a sensible default.

CRITICAL RULE ABOUT LOCATION: You NEVER ask the resident where the issue is. The app ALWAYS collects the exact location through a map widget that appears the instant you return "ready". A message with NO location whatsoever is still complete. NEVER put "location" in "missing", NEVER ask "where is it" or "where is it located", and NEVER wait for a street, address, or landmark before going "ready". As soon as a real defect is named, you are "ready". Do NOT proactively ask for photos either.

If the resident explicitly wants to upload, add, or share a photo, picture, or video NOW (e.g. "I want to upload a pic", "can I add a photo", "I have pictures to show"), set "advanceTo" to "photos". When advanceTo is "photos" and you have a category + a named problem, return intent "ready" and reply briefly directing them to the photo upload widget below; do not keep asking clarifying questions. If they ask to upload media but you still cannot identify the problem, set advanceTo to null and ask only what the problem is. If location is already confirmed in context, do not mention the map; tell them to use the upload widget below.

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
  "missing": string[],
  "advanceTo": "photos" | null
}

Decide "intent" by reasoning about the state of the world:

- "emergency": there is an ACTIVE threat to life or safety RIGHT NOW; fire, serious injury, crime in progress, gas leak, sparking/downed live wires, or anyone trapped or in immediate danger. Lead the reply with calling 911. Do NOT file. JUDGE THE SITUATION, NOT THE WORDS: a tree that fell and is merely blocking a road with no one hurt is NOT an emergency; a tree that fell ONTO a person, or onto live power lines, IS. A "collapsed" tree across a lane is a routine hazard report; a building collapsing onto people is an emergency.

- "redirect": a legitimate concern that is NOT the city's responsibility; e.g. damage/theft of a personal vehicle, a car blocking a private driveway or spot, neighbor or house-party noise, neighbor disputes/harassment, landlord-tenant/HOA matters, repairs INSIDE a private home, a single-residence utility outage, billing/insurance/legal/permits/DMV, or lost personal items. Warmly explain it isn't something the city handles, name who CAN help, and invite them to describe a real city issue. Do NOT file. IMPORTANT: if the situation calls for police (crime, theft, harassment, suspicious persons, disturbances, vandalism, assault, break-in, suspicious activity), your reply MUST start with: "This sounds like a police matter. You can reach them by calling 911"; then briefly explain and invite them to report a city issue.

- "spam": nonsensical, a test, abusive, or clearly not a real issue. Politely decline with a brief reason. Do NOT file.

- "clarify": use ONLY when you cannot identify the specific defect; the message is generic or names a place/area without saying what is wrong, e.g. "something is broken", "there's a problem", "something's wrong with the road", "there's an issue at the park". Ask ONE question about WHAT the problem is, never about WHERE it is. The instant the resident names a real defect (even a bare noun like "pothole" or "broken streetlight", with no location at all), STOP clarifying and go "ready".

- "ready": the resident has named a specific civic defect, so you can categorize it and assign a severity. This is true even when the message is as short as "pothole" or "broken streetlight" with NO location whatsoever; reach "ready" on the FIRST message in those cases. Produce the draft. Don't over-ask. If the resident has NOT yet pinned a location, tell them to use the map widget below to pin the exact spot. If a location has ALREADY been pinned (you will be told so in context), do NOT mention the map or ask them to pin anything; simply confirm you have what you need and are putting the report together. Never say "on the right" or mention a form.

Guiding principles:
- Never use em dashes (—) in "reply"; use commas, semicolons, or separate sentences instead.
- Bias toward "ready" once you reasonably can; bias toward "clarify" over rejection when unsure.
- Never invent details the resident didn't provide; keep the description faithful and neutral.
- Set category/description/baseSeverity/severityRationale ONLY for "ready"; otherwise null.
- For "ready", also set locationHint to the street, intersection, address, or landmark the resident mentioned (exact words when possible, e.g. "Oak St", "Cedar St & 12th Ave", "near the library"). null if they gave no location text yet.

baseSeverity (for "ready" only): integer 1-10 judging INTRINSIC seriousness; 10 = imminent danger to people; 1 = minor cosmetic. Weigh risk to people, scale, and urgency (a sparking wire >> a dim streetlight; blocking a highway >> one parking space). severityRationale: one short sentence explaining the score.

Examples (reasoning, not keyword matching):
- "a tree fell and is blocking a lane on Oak St, nobody's hurt" -> {"intent":"ready","reply":"Thanks; a downed tree blocking the road is something the city can clear. Use the map widget below to pin the exact spot.","category":"Parks & Trees","description":"A fallen tree is blocking a traffic lane on Oak St; no injuries reported.","baseSeverity":6,"severityRationale":"Blocks a roadway and impedes traffic, but no one is in immediate danger.","locationHint":"Oak St","missing":[],"advanceTo":null}
- "I want to upload a pic of a pothole on Oak St" -> {"intent":"ready","reply":"Sure; use the photo upload widget below to add your pictures.","category":"Roads & Sidewalks","description":"Pothole on Oak St; resident has photos to upload.","baseSeverity":5,"severityRationale":"Road surface damage; exact severity to be confirmed from photos.","locationHint":"Oak St","missing":[],"advanceTo":"photos"}
- "a wall just collapsed onto some workers" -> {"intent":"emergency","reply":"This is an emergency; please call 911 right now so responders can help the people involved. GovLink can't dispatch emergency services.","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"missing":[],"advanceTo":null}
- "someone scratched my brand new car in the parking lot" -> {"intent":"redirect","reply":"I'm sorry about your car; but vehicle damage isn't something the city handles. Please contact your insurance and the police non-emergency line. I'm here if you spot a public issue like a pothole or broken streetlight.","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"missing":[],"advanceTo":null}
- "something is broken" -> {"intent":"clarify","reply":"I can help; what exactly is broken?","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"locationHint":null,"missing":["description"],"advanceTo":null}
- "something's wrong with the road" -> {"intent":"clarify","reply":"Happy to help; what's wrong with the road? For example a pothole, a large crack, flooding, or a damaged sign.","category":null,"description":null,"baseSeverity":null,"severityRationale":null,"locationHint":null,"missing":["description"],"advanceTo":null}
- "there's a deep pothole on Oak St" -> {"intent":"ready","reply":"Thanks; a deep pothole is something the city can repair. Use the map widget below to pin the exact spot.","category":"Roads & Sidewalks","description":"A deep pothole reported on Oak St.","baseSeverity":5,"severityRationale":"A road-surface hazard that can damage vehicles but poses no immediate danger to people.","locationHint":"Oak St","missing":[],"advanceTo":null}
- "there's a pothole" (NO location given; still ready) -> {"intent":"ready","reply":"Thanks; a pothole is something the city can repair. Use the map widget below to pin the exact spot.","category":"Roads & Sidewalks","description":"A pothole reported on a city street.","baseSeverity":4,"severityRationale":"A road-surface hazard that can damage vehicles but poses no immediate danger to people.","locationHint":null,"missing":[],"advanceTo":null}
- "broken streetlight" (one bare noun, NO location; still ready) -> {"intent":"ready","reply":"Thanks; a broken streetlight is something the city can fix. Use the map widget below to pin the exact spot.","category":"Electricity/Power Lines","description":"A broken or non-functioning streetlight reported.","baseSeverity":4,"severityRationale":"Reduced nighttime visibility is a moderate safety concern, not an immediate danger.","locationHint":null,"missing":[],"advanceTo":null}
- "graffiti on a wall" (named defect, NO location; still ready) -> {"intent":"ready","reply":"Thanks; graffiti on public property is something the city can clean up. Use the map widget below to pin the exact spot.","category":"Public Safety/Hazards","description":"Graffiti reported on a wall.","baseSeverity":2,"severityRationale":"A cosmetic nuisance with no safety risk to people.","locationHint":null,"missing":[],"advanceTo":null}`;

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
- Never use em dashes (—) in "reply"; use commas, semicolons, or separate sentences instead.
- Be firm but respectful. Severity reflects public-safety risk and city triage standards; not frustration alone.
- If they complain severity is too LOW without new facts: explain why the current score fits; do NOT change baseSeverity (return null for changed fields).
- If they provide NEW safety-relevant facts (injuries, blocked traffic, schools nearby, exposed wires, etc.): update description and/or raise baseSeverity; explain the change clearly.
- If they correct factual details: update description; adjust severity only if warranted.
- Keep replies under 3 sentences. Never tell them to use a form; they use the review card below.`;

const IntakeResultSchema = z.object({
  intent: z.enum(["clarify", "ready", "emergency", "spam", "redirect"]),
  reply: z.string(),
  category: z.enum(CATEGORIES).nullable().optional(),
  description: z.string().nullable().optional(),
  baseSeverity: z.number().nullable().optional(),
  severityRationale: z.string().nullable().optional(),
  locationHint: z.string().nullable().optional(),
  missing: z.array(z.string()).optional(),
  advanceTo: z.enum(["photos"]).nullable().optional(),
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
      advanceTo: r.advanceTo ?? null,
    };
  }

  return {
    intent: r.intent,
    reply: r.reply,
    draft: null,
    missing: r.missing ?? [],
    advanceTo: r.advanceTo ?? null,
  };
}

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

  if (!getOpenAI()) {
    return NextResponse.json(
      { error: "Beacon is unavailable: no OpenAI API key configured." },
      { status: 503 }
    );
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

    const raw = await chatJSON(
      [
        { role: "system", content: REVIEW_PROMPT },
        { role: "user", content: JSON.stringify({ draft, residentMessage: latestUser }) },
      ],
      { temperature: 0.2 }
    );

    if (!raw) {
      return NextResponse.json({ error: "Beacon request failed." }, { status: 502 });
    }

    const result = ReviewResultSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json({ error: "Beacon returned an unexpected response." }, { status: 502 });
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

  // --- Intake phase --------------------------------------------------------
  const intakeSystem =
    context?.locationConfirmed && context.locationLabel
      ? `${INTAKE_PROMPT}\n\nIMPORTANT CONTEXT: The resident has ALREADY pinned the exact location via the map widget: "${context.locationLabel}". Treat the location as fully known; do NOT ask for the location again and do NOT mention the map widget. As soon as you have a clear category and description, return "ready" and simply confirm you have what you need.`
      : INTAKE_PROMPT;
  const raw = await chatJSON(
    [{ role: "system", content: intakeSystem }, ...history],
    { temperature: 0.3 }
  );
  if (!raw) {
    return NextResponse.json({ error: "Beacon request failed." }, { status: 502 });
  }

  const result = IntakeResultSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: "Beacon returned an unexpected response." }, { status: 502 });
  }

  return NextResponse.json({ ...normalizeIntake(result.data, userText), source: "openai" });
}
