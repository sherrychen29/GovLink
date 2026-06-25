import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON, getOpenAI } from "@/lib/openai";
import {
  heuristicChat,
  clamp,
  type BeaconChatResult,
} from "@/lib/beacon-logic";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

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
});

const SYSTEM_PROMPT = `You are Beacon, the intake assistant for GovLink — a platform where city residents report NON-EMERGENCY civic issues (potholes, broken streetlights, water leaks, unsafe park equipment, illegal dumping, downed lines that aren't actively dangerous, noise, stray/dead animals, hazards, etc.) to their local government.

Your job: through a short, calm, friendly conversation, gather enough detail to file ONE standardized report. Be concise and competent — no filler, no chit-chat, never more than ~3 sentences. Ask only for what's genuinely missing.

A report needs: a clear description of the problem, and a sense of where it is (Beacon collects location, photos and contact info through the form UI, so do NOT ask for photos or contact info — only nudge for location if the description has no hint of where the issue is).

You MUST classify every turn into exactly one intent and ALWAYS reply with a single JSON object (no markdown) shaped:
{
  "intent": "clarify" | "ready" | "emergency" | "spam",
  "reply": string,                 // what to say to the resident (plain text)
  "category": one of ${JSON.stringify(CATEGORIES)} | null,
  "description": string | null,    // a cleaned 1–2 sentence description, only when intent="ready"
  "baseSeverity": integer 1-10 | null, // your judgement of seriousness, only when intent="ready"
  "missing": string[]              // fields still needed, e.g. ["location"]; empty when ready
}

Intent rules:
- "emergency": fire, active crime, injury, someone in danger, gas leak, sparking/arcing live wires, anything needing immediate response. Do NOT file. reply must clearly tell them to call 911 immediately, and that GovLink can't dispatch emergency help. category/description/baseSeverity = null.
- "spam": gibberish, nonsense, abuse, or clearly not a civic issue. Politely void with a one-line explanation of what you need instead. category/description/baseSeverity = null.
- "clarify": a plausible issue but you still need more detail (what exactly is wrong, or where). Ask ONE focused question. category/description/baseSeverity = null.
- "ready": you understand the problem well enough to file. Provide category, a cleaned description, and baseSeverity. reply should briefly confirm and tell them their report is drafted on the right — to set the location, add photos if they have them, and file when ready.

baseSeverity guidance (1-10): 1-3 minor/cosmetic (graffiti, single trash bag, mild noise); 4-6 moderate (pothole, single streetlight out, cracked sidewalk, dead animal); 7-8 serious public risk (water main leak, broken traffic signal at a busy intersection, large hazard); 9-10 severe but still non-emergency (downed line not sparking, sinkhole forming). When unsure between filing and asking, prefer "ready" if the description names a concrete problem.`;

const ResultSchema = z.object({
  intent: z.enum(["clarify", "ready", "emergency", "spam"]),
  reply: z.string(),
  category: z.enum(CATEGORIES).nullable().optional(),
  description: z.string().nullable().optional(),
  baseSeverity: z.number().nullable().optional(),
  missing: z.array(z.string()).optional(),
});

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

  const { messages } = parsed.data;
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);

  // No key configured → deterministic heuristic brain.
  if (!getOpenAI()) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  const raw = await chatJSON(
    [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    { temperature: 0.3 }
  );

  if (!raw) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  const result = ResultSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ ...heuristicChat(userTurns), source: "heuristic" });
  }

  const r = result.data;
  const payload: BeaconChatResult & { source: string } = {
    intent: r.intent,
    reply: r.reply,
    draft:
      r.intent === "ready" && r.category && r.description
        ? {
            category: r.category,
            description: r.description,
            baseSeverity: clamp(Math.round(r.baseSeverity ?? 5), 1, 10),
          }
        : null,
    missing: r.missing ?? [],
    source: "openai",
  };

  return NextResponse.json(payload);
}
