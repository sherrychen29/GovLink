"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, UserRound, LogOut, LayoutDashboard } from "lucide-react";
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

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/85 backdrop-blur-md">
      <div className="gl-container flex min-h-16 items-center justify-between gap-4 py-2">
        <Link
          href="/"
          className="flex flex-col gap-0.5 rounded-lg focus-visible:ring-2 focus-visible:ring-accent-400"
          aria-label="GovLink home"
        >
          <Logo />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-600 sm:text-xs">
            CITY OF SAN JOSE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-navy-50 text-navy-900"
                  : "text-ink-soft hover:bg-navy-50 hover:text-navy-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {hydrated && user?.role === "government" && (
            <Link href="/gov" className="btn-outline">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          )}
          {hydrated && user?.role === "citizen" && (
            <>
              <Link href="/account" className="btn-ghost">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {user.displayName.split(" ")[0]}
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="btn-outline"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          )}
          {hydrated && !user && (
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="border-t border-navy-100 bg-navy-50/90">
        <p className="gl-container py-1.5 text-[11px] leading-snug text-ink-muted sm:text-xs">
          An official digital service used by the City of San Jose. In partnership with{" "}
          {CITY_PARTNERS.map((partner, i) => (
            <span key={partner.href}>
              {i > 0 && (i === CITY_PARTNERS.length - 1 ? ", and " : ", ")}
              {partner.headerPrefix}
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy-700 underline decoration-navy-200 underline-offset-2 hover:text-navy-900 hover:decoration-navy-400"
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
          className="border-t border-navy-100 bg-white md:hidden"
        >
          <nav className="gl-container flex flex-col gap-1 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-navy-50 text-navy-900"
                    : "text-ink-soft hover:bg-navy-50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-navy-100 pt-3">
              {hydrated && user?.role === "government" && (
                <Link href="/gov" className="btn-outline" onClick={() => setOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Government dashboard
                </Link>
              )}
              {hydrated && user?.role === "citizen" && (
                <>
                  <Link href="/account" className="btn-outline" onClick={() => setOpen(false)}>
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    My reports
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost justify-start"
                    onClick={() => {
                      logout();
                      setOpen(false);
                      router.push("/");
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              )}
              {hydrated && !user && (
                <Link href="/login" className="btn-outline" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
