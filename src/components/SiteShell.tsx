"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "./Logo";
import { SiteHeader } from "./SiteHeader";
import { CITY_PARTNERS } from "@/lib/partners";
import { CITY } from "@/lib/seed";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="mt-auto border-t border-navy-100 bg-white">
      <div className={`gl-container flex flex-col sm:flex-row sm:items-center sm:justify-between ${compact ? "gap-3 py-4" : "gap-6 py-8"}`}>
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          <div className={`flex flex-col sm:flex-row sm:items-center ${compact ? "gap-2" : "gap-3"}`}>
            <a
              href="https://www.sanjoseca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block shrink-0 rounded focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="City of San Jose — Capital of Silicon Valley"
            >
              <Image
                src="/images/san-jose-seal.png"
                alt="City of San Jose — Capital of Silicon Valley"
                width={1752}
                height={990}
                className={compact ? "h-8 w-auto" : "h-14 w-auto sm:h-16"}
              />
            </a>
            <Logo markClassName={compact ? "h-7 w-auto" : "h-12 w-auto sm:h-14"} />
          </div>
          <p className="max-w-md text-xs text-navy-900">
            GovLink is a civic reporting prototype for the City of {CITY.name}.
            For emergencies, always call 911.
          </p>
        </div>
        <nav className={`flex flex-col text-xs ${compact ? "gap-1" : "gap-2.5 text-sm"}`} aria-label="Partner departments">
          {CITY_PARTNERS.map((partner) => (
            <a
              key={partner.href}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy-700 underline decoration-navy-300 underline-offset-2 hover:text-navy-900 hover:decoration-navy-500"
            >
              {partner.label}
            </a>
          ))}
          <Link
            href="/terms"
            className="text-navy-700 underline decoration-navy-300 underline-offset-2 hover:text-navy-900 hover:decoration-navy-500"
          >
            Terms and Conditions
          </Link>
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
