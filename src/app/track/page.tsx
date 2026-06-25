"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Ticket, FileSearch, ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { ReportListCard } from "@/components/ReportListCard";
import { EmptyState } from "@/components/EmptyState";
import { findReports, useCurrentUser } from "@/lib/store";
import type { Report } from "@/lib/types";

export default function TrackPage() {
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Report[] | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setResults(findReports(query));
  }

  return (
    <SiteShell>
      <div className="gl-container max-w-3xl py-10 lg:py-14">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-accent-300">
            <FileSearch className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Track a report
          </h1>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Enter your tracking ID, or the email / phone you used, to see the
            latest status.
          </p>
        </div>

        <form onSubmit={search} className="mt-8" role="search">
          <label htmlFor="track-query" className="field-label">
            Tracking ID, email, or phone
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Ticket
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
                aria-hidden="true"
              />
              <input
                id="track-query"
                className="field-input pl-9"
                placeholder="e.g. GL-9F4-2207 or you@gmail.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-accent px-5 py-2.5">
              <Search className="h-4 w-4" aria-hidden="true" />
              Look up
            </button>
          </div>
        </form>

        {user?.role === "citizen" && (
          <p className="mt-3 text-sm text-ink-muted">
            Signed in as {user.displayName.split(" ")[0]} —{" "}
            <Link
              href="/account"
              className="font-semibold text-accent-600 hover:text-accent-700"
            >
              view all your reports
            </Link>
            .
          </p>
        )}

        <div className="mt-8" aria-live="polite">
          {results !== null && (
            <>
              {results.length === 0 ? (
                <EmptyState
                  icon={<FileSearch className="h-6 w-6" />}
                  title="No reports found"
                  description="Double-check the tracking ID or the email / phone you used. IDs look like GL-XXX-XXXX."
                />
              ) : (
                <>
                  <p className="mb-3 text-sm font-medium text-ink-soft">
                    {results.length} report{results.length === 1 ? "" : "s"} found
                  </p>
                  <div className="space-y-3">
                    {results.map((r) => (
                      <ReportListCard
                        key={r.id}
                        report={r}
                        href={`/track/${r.id}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {results === null && (
            <div className="rounded-2xl border border-dashed border-navy-200 bg-white/60 p-6">
              <h2 className="text-sm font-semibold text-navy-900">
                Don&apos;t have your ID?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Search with the email or phone number you provided when
                reporting. Filed anonymously with no contact info? Your tracking
                ID is the only way to find it.
              </p>
              <Link
                href="/report"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700"
              >
                File a new report
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
