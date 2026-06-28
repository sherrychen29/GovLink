// Server-only OpenAI helper. The API key is read from the environment and is
// NEVER imported into client code. If the key is absent, callers fall back to
// the heuristic engine in beacon-logic.ts.

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-your-")) return null;
  if (!client) client = new OpenAI({ apiKey: key });
  return client;
}

export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Call the model expecting a single JSON object back. Returns the parsed object
 * or null on any failure, so callers can fall back gracefully.
 */
export async function chatJSON(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { temperature?: number } = {}
): Promise<Record<string, unknown> | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages,
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    console.error("[beacon] OpenAI call failed:", err);
    return null;
  }
}

/**
 * Multimodal variant of {@link chatJSON}: sends a system prompt plus a single
 * user turn carrying text and one image (data URL or http URL), expecting a
 * JSON object back. Returns null on any failure so callers can fall back.
 */
export async function visionJSON(
  systemPrompt: string,
  userText: string,
  imageUrl: string,
  opts: { temperature?: number } = {}
): Promise<Record<string, unknown> | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    console.error("[beacon] OpenAI vision call failed:", err);
    return null;
  }
}
