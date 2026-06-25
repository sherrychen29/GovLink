"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Logo } from "./Logo";
import { SiteHeader } from "./SiteHeader";
import { resetDemoData } from "@/lib/store";
import { CITY } from "@/lib/seed";

export function SiteFooter() {
  const router = useRouter();
  return (
    <footer className="mt-auto border-t border-navy-100 bg-white">
      <div className="gl-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-md text-xs text-ink-muted">
            GovLink is a civic reporting prototype for the City of {CITY.name}.
            For emergencies, always call 911.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <Link href="/report" className="text-ink-soft hover:text-navy-900">
            Report an issue
          </Link>
          <Link href="/track" className="text-ink-soft hover:text-navy-900">
            Track a report
          </Link>
          <Link href="/resolved" className="text-ink-soft hover:text-navy-900">
            Resolved issues
          </Link>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset the demo back to its seeded reports and accounts? This clears anything you've added."
                )
              ) {
                resetDemoData();
                router.push("/");
              }
            }}
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-navy-900"
            title="Restore the original seeded demo data"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset demo data
          </button>
        </div>
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
