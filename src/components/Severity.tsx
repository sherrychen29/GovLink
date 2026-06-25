import { severityMeta } from "@/lib/meta";
import { cx } from "@/lib/utils";

/** Compact severity bar (10 segments) with a numeric + band label. */
export function SeverityBar({
  severity,
  showLabel = true,
  className,
}: {
  severity: number;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = severityMeta(severity);
  return (
    <div
      className={cx("flex items-center gap-2.5", className)}
      role="img"
      aria-label={`Severity ${severity} of 10, ${meta.label}`}
    >
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cx(
              "h-3.5 w-1.5 rounded-full transition-colors",
              i < severity ? meta.bar : "bg-navy-100"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cx("text-xs font-semibold", meta.text)}>
          {severity}
          <span className="font-medium text-ink-muted">/10 · {meta.label}</span>
        </span>
      )}
    </div>
  );
}

/** A colored severity dot with the number — for dense lists. */
export function SeverityDot({
  severity,
  className,
}: {
  severity: number;
  className?: string;
}) {
  const meta = severityMeta(severity);
  return (
    <span
      className={cx(
        "inline-grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white",
        className
      )}
      style={{ backgroundColor: meta.hex }}
      role="img"
      aria-label={`Severity ${severity} of 10, ${meta.label}`}
    >
      {severity}
    </span>
  );
}
