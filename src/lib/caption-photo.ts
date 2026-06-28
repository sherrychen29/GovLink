import type { Category } from "./types";
import type { CaptionResult } from "@/app/api/beacon/caption/route";

export type { CaptionResult, CaptionStatus } from "@/app/api/beacon/caption/route";

/** Ask Beacon's vision model to caption and vet an uploaded photo. */
export async function captionPhoto(input: {
  imageDataUrl: string;
  category?: Category | "";
  description?: string;
  clarification?: string;
}): Promise<CaptionResult> {
  const res = await fetch("/api/beacon/caption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl: input.imageDataUrl,
      category: input.category || undefined,
      description: input.description?.trim() || undefined,
      clarification: input.clarification?.trim() || undefined,
    }),
  });
  if (!res.ok) throw new Error("caption failed");
  return res.json();
}
