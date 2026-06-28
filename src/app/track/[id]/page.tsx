"use client";

import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { CitizenReportView } from "@/components/CitizenReportView";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useReport } from "@/lib/store";

export default function TrackDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const decodedId = decodeURIComponent(params.id);
  const { report, hydrated } = useReport(decodedId);

  return (
    <SiteShell>
      <div className="gl-container max-w-3xl py-8 lg:py-10">
        <Link
          href="/track"
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-navy-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition-colors hover:bg-navy-50 hover:border-navy-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to tracking
        </Link>

        {!hydrated ? (
          <ListSkeleton rows={2} />
        ) : report ? (
          <CitizenReportView report={report} />
        ) : (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" />}
            title="We couldn't find that report"
            description={`No report matches "${decodedId}". Check the tracking ID and try again.`}
            action={
              <Link href="/track" className="btn-primary">
                Try another lookup
              </Link>
            }
          />
        )}
      </div>
    </SiteShell>
  );
}
