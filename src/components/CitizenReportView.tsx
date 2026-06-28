import { MapPin, CalendarClock, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Report } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { corroborations } from "@/lib/types";
import { CategoryChip, CorroborationBadge } from "./Chips";
import { StatusPill } from "./StatusPill";
import { SeverityBar } from "./Severity";
import { StatusTracker } from "./StatusTracker";
import { Icon } from "./CategoryIcon";
import { formatCoords, formatDate, formatDateTime } from "@/lib/utils";

export function CitizenReportView({ report }: { report: Report }) {
  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);
  const locationText =
    report.location.address ||
    report.location.crossStreet ||
    formatCoords(report.location.lat, report.location.lng);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-semibold text-ink-muted">
              {report.id}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CategoryChip category={report.category} />
              <StatusPill status={report.status} rejected={rejected} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Reported</p>
            <p className="text-sm font-medium text-navy-900">
              {formatDate(report.createdAt)}
            </p>
          </div>
        </div>

        {count >= 2 && (
          <div className="mt-4">
            <CorroborationBadge count={count} />
          </div>
        )}

        <div className="mt-6">
          <StatusTracker report={report} />
        </div>
      </div>

      {/* Resolution callout */}
      {report.status === "resolved" && report.resolution && (
        <div
          className={
            rejected
              ? "card border-red-200 bg-red-50/60 p-5"
              : "card border-emerald-200 bg-emerald-50/60 p-5"
          }
        >
          <div className="flex items-start gap-3">
            {rejected ? (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
            <div>
              <h2
                className={
                  rejected
                    ? "text-sm font-semibold text-red-900"
                    : "text-sm font-semibold text-emerald-900"
                }
              >
                {rejected ? "Request declined" : "Issue resolved"}
                <span className="ml-2 font-normal text-ink-muted">
                  {formatDate(report.resolution.resolvedAt)}
                </span>
              </h2>
              <p
                className={
                  rejected
                    ? "mt-1 text-sm leading-relaxed text-red-800"
                    : "mt-1 text-sm leading-relaxed text-emerald-800"
                }
              >
                {report.resolution.note}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Description + details */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900">What was reported</h2>
        <p className="mt-2 leading-relaxed text-ink">{report.description}</p>
        {report.residentDescription &&
          report.residentDescription !== report.description && (
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-medium text-navy-800">As you reported: </span>
              &ldquo;{report.residentDescription}&rdquo;
            </p>
          )}

        {report.media.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            {report.media.map((m) => (
              <figure key={m.id} className="w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.dataUrl}
                  alt={m.caption || m.name || "Report attachment"}
                  className="h-28 w-28 rounded-xl border border-navy-100 object-cover"
                />
                {m.caption && (
                  <figcaption className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-ink-soft">
                    {m.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <dl className="mt-6 grid gap-x-6 gap-y-5 border-t border-navy-100 pt-5 sm:grid-cols-2">
          <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location">
            {locationText}
            {report.location.crossStreet && report.location.address && (
              <span className="block text-xs text-ink-muted">
                Near {report.location.crossStreet}
              </span>
            )}
          </DetailRow>
          <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="Noticed">
            {formatDateTime(report.noticedAt)}
          </DetailRow>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Current severity
            </dt>
            <dd className="mt-2">
              <SeverityBar severity={report.severity} />
            </dd>
          </div>
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Last updated">
            {formatDateTime(report.updatedAt)}
          </DetailRow>
        </dl>
      </div>

      {/* Public timeline */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900">Activity</h2>
        <ol className="mt-4 space-y-4">
          {[...report.statusHistory].reverse().map((event, i) => {
            const meta = STATUS_META[event.status];
            const isRejected = event.status === "resolved" && event.rejected;
            return (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-600">
                  <Icon
                    name={isRejected ? "TriangleAlert" : meta.icon}
                    className="h-3.5 w-3.5"
                  />
                </span>
                <div>
                  <p className="text-sm font-medium text-navy-900">
                    {isRejected ? "Resolved · Declined" : meta.label}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(event.at)}
                  </p>
                  {event.note && (
                    <p className="mt-1 text-sm text-ink-soft">{event.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <span className="text-navy-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-navy-900">{children}</dd>
    </div>
  );
}
