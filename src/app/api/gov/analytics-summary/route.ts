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

const SYSTEM_PROMPT = `You are a municipal operations analyst writing for San Jose city staff. You are given aggregated service-request statistics and a sample of recently declined (invalid/rejected) cases. Produce two short, factual, plain-English summaries for an internal operations dashboard.

Return JSON only (no markdown):
{
  "performanceSummary": string,   // 2-3 plain sentences. Lead with a qualitative overall assessment word or phrase (e.g. "Improving", "Stable", "Declining", "Strong performance", "Below expectations") based on the resolution rate and severity trends, then state the key figures: volume, resolution/fix rate, average severity, and average days to close. Pair every qualitative judgment with the specific number that supports it.
  "closedCasesSummary": string    // 2-3 sentences. Characterize the declined (invalid) cases: how many were declined vs genuinely fixed, and the COMMON REASONS cases were declined/rejected (infer themes from the resolution notes). If there are no declined cases, write exactly: "There have been no declined issues this year."
}

Rules:
- Use the numbers given; do not invent figures.
- Write in plain, formal government English, as in an official municipal report. Short declarative sentences.
- Do not use em dashes, semicolons, marketing language, or words like "leverage", "robust", "streamline", or "notably".
- No emojis, no exclamation marks.
- "closedCasesSummary" covers DECLINED/INVALID cases only (rejected=true), not resolved ones. If declined count is 0, output the exact no-declined sentence above.`;

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
    stats.declined === 0
      ? "There have been no declined issues this year."
      : `Of ${stats.resolved} closed cases, ${stats.declined} were declined as invalid (${declinedShare}%). ` +
        `Declines typically reflect duplicate reports, items outside city jurisdiction, or insufficient detail to act.`;
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
