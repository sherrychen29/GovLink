"use client";

import { severityMeta } from "@/lib/meta";
import { cx } from "@/lib/utils";

export function SeverityRangeSlider({
  min,
  max,
  onChange,
  className,
}: {
  min: number;
  max: number;
  onChange: (next: { min: number; max: number }) => void;
  className?: string;
}) {
  const minPercent = ((min - 1) / 9) * 100;
  const maxPercent = ((max - 1) / 9) * 100;
  const minColor = severityMeta(min).hex;
  const maxColor = severityMeta(max).hex;

  return (
    <div className={cx("relative mx-0.5 h-10 pt-1", className)}>
      {/* dimmed full-range track */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full opacity-25"
        style={{ background: "linear-gradient(90deg, #86efac, #fde047, #fdba74, #fca5a5)" }}
      />
      {/* active range — gradient sized to the full track width so colors stay consistent */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{ left: `${minPercent}%`, width: `${Math.max(maxPercent - minPercent, 0)}%` }}
      >
        <div
          className="absolute top-0 h-full"
          style={{
            left: `-${minPercent}%`,
            width: `${100 / Math.max((maxPercent - minPercent) / 100, 0.01)}%`,
            background: "linear-gradient(90deg, #86efac, #fde047, #fdba74, #fca5a5)",
          }}
        />
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={min}
        aria-label="Minimum severity"
        onChange={(e) => {
          const nextMin = Number(e.target.value);
          onChange({ min: Math.min(nextMin, max), max });
        }}
        className="gov-severity-range"
        style={{
          zIndex: min > max - 1 ? 3 : 2,
          ["--thumb-color" as string]: minColor,
        }}
      />
      <input
        type="range"
        min={1}
        max={10}
        value={max}
        aria-label="Maximum severity"
        onChange={(e) => {
          const nextMax = Number(e.target.value);
          onChange({ min, max: Math.max(nextMax, min) });
        }}
        className="gov-severity-range"
        style={{
          zIndex: 2,
          ["--thumb-color" as string]: maxColor,
        }}
      />
    </div>
  );
}
