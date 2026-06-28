"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  X,
  Film,
  Loader2,
  TriangleAlert,
  Ban,
  Sparkles,
} from "lucide-react";
import type { Category, MediaItem } from "@/lib/types";
import { cx, uid } from "@/lib/utils";
import { captionPhoto } from "@/lib/caption-photo";

const MAX_ITEMS = 5;
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — keep localStorage healthy

type ReviewState =
  | { status: "captioning" }
  | { status: "ok" }
  | { status: "vague" | "inappropriate"; message: string }
  | { status: "error" };

export function MediaUpload({
  items,
  onChange,
  category,
  description,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  /** Report context — sharpens the vision model's captioning + vetting. */
  category?: Category | "";
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Transient per-photo review UI (spinner / flag message). Persisted results
  // (caption, flagged) live on the MediaItem itself.
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [clarifyText, setClarifyText] = useState<Record<string, string>>({});

  // Always read the latest items inside async callbacks (controlled component).
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const startedRef = useRef<Set<string>>(new Set());

  const setReview = useCallback((id: string, state: ReviewState) => {
    setReviews((prev) => ({ ...prev, [id]: state }));
  }, []);

  const patchItem = useCallback(
    (id: string, patch: Partial<MediaItem>) => {
      onChange(
        itemsRef.current.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    [onChange]
  );

  const runCaption = useCallback(
    async (item: MediaItem, clarification?: string) => {
      setReview(item.id, { status: "captioning" });
      try {
        const r = await captionPhoto({
          imageDataUrl: item.dataUrl,
          category,
          description,
          clarification,
        });
        if (r.status === "ok") {
          patchItem(item.id, { caption: r.caption || undefined, flagged: false });
          setReview(item.id, { status: "ok" });
        } else {
          patchItem(item.id, {
            caption: r.caption || undefined,
            flagged: true,
          });
          setReview(item.id, { status: r.status, message: r.message });
        }
      } catch {
        // Network/model failure: don't block the resident, just skip the caption.
        patchItem(item.id, { flagged: false });
        setReview(item.id, { status: "error" });
      }
    },
    [category, description, patchItem, setReview]
  );

  // Caption any newly added image exactly once.
  useEffect(() => {
    items.forEach((m) => {
      if (m.kind !== "image") return;
      if (m.caption !== undefined || m.flagged !== undefined) return;
      if (startedRef.current.has(m.id)) return;
      startedRef.current.add(m.id);
      void runCaption(m);
    });
  }, [items, runCaption]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const remaining = MAX_ITEMS - items.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_ITEMS} files.`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const accepted: MediaItem[] = [];
    let pending = selected.length;
    if (pending === 0) return;

    selected.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        setError("Only images and short video clips are supported.");
        pending--;
        if (pending === 0 && accepted.length) onChange([...items, ...accepted]);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Each file must be under 4MB for this demo.");
        pending--;
        if (pending === 0 && accepted.length) onChange([...items, ...accepted]);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        accepted.push({
          id: uid("media"),
          dataUrl: String(reader.result),
          kind: isVideo ? "video" : "image",
          name: file.name,
        });
        pending--;
        if (pending === 0) onChange([...items, ...accepted]);
      };
      reader.onerror = () => {
        pending--;
        if (pending === 0 && accepted.length) onChange([...items, ...accepted]);
      };
      reader.readAsDataURL(file);
    });
  }

  function remove(id: string) {
    onChange(items.filter((m) => m.id !== id));
    startedRef.current.delete(id);
    setReviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setClarifyText((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setError(null);
  }

  function replace(id: string) {
    remove(id);
    // Let state settle, then reopen the picker for a fresh photo.
    requestAnimationFrame(() => inputRef.current?.click());
  }

  function submitClarification(item: MediaItem) {
    const text = (clarifyText[item.id] ?? "").trim();
    if (!text) return;
    void runCaption(item, text);
  }

  const flagged = items.filter(
    (m): m is MediaItem => {
      const r = reviews[m.id];
      return r?.status === "vague" || r?.status === "inappropriate";
    }
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        {items.map((m) => {
          const review = reviews[m.id];
          const isImage = m.kind === "image";
          const flaggedKind =
            review?.status === "inappropriate"
              ? "inappropriate"
              : review?.status === "vague"
                ? "vague"
                : null;
          return (
            <figure key={m.id} className="w-28">
              <div
                className={cx(
                  "group relative h-24 w-24 overflow-hidden rounded-xl border bg-navy-50",
                  flaggedKind === "inappropriate"
                    ? "border-red-300 ring-2 ring-red-200"
                    : flaggedKind === "vague"
                      ? "border-amber-300 ring-2 ring-amber-200"
                      : "border-navy-200"
                )}
              >
                {m.kind === "video" ? (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-navy-500">
                    <Film className="h-6 w-6" aria-hidden="true" />
                    <span className="px-1 text-[10px] leading-tight">Video</span>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.dataUrl}
                    alt={m.caption || m.name || "Attached photo"}
                    className="h-full w-full object-cover"
                  />
                )}

                {isImage && review?.status === "captioning" && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-navy-900/55 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span className="text-[10px] font-semibold">Analyzing…</span>
                  </span>
                )}

                {flaggedKind && (
                  <span
                    className={cx(
                      "absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full text-white",
                      flaggedKind === "inappropriate" ? "bg-red-600" : "bg-amber-500"
                    )}
                    aria-hidden="true"
                  >
                    {flaggedKind === "inappropriate" ? (
                      <Ban className="h-3.5 w-3.5" />
                    ) : (
                      <TriangleAlert className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-navy-900/80 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${m.name || "attachment"}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {isImage && m.caption && review?.status === "ok" && (
                <figcaption className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-ink-soft">
                  <Sparkles
                    className="mt-0.5 h-3 w-3 shrink-0 text-accent-500"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-3">{m.caption}</span>
                </figcaption>
              )}
            </figure>
          );
        })}

        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-navy-200 text-navy-400 transition-colors hover:border-accent-300 hover:bg-accent-50/40 hover:text-accent-600"
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs font-medium">Add</span>
          </button>
        )}
      </div>

      {/* Flagged-photo guidance: ask the resident to replace or clarify. */}
      {flagged.map((m) => {
        const review = reviews[m.id];
        if (review?.status !== "vague" && review?.status !== "inappropriate")
          return null;
        const inappropriate = review.status === "inappropriate";
        return (
          <div
            key={`flag-${m.id}`}
            className={cx(
              "rounded-xl border px-4 py-3 text-sm",
              inappropriate
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            )}
            role="alert"
          >
            <div className="flex items-start gap-2">
              {inappropriate ? (
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              ) : (
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0">
                <p className="font-semibold">
                  {inappropriate
                    ? "This photo doesn't look right for a city report"
                    : "Beacon couldn't tell what this photo shows"}
                </p>
                <p className="mt-0.5">{review.message}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label
                htmlFor={`clarify-${m.id}`}
                className="block text-xs font-semibold uppercase tracking-wide opacity-80"
              >
                Tell Beacon what the photo shows
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id={`clarify-${m.id}`}
                  type="text"
                  className="field-input flex-1 text-sm"
                  placeholder="e.g. the cracked sidewalk slab near the curb"
                  value={clarifyText[m.id] ?? ""}
                  onChange={(e) =>
                    setClarifyText((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitClarification(m);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitClarification(m)}
                    disabled={!(clarifyText[m.id] ?? "").trim()}
                    className="btn-accent shrink-0 px-3 py-2 text-sm"
                  >
                    Re-check
                  </button>
                  <button
                    type="button"
                    onClick={() => replace(m.id)}
                    className="btn-outline shrink-0 px-3 py-2 text-sm"
                  >
                    Replace photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        aria-label="Attach photos or video"
      />

      <p className="field-hint">
        Optional · up to {MAX_ITEMS} photos or short clips, 4MB each. Beacon
        captions each photo for city staff.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
