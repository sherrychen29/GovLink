// TEMPORARY verification endpoint — records the browser PDF test outcome.
import { NextRequest } from "next/server";
import { appendFileSync } from "node:fs";

export async function GET(req: NextRequest) {
  const r = req.nextUrl.searchParams.get("r") ?? "(none)";
  appendFileSync("/tmp/pdftest-result.txt", r + "\n");
  return new Response("ok");
}
