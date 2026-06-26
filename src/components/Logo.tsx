import Image from "next/image";
import officialLogo from "@/app/officialLogo.png";
import beaconLogo from "@/app/12.png";
import { cx } from "@/lib/utils";

/**
 * GovLink logomark — a "beacon": a solid point emitting two signal arcs,
 * echoing the guiding-light metaphor and the citizen↔government link.
 * Used in Beacon chat bubbles where the full wordmark image is too wide.
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

/** Beacon assistant avatar — navy tile with the interlock mark. */
export function BeaconMark({
  className,
  iconClassName,
  size = "sm",
}: {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-8 w-8" : "h-7 w-7";
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-lg bg-navy-900",
        box,
        className
      )}
      aria-hidden="true"
    >
      <Image
        src={beaconLogo}
        alt=""
        width={beaconLogo.width}
        height={beaconLogo.height}
        className={cx(icon, "object-contain mix-blend-screen", iconClassName)}
      />
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  /** Kept for API compatibility; the logo image includes the wordmark. */
  showWordmark?: boolean;
}) {
  void showWordmark;
  return (
    <span className={cx("inline-flex items-center", className)}>
      <Image
        src={officialLogo}
        alt="GovLink"
        width={officialLogo.width}
        height={officialLogo.height}
        priority
        className={cx("h-8 w-auto", markClassName)}
      />
    </span>
  );
}
