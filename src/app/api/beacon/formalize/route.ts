import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON, getOpenAI } from "@/lib/openai";
import { clamp, priorityFromSeverity } from "@/lib/beacon-logic";
import { CATEGORIES, type FormalizedReport } from "@/lib/types";

export const runtime = "nodejs";

const RequestSchema = z.object({
  description: z.string().min(4).max(4000),
  category: z.enum(CATEGORIES).optional(),
  locationLabel: z.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You convert resident civic issue reports into formal municipal service-request language for San Jose city staff work queues.

Input: informal resident description, optional category hint, optional location label.

Reply with JSON only (no markdown):
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "formalTitle": string,          // concise municipal title, e.g. "Traffic Signal Malfunction — Pine St & Main St"
  "formalDescription": string,    // 2-4 sentences, third-person, professional, no slang; structure like a work order
  "baseSeverity": integer 1-10
}

Rules for formalDescription:
- Use municipal tone: "The citizen indicates…", "Observed condition…", "Location reference…"
- Always refer to the person who submitted the report as "The citizen" — never "the reporting party", "the complainant", "the reporter", or any other term
- Be factual and neutral — do not invent details not in the resident text
- Include location reference when provided
- End with priority framing if appropriate
- No emojis, exclamation marks, or casual language

formalTitle: short, scannable, includes issue type and location when known.

baseSeverity: same rubric as intake — 1-3 minor, 4-6 moderate, 7-8 serious, 9-10 severe non-emergency.
If category hint conflicts with content, choose the best fit from the content.`;

const ResultSchema = z.object({
  category: z.enum(CATEGORIES),
  formalTitle: z.string(),
  formalDescription: z.string(),
  baseSeverity: z.number(),
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

  if (!getOpenAI()) {
    return NextResponse.json(
      { error: "Beacon is unavailable: no OpenAI API key configured." },
      { status: 503 }
    );
  }

  const { description, category, locationLabel } = parsed.data;

  const raw = await chatJSON(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          residentDescription: description,
          categoryHint: category ?? null,
          locationLabel: locationLabel ?? null,
        }),
      },
    ],
    { temperature: 0.2 }
  );

  if (!raw) {
    return NextResponse.json({ error: "Beacon request failed." }, { status: 502 });
  }

  const result = ResultSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: "Beacon returned an unexpected response." }, { status: 502 });
  }

  const r = result.data;
  const baseSeverity = clamp(Math.round(r.baseSeverity), 1, 10);
  const payload: FormalizedReport & { source: string } = {
    category: r.category,
    formalTitle: r.formalTitle.trim().slice(0, 160),
    formalDescription: r.formalDescription.trim(),
    baseSeverity,
    servicePriority: priorityFromSeverity(baseSeverity),
    source: "openai",
  };

  return NextResponse.json(payload);
}
