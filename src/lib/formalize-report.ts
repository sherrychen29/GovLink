import type { Category, FormalizedReport, ReportLocation } from "./types";

export function locationLabel(loc: ReportLocation | null | undefined): string | undefined {
  if (!loc) return undefined;
  return loc.address || loc.crossStreet || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}

/** Ask Beacon to polish resident wording into municipal service-request language. */
export async function formalizeReport(input: {
  description: string;
  category?: Category;
  location?: ReportLocation | null;
}): Promise<FormalizedReport> {
  const res = await fetch("/api/beacon/formalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: input.description.trim(),
      category: input.category,
      locationLabel: locationLabel(input.location),
    }),
  });
  if (!res.ok) throw new Error("formalize failed");
  return res.json();
}
