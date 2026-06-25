import type { Report } from "@/lib/types";
import { STATUS_PIPELINE } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { Icon } from "./CategoryIcon";
import { cx, formatDate } from "@/lib/utils";

/**
 * Horizontal pipeline tracker: Sent → Opened → In Progress → Resolved.
 * A rejected resolution still reaches "Resolved" but is tinted red.
 */
export function StatusTracker({ report }: { report: Report }) {
  const currentIndex = STATUS_PIPELINE.indexOf(report.status);
  const rejected = !!report.resolution?.rejected;

  const timeFor = (status: (typeof STATUS_PIPELINE)[number]) =>
    report.statusHistory.find((e) => e.status === status)?.at;

  return (
    <ol
      className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0"
      aria-label="Report status progress"
    >
      {STATUS_PIPELINE.map((status, i) => {
        const meta = STATUS_META[status];
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const isResolvedStep = status === "resolved";
        const tintRejected = isResolvedStep && reached && rejected;
        const at = timeFor(status);

        return (
          <li
            key={status}
            className="relative flex flex-1 gap-3 sm:flex-col sm:gap-0"
            aria-current={isCurrent ? "step" : undefined}
          >
            {/* connector (desktop) */}
            {i > 0 && (
              <span
                className={cx(
                  "absolute hidden h-0.5 sm:block",
                  "left-[-50%] right-[50%] top-4",
                  reached ? "bg-accent-400" : "bg-navy-100"
                )}
                aria-hidden="true"
              />
            )}
            {/* connector (mobile, vertical) */}
            {i > 0 && (
              <span
                className={cx(
                  "absolute left-[15px] top-[-14px] h-[14px] w-0.5 sm:hidden",
                  reached ? "bg-accent-400" : "bg-navy-100"
                )}
                aria-hidden="true"
              />
            )}

            <span
              className={cx(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white transition-colors sm:mx-auto",
                tintRejected
                  ? "bg-red-500 text-white"
                  : reached
                    ? "bg-accent-500 text-white"
                    : "bg-navy-100 text-navy-400"
              )}
            >
              <Icon
                name={tintRejected ? "TriangleAlert" : meta.icon}
                className={cx("h-4 w-4", isCurrent && status === "in_progress" && "motion-safe:animate-spin")}
              />
            </span>

            <div className="pb-4 sm:mt-2 sm:px-1 sm:text-center">
              <p
                className={cx(
                  "text-sm font-semibold",
                  reached ? "text-navy-900" : "text-navy-400"
                )}
              >
                {tintRejected ? "Resolved · Declined" : meta.label}
              </p>
              {at && reached ? (
                <p className="text-xs text-ink-muted">{formatDate(at)}</p>
              ) : (
                <p className="text-xs text-navy-300">Pending</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
