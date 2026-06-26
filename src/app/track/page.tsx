"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileSearch, ArrowRight } from "lucide-react";
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
      <div className="gl-container max-w-3xl py-12 lg:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Track a report
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-ink-soft sm:text-lg">
            Enter your tracking ID, or the email / phone you used, to see the
            latest status.
          </p>
        </div>

        <form onSubmit={search} className="mt-10" role="search">
          <label htmlFor="track-query" className="sr-only">
            Tracking ID, email, or phone
          </label>
          <div className="flex items-stretch gap-2 rounded-md border border-navy-200 bg-white p-2.5 shadow-sm">
            <input
              id="track-query"
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-lg text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-0"
              placeholder="Enter tracking ID, email, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2.5 rounded-md bg-accent-500 px-7 py-4 text-base font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-600 active:bg-accent-700 sm:px-8 sm:text-lg"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Track report
            </button>
          </div>
        </form>

        {user?.role === "citizen" && (
          <p className="mt-4 text-base text-ink-muted">
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

        <div className="mt-10" aria-live="polite">
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
                  <p className="mb-4 text-base font-medium text-ink-soft">
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
            <div className="rounded-2xl border border-dashed border-navy-200 bg-white/60 p-7">
              <h2 className="text-base font-semibold text-navy-900">
                Don&apos;t have your ID?
              </h2>
              <p className="mt-2 text-base text-ink-soft">
                Search with the email or phone number you provided when
                reporting. Filed anonymously with no contact info? Your tracking
                ID is the only way to find it.
              </p>
              <Link
                href="/report"
                className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-accent-600 hover:text-accent-700"
              >
                File a new report
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
