import Image from "next/image";
import { cx } from "@/lib/utils";

const BEACON_AVATAR = "/images/beacon-avatar.png";
const GOVLINK_LOGO = "/images/govlink-logo.png";

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
        src={BEACON_AVATAR}
        alt=""
        width={2000}
        height={2000}
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
        src={GOVLINK_LOGO}
        alt="GovLink"
        width={2000}
        height={692}
        priority
        className={cx("h-8 w-auto", markClassName)}
      />
    </span>
  );
}
