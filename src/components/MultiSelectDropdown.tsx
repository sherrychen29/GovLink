"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/utils";

export function MultiSelectDropdown<T extends string>({
  label,
  summaryAll,
  options,
  selected,
  onToggle,
  getLabel,
  className,
  labelClassName,
}: {
  label: string;
  summaryAll: string;
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  getLabel: (value: T) => string;
  className?: string;
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const summary =
    selected.length === 0 || selected.length === options.length
      ? summaryAll
      : selected.length <= 2
        ? selected.map(getLabel).join(", ")
        : `${selected.length} selected`;

  return (
    <div ref={ref} className={cx("relative", className)}>
      <span className={labelClassName ?? "field-label"}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cx(
          "field-input flex w-full items-center justify-between gap-2 text-left text-sm",
          selected.length > 0 && "border-navy-400 bg-navy-50/50 font-medium text-navy-900"
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          className={cx("h-4 w-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-50 mt-1 max-h-60 w-full min-w-[12rem] overflow-y-auto rounded-lg border border-navy-200 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-navy-50",
                  checked && "bg-navy-50/80"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-navy-300 text-accent-600 focus:ring-accent-400"
                  checked={checked}
                  onChange={() => onToggle(opt)}
                />
                <span className="text-navy-900">{getLabel(opt)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
