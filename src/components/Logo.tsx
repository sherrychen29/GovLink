import { cx } from "@/lib/utils";

/**
 * GovLink logomark — a "beacon": a solid point emitting two signal arcs,
 * echoing the guiding-light metaphor and the citizen↔government link.
 */
export function LogoMark({
  className,
  title = "GovLink",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cx("shrink-0", className)}
      role="img"
      aria-label={title}
      fill="none"
    >
      <rect width="32" height="32" rx="8" className="fill-navy-900" />
      {/* signal arcs */}
      <path
        d="M11.2 20.8a6.8 6.8 0 0 1 9.6 0"
        stroke="currentColor"
        className="text-accent-400"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M8.4 18a10.8 10.8 0 0 1 15.2 0"
        stroke="currentColor"
        className="text-accent-400"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.28"
      />
      {/* beacon point */}
      <circle cx="16" cy="22.2" r="3.1" className="fill-accent-400" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cx("h-8 w-8", markClassName)} />
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-navy-900">
          Gov<span className="text-accent-500">Link</span>
        </span>
      )}
    </span>
  );
}
