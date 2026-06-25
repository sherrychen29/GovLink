import type { ReportStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { Icon } from "./CategoryIcon";
import { cx } from "@/lib/utils";

export function StatusPill({
  status,
  rejected = false,
  size = "md",
  className,
}: {
  status: ReportStatus;
  rejected?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = STATUS_META[status];
  const showRejected = status === "resolved" && rejected;
  const pill = showRejected
    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
    : meta.pill;
  const label = showRejected ? "Resolved · Declined" : meta.label;

  return (
    <span
      className={cx(
        "chip font-semibold",
        pill,
        size === "sm" && "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      <Icon
        name={showRejected ? "TriangleAlert" : meta.icon}
        className={cx(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
      />
      {label}
    </span>
  );
}
