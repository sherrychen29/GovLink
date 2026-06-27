import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatJSON } from "@/lib/openai";

export const runtime = "nodejs";

const RequestSchema = z.object({
  stats: z.object({
    year: z.number(),
    total: z.number(),
    open: z.number(),
    resolved: z.number(),
    fixed: z.number(),
    declined: z.number(),
    resolutionRate: z.number(),
    avgSeverity: z.number().nullable(),
    corroborated: z.number(),
    avgResolutionDays: z.number().nullable(),
  }),
  categories: z
    .array(z.object({ category: z.string(), total: z.number(), solved: z.number() }))
    .max(40),
  closedCases: z
    .array(
      z.object({
        category: z.string(),
        severity: z.number(),
        rejected: z.boolean(),
        note: z.string().max(280),
      })
    )
    .max(80),
});

const SYSTEM_PROMPT = `You are a municipal operations analyst writing for San Jose city staff. You are given aggregated service-request statistics and a sample of recently closed cases. Produce two short, factual, plain-English summaries for an internal operations dashboard.

Return JSON only (no markdown):
{
  "performanceSummary": string,   // 2-3 plain sentences. State the figures: volume, resolution/fix rate, average severity, and average days to close. Report the facts directly.
  "closedCasesSummary": string    // 2-3 sentences. Characterize the closed cases: how many were genuinely fixed vs declined/rejected, and the COMMON REASONS cases were closed or rejected (infer themes from the resolution notes). Be specific about why.
}

Rules:
- Use the numbers given; do not invent figures.
- Write in plain, formal government English, as in an official municipal report. Short declarative sentences.
- Do not use em dashes, semicolons, marketing language, or words like "leverage", "robust", "streamline", or "notably". Avoid adjectives that praise or editorialize.
- No emojis, no exclamation marks.
- "closedCasesSummary" must address WHY cases closed (fixed vs declined) and the recurring reasons, drawn from the notes.`;

function heuristicSummaries(body: z.infer<typeof RequestSchema>) {
  const { stats } = body;
  const declinedShare =
    stats.resolved > 0 ? Math.round((stats.declined / stats.resolved) * 100) : 0;
  const performanceSummary =
    `In ${stats.year}, residents filed ${stats.total} service requests. ` +
    `Of these, ${stats.resolved} were closed, a resolution rate of ${stats.resolutionRate} percent. ` +
    `${stats.fixed} were fixed and ${stats.declined} were declined. ` +
    `The average severity was ${stats.avgSeverity ?? "not available"} out of 10` +
    (stats.avgResolutionDays != null
      ? `. The average time to close a case was ${stats.avgResolutionDays} days.`
      : ".");
  const closedCasesSummary =
    `Of ${stats.resolved} closed cases, ${stats.fixed} were resolved through action and ${stats.declined} ` +
    `were declined (${declinedShare}%). Declines typically reflect duplicate reports, items outside city ` +
    `jurisdiction, or insufficient detail to act; resolved cases were closed after the reported condition was addressed.`;
  return { performanceSummary, closedCasesSummary };
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const fallback = heuristicSummaries(body);

  const result = await chatJSON(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          stats: body.stats,
          categories: body.categories,
          closedCases: body.closedCases,
        }),
      },
    ],
    { temperature: 0.3 }
  );

  const performanceSummary =
    typeof result?.performanceSummary === "string"
      ? result.performanceSummary
      : fallback.performanceSummary;
  const closedCasesSummary =
    typeof result?.closedCasesSummary === "string"
      ? result.closedCasesSummary
      : fallback.closedCasesSummary;

  return NextResponse.json({
    performanceSummary,
    closedCasesSummary,
    source: result ? "openai" : "heuristic",
  });
}
