import { Users } from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_META } from "@/lib/meta";
import { CategoryIcon } from "./CategoryIcon";
import { cx } from "@/lib/utils";

export function CategoryChip({
  category,
  size = "md",
  className,
}: {
  category: Category;
  size?: "sm" | "md";
  className?: string;
}) {
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
