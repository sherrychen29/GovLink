"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "./Logo";
import { SiteHeader } from "./SiteHeader";
import { CITY_PARTNERS } from "@/lib/partners";
import { CITY } from "@/lib/seed";

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-navy-900 bg-accent-50">
      <div className="gl-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="https://www.sanjoseca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block shrink-0 rounded focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-accent-50"
              aria-label="City of San Jose — Capital of Silicon Valley"
            >
              <Image
                src="/images/san-jose-seal.png"
                alt="City of San Jose — Capital of Silicon Valley"
                width={1752}
                height={990}
                className="h-14 w-auto sm:h-16"
              />
            </a>
            <Logo markClassName="h-12 w-auto sm:h-14" />
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
