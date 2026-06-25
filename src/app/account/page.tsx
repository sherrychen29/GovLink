"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Inbox, LogIn, FilePlus2 } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { ReportListCard } from "@/components/ReportListCard";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useCurrentUser, useReports } from "@/lib/store";

export default function AccountPage() {
  const { user, hydrated } = useCurrentUser();
  const { reports } = useReports();

  const mine = useMemo(
    () =>
      user
        ? reports
            .filter((r) => r.reporterId === user.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        : [],
    [reports, user]
  );

  const active = mine.filter((r) => r.status !== "resolved").length;
  const resolved = mine.filter((r) => r.status === "resolved").length;

  if (!hydrated) {
    return (
      <SiteShell>
        <div className="gl-container max-w-4xl py-10">
          <ListSkeleton rows={3} />
        </div>
      </SiteShell>
    );
  }

  if (!user || user.role !== "citizen") {
    return (
      <SiteShell>
        <div className="gl-container max-w-md py-16">
          <EmptyState
            icon={<LogIn className="h-6 w-6" />}
            title="Sign in to see your reports"
            description="Create a free account or sign in to keep all your reports in one place."
            action={
              <div className="flex gap-3">
                <Link href="/login" className="btn-primary">
                  Sign in
                </Link>
                <Link href="/report" className="btn-outline">
                  Report an issue
                </Link>
              </div>
            }
          />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="gl-container max-w-4xl py-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              {user.displayName.split(" ")[0]}&apos;s reports
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {user.email || user.phone}
            </p>
          </div>
          <Link href="/report" className="btn-accent self-start">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New report
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: mine.length },
            { label: "Active", value: active },
            { label: "Resolved", value: resolved },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-navy-900">{s.value}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          {mine.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="No reports yet"
              description="When you file a report while signed in, it'll show up here automatically."
              action={
                <Link href="/report" className="btn-primary">
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                  File your first report
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {mine.map((r) => (
                <ReportListCard
                  key={r.id}
                  report={r}
                  href={`/track/${r.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
