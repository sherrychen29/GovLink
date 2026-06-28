import { Users } from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_META } from "@/lib/meta";
import { CategoryIcon } from "./CategoryIcon";
import { cx } from "@/lib/utils";

export function CategoryChip({
  category,
  size = "md",
  variant = "chip",
  className,
}: {
  category: Category;
  size?: "sm" | "md";
  /** "chip" = colored bubble; "label" = no bubble, larger text */
  variant?: "chip" | "label";
  className?: string;
}) {
  if (variant === "label") {
    // Extract text color from chip string (e.g. "bg-sky-50 text-sky-700 ring-1 ring-sky-200" → "text-sky-700")
    const textColor = CATEGORY_META[category].chip.split(" ").find((c) => c.startsWith("text-")) ?? "text-navy-700";
    return (
      <span className={cx("inline-flex items-center gap-1.5 text-sm font-semibold", textColor, className)}>
        <CategoryIcon category={category} className="h-4 w-4" />
        {category}
      </span>
    );
  }

  return (
    <span
      className={cx(
        "chip font-medium",
        CATEGORY_META[category].chip,
        size === "sm" && "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      <CategoryIcon
        category={category}
        className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
      />
      {category}
    </span>
  );
}

/** "3 residents reported this" — shown when a report has corroborations. */
export function CorroborationBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count < 2) return null;
  return (
    <span
      className={cx(
        "chip bg-accent-50 font-semibold text-accent-700 ring-1 ring-accent-200",
        className
      )}
      title={`${count} separate residents reported this issue`}
    >
      <Users className="h-3.5 w-3.5" aria-hidden="true" />
      {count} residents reported this
    </span>
  );
}
