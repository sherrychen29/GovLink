"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { useCurrentUser, logout } from "@/lib/store";
import { CITY_PARTNERS } from "@/lib/partners";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report an issue" },
  { href: "/track", label: "Track a report" },
  { href: "/resolved", label: "Resolved issues" },
];

// Button styles tuned for a solid navy header — high contrast, clearly visible.
const NAVY_OUTLINE_BTN =
  "btn border-2 border-white bg-white/10 text-white font-semibold hover:bg-white hover:text-navy-900";
const NAVY_GHOST_BTN =
  "btn border-2 border-white/60 text-white font-semibold hover:border-white hover:bg-white hover:text-navy-900";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const isGov = hydrated && user?.role === "government";

  return (
    <header className="sticky top-0 z-[1100] border-b border-navy-800 bg-navy-900 shadow-md shadow-navy-950/20">
      <div className="gl-container flex min-h-16 items-center justify-between gap-4 py-2">
        <Link
          href="/"
          className="flex flex-col gap-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          aria-label="GovLink home"
        >
          <Logo markClassName="h-8 w-auto brightness-0 invert" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-200/90 sm:text-xs">
            CITY OF SAN JOSE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative rounded-md px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400",
                  active
                    ? "text-white"
                    : "text-navy-200 hover:text-white"
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1 h-[3px] rounded-full bg-accent-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isGov && (
            <>
              <button
                type="button"
                onClick={() => { logout(); router.push("/"); }}
                className={NAVY_GHOST_BTN}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
              <Link href="/gov" className={NAVY_OUTLINE_BTN}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </>
          )}
          {hydrated && !isGov && (
            <Link href="/login?role=government" className={NAVY_OUTLINE_BTN}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Government Login
            </Link>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="border-t border-navy-800 bg-navy-950">
        <p className="gl-container py-1.5 text-[11px] leading-snug text-navy-300 sm:text-xs">
          An official digital service used by the City of San Jose. In partnership with{" "}
          {CITY_PARTNERS.map((partner, i) => (
            <span key={partner.href}>
              {i > 0 && (i === CITY_PARTNERS.length - 1 ? ", and " : ", ")}
              {partner.headerPrefix}
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-200 underline decoration-accent-400/40 underline-offset-2 hover:text-accent-100 hover:decoration-accent-300"
              >
                {partner.headerLabel ?? partner.label}
              </a>
            </span>
          ))}
          .
        </p>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-navy-800 bg-navy-900 md:hidden"
        >
          <nav className="gl-container flex flex-col gap-1 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  isActive(item.href)
                    ? "border-l-2 border-accent-400 bg-navy-800 text-white"
                    : "text-navy-200 hover:bg-navy-800 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-navy-800 pt-3">
              {isGov ? (
                <>
                  <button
                    type="button"
                    className={cx(NAVY_GHOST_BTN, "justify-start")}
                    onClick={() => { logout(); setOpen(false); router.push("/"); }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                  <Link href="/gov" className={NAVY_OUTLINE_BTN} onClick={() => setOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link href="/login?role=government" className={NAVY_OUTLINE_BTN} onClick={() => setOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Government Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
