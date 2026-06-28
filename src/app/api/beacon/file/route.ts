import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON, getOpenAI } from "@/lib/openai";
import { haversineMeters } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

const CandidateSchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  description: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const RequestSchema = z.object({
  draft: z.object({
    category: z.enum(CATEGORIES),
    description: z.string().max(2000),
    lat: z.number(),
    lng: z.number(),
  }),
  candidates: z.array(CandidateSchema).max(60),
});

const SYSTEM_PROMPT = `You are Beacon's deduplication engine for a civic reporting system. You are given a NEW report draft and a list of EXISTING open reports (candidates). Decide whether the new report describes the SAME real-world issue as one of the candidates.

Two reports match only if they are clearly the same physical issue: same category, very close location (typically within ~150 meters), and the descriptions plausibly refer to the same thing. Different issues that merely share a category do NOT match. When in doubt, do NOT merge.

Reply with a single JSON object (no markdown):
{
  "matchId": string | null,   // id of the matching candidate, or null to file new
  "rationale": string         // one short sentence explaining the decision
}`;

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

  const { draft, candidates } = parsed.data;

  const nearby = candidates
    .map((c) => ({
      ...c,
      distanceM: Math.round(
        haversineMeters({ lat: draft.lat, lng: draft.lng }, { lat: c.lat, lng: c.lng })
      ),
    }))
    .filter((c) => c.distanceM <= 400)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 12);

  if (nearby.length === 0) {
    return NextResponse.json({
      matchId: null,
      rationale: "No open reports nearby — filing a new ticket.",
      distanceM: null,
      source: "geo",
    });
  }

  const raw = await chatJSON(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          newReport: {
            category: draft.category,
            description: draft.description,
            lat: draft.lat,
            lng: draft.lng,
          },
          candidates: nearby.map((c) => ({
            id: c.id,
            category: c.category,
            description: c.description,
            distanceMeters: c.distanceM,
          })),
        }),
      },
    ],
    { temperature: 0 }
  );

  const ResultSchema = z.object({
    matchId: z.string().nullable(),
    rationale: z.string(),
  });
  const result = raw ? ResultSchema.safeParse(raw) : null;

  if (!result?.success) {
    return NextResponse.json({ error: "Beacon request failed." }, { status: 502 });
  }

  const matchId =
    result.data.matchId && nearby.some((c) => c.id === result.data.matchId)
      ? result.data.matchId
      : null;
  const matched = nearby.find((c) => c.id === matchId);

  return NextResponse.json({
    matchId,
    rationale: result.data.rationale,
    distanceM: matched?.distanceM ?? null,
    source: "openai",
  });
}
