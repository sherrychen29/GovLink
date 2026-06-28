import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, visionJSON } from "@/lib/openai";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

// Reject oversized payloads early; the client already caps uploads at 4MB,
// and a base64 data URL is ~1.34x the raw bytes.
const MAX_DATA_URL_CHARS = 7_000_000;

const RequestSchema = z.object({
  imageDataUrl: z
    .string()
    .max(MAX_DATA_URL_CHARS)
    .refine((s) => /^data:image\//.test(s) || /^https?:\/\//.test(s), {
      message: "imageDataUrl must be an image data URL or http(s) URL",
    }),
  category: z.enum(CATEGORIES).optional(),
  description: z.string().max(2000).optional(),
  clarification: z.string().max(500).optional(),
});

export type CaptionStatus = "ok" | "vague" | "inappropriate";

export interface CaptionResult {
  status: CaptionStatus;
  /** One-line factual caption shown beneath the photo on the report. */
  caption: string;
  /** Resident-facing guidance when the photo is flagged (empty when ok). */
  message: string;
  source: "openai" | "unavailable";
}

const SYSTEM_PROMPT = `You are Beacon's photo reviewer for GovLink, a system where San Jose residents attach photos to NON-EMERGENCY civic infrastructure reports (potholes, broken streetlights, water leaks, fallen trees, illegal dumping, graffiti, damaged sidewalks, downed lines, overflowing bins, etc.).

You are shown ONE photo, the report category, the resident's text description, and an optional clarification the resident typed about the photo. Judge the photo and return JSON only (no markdown):
{
  "status": "ok" | "vague" | "inappropriate",
  "caption": string,   // present for every status
  "message": string    // "" when ok; otherwise a short, warm guidance sentence
}

Decide status by reasoning about the photo in the civic-report context:

- "inappropriate": the photo cannot belong on a civic infrastructure report; it shows people as the subject (selfies, portraits), nudity or sexual content, violence or gore, a meme or screenshot, a document with personal data, advertising, or content that is offensive or clearly unrelated to a public-works issue. Set message asking the resident to choose a photo that actually shows the issue they are reporting. caption: a brief neutral description of what the image is.

- "vague": the photo plausibly relates to a real issue but you cannot tell what civic problem it depicts; too dark, too blurry, too zoomed in/out, or genuinely ambiguous. Set message asking the resident to either retake/choose a clearer photo of the issue OR clarify in a sentence what the photo shows. caption: your best-guess description, noting the uncertainty.

- "ok": the photo reasonably depicts a civic infrastructure issue (or its location/context). Set message to "". caption: ONE factual, specific sentence a city work crew could read at a glance; name the object and its visible condition, e.g. "A large pothole in the right lane with cracked, crumbling asphalt." Do not invent details you cannot see. Do not include the resident's name or any personal info.

Use the resident's description and clarification to interpret an otherwise-ambiguous photo: if their words plausibly explain it, prefer "ok". When genuinely unsure between vague and ok, choose "ok" with a hedged caption rather than nagging the resident. Reserve "inappropriate" for photos that truly do not belong.

Keep caption under 160 characters and message under 200 characters. Be factual and neutral. No emojis.`;

const ResultSchema = z.object({
  status: z.enum(["ok", "vague", "inappropriate"]),
  caption: z.string(),
  message: z.string().optional(),
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

  // Captioning is an AI-only feature: with no key, skip it and let the photo
  // through uncaptioned so report filing still works.
  if (!getOpenAI()) {
    const payload: CaptionResult = {
      status: "ok",
      caption: "",
      message: "",
      source: "unavailable",
    };
    return NextResponse.json(payload);
  }

  const { imageDataUrl, category, description, clarification } = parsed.data;

  const userText = JSON.stringify({
    category: category ?? null,
    residentDescription: description ?? null,
    residentClarification: clarification ?? null,
  });

  const raw = await visionJSON(SYSTEM_PROMPT, userText, imageDataUrl, {
    temperature: 0.2,
  });

  const result = raw ? ResultSchema.safeParse(raw) : null;

  // On any model/parse failure, don't block the resident; let the photo
  // through without a caption.
  if (!result?.success) {
    const payload: CaptionResult = {
      status: "ok",
      caption: "",
      message: "",
      source: "unavailable",
    };
    return NextResponse.json(payload);
  }

  const r = result.data;
  const payload: CaptionResult = {
    status: r.status,
    caption: r.caption.trim().slice(0, 200),
    message: (r.message ?? "").trim().slice(0, 240),
    source: "openai",
  };
  return NextResponse.json(payload);
}
