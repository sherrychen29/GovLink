"use client";

import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { SiteHeader } from "./SiteHeader";
import { CITY_PARTNERS } from "@/lib/partners";
import { CITY } from "@/lib/seed";

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-navy-100 bg-white">
      <div className="gl-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="inline-flex flex-col gap-0.5">
            <Logo />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-600 sm:text-xs">
              CITY OF SAN JOSE
            </span>
          </div>
          <p className="max-w-md text-xs text-ink-muted">
            GovLink is a civic reporting prototype for the City of {CITY.name}.
            For emergencies, always call 911.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Partner departments">
          {CITY_PARTNERS.map((partner) => (
            <a
              key={partner.href}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft underline decoration-navy-200 underline-offset-2 hover:text-navy-900 hover:decoration-navy-400"
            >
              {partner.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
