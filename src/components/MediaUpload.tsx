"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Film } from "lucide-react";
import type { MediaItem } from "@/lib/types";
import { uid } from "@/lib/utils";

const MAX_ITEMS = 3;
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — keep localStorage healthy

export function MediaUpload({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (pending === 0 && accepted.length)
          onChange([...items, ...accepted]);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Each file must be under 4MB for this demo.");
        pending--;
        if (pending === 0 && accepted.length)
          onChange([...items, ...accepted]);
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
        if (pending === 0 && accepted.length)
          onChange([...items, ...accepted]);
      };
      reader.readAsDataURL(file);
    });
  }

  function remove(id: string) {
    onChange(items.filter((m) => m.id !== id));
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {items.map((m) => (
          <figure
            key={m.id}
            className="group relative h-24 w-24 overflow-hidden rounded-xl border border-navy-200 bg-navy-50"
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
                alt={m.name || "Attached photo"}
                className="h-full w-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => remove(m.id)}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-navy-900/80 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
              aria-label={`Remove ${m.name || "attachment"}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </figure>
        ))}

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
        Optional · up to {MAX_ITEMS} photos or short clips, 4MB each.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
