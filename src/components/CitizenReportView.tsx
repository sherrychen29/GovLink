"use client";

import { useState } from "react";
import {
  MapPin,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  TriangleAlert,
} from "lucide-react";
import type { ChatLogEntry, Report } from "@/lib/types";
import { allReportChatEntries, corroborations, reportChatSections } from "@/lib/types";
import { CategoryChip, CorroborationBadge } from "./Chips";
import { StatusTracker } from "./StatusTracker";
import { cx, formatCoords, formatDate, formatDateTime } from "@/lib/utils";
import { CITY } from "@/lib/seed";

export function CitizenReportView({
  report,
  hideThankYou = false,
}: {
  report: Report;
  hideThankYou?: boolean;
}) {
  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);
  // In popup mode, skip flagged images entirely
  const allImages = report.media.filter((m) => m.kind === "image");
  const images = hideThankYou ? allImages.filter((m) => !m.flagged) : allImages;
  const chatSections = reportChatSections(report);
  const chatCount = allReportChatEntries(report).length;

  const [chatOpen, setChatOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [revealedImages, setRevealedImages] = useState<Set<number>>(new Set());

  function revealImage(idx: number) {
    setRevealedImages((s) => new Set(s).add(idx));
  }

  const locationText =
    report.location.address ||
    report.location.crossStreet ||
    formatCoords(report.location.lat, report.location.lng);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-navy-200 bg-white shadow-card">
        {/* Masthead bar */}
        <div className="border-b-2 border-navy-900 bg-navy-900 px-5 py-3 sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-navy-300">
            City of {CITY.name} · Municipal Service Request
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-base font-bold text-white">{report.id}</p>
            <CategoryChip category={report.category} size="sm" />
          </div>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          {/* Status timeline */}
          <StatusTracker report={report} />

          {/* Resolution callout */}
          {report.status === "resolved" && report.resolution && (
            <div
              className={cx(
                "mt-5 flex items-start gap-3 rounded-lg border p-4",
                rejected
                  ? "border-red-200 bg-red-50/60"
                  : "border-emerald-200 bg-emerald-50/60"
              )}
            >
              {rejected ? (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              )}
              <div>
                <p className={cx("text-sm font-semibold", rejected ? "text-red-900" : "text-emerald-900")}>
                  {rejected ? "Request declined" : "Issue resolved"}
                  <span className="ml-2 font-normal text-ink-muted">
                    {formatDate(report.resolution.resolvedAt)}
                  </span>
                </p>
                {report.resolution.note && (
                  <p className={cx("mt-1 text-sm leading-relaxed", rejected ? "text-red-800" : "text-emerald-800")}>
                    {report.resolution.note}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Thank-you note */}
          {!hideThankYou && (
            <div className="mt-5 rounded-lg border border-navy-100 bg-navy-50 px-4 py-3 text-sm leading-relaxed text-navy-700">
              Thank you for reporting this issue to the City of {CITY.name}. GovLink works with city government to address all citizen-submitted reports and keep our community safe and well-maintained. We appreciate your contribution.
            </div>
          )}

          {/* Two-column: description + image */}
          <div className={cx("mt-6 gap-5", images.length > 0 ? "grid lg:grid-cols-3" : "block")}>
            <div className={cx("space-y-4", images.length > 0 ? "lg:col-span-2" : "")}>
              {/* Description */}
              <div className="rounded bg-slate-100/80 px-3.5 py-3 text-sm leading-relaxed text-ink">
                {report.description}
              </div>

              {/* Corroboration badge */}
              {count >= 2 && <CorroborationBadge count={count} />}

              {/* Detail grid */}
              <dl className="grid gap-x-6 gap-y-4 border-t border-navy-100 pt-4 sm:grid-cols-2">
                <CompactField icon={<MapPin className="h-4 w-4" />} label="Location">
                  {locationText}
                  {report.location.crossStreet && report.location.address && (
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      Near {report.location.crossStreet}
                    </span>
                  )}
                </CompactField>
                <CompactField icon={<CalendarClock className="h-4 w-4" />} label="Noticed">
                  {formatDateTime(report.noticedAt)}
                </CompactField>
<CompactField icon={<Clock className="h-4 w-4" />} label="Last updated">
                  {formatDateTime(report.updatedAt)}
                </CompactField>
              </dl>

              {/* Chat logs */}
              <div className="border-t border-navy-100 pt-4">
                <button
                  type="button"
                  onClick={() => setChatOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-2.5 text-left transition-colors hover:bg-navy-100/60"
                  aria-expanded={chatOpen}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                    <MessageSquare className="h-4 w-4 text-navy-500" aria-hidden="true" />
                    View intake conversation
                    {chatCount > 0 && (
                      <span className="rounded-full bg-navy-200 px-2 py-0.5 text-[11px] font-bold text-navy-700">
                        {chatCount} messages
                      </span>
                    )}
                  </span>
                  {chatOpen
                    ? <ChevronUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    : <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />}
                </button>
                {chatOpen && (
                  <div className="mt-3 space-y-2">
                    {chatSections.length === 0 ? (
                      <p className="text-xs text-ink-muted">No intake conversation recorded.</p>
                    ) : (
                      chatSections.map((section) => (
                        <div key={section.label}>
                          {chatSections.length > 1 && (
                            <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-500">
                              {section.label}
                            </h5>
                          )}
                          <div className="space-y-2">
                            {section.entries.map((entry, i) => (
                              <ChatBubble key={`${section.label}-${entry.at}-${i}`} entry={entry} />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Image column */}
            {images.length > 0 && (
              <div className="lg:col-span-1">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-navy-500">
                  Attachments
                </p>
                <div className="relative w-full overflow-hidden rounded border border-navy-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[0].dataUrl}
                    alt={images[0].name || "Attachment"}
                    className={cx(
                      "aspect-square w-full object-cover transition-all",
                      images[0].flagged && !revealedImages.has(0) ? "blur-xl" : ""
                    )}
                  />
                  {images[0].flagged && !revealedImages.has(0) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
                      <div className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-bold text-amber-300">
                        <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                        Flagged Image
                      </div>
                      <button
                        type="button"
                        onClick={() => revealImage(0)}
                        className="rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-navy-900 hover:bg-white"
                      >
                        View image anyway
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(0)}
                      className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      aria-label="View full image"
                    />
                  )}
                  {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                      +{images.length - 1}
                    </span>
                  )}
                </div>
                {images.length > 1 && (
                  <p className="mt-1 text-center text-[11px] text-ink-muted">
                    {images.length} photos · click to view all
                  </p>
                )}
                {images[0].caption && (
                  <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                    <span className="font-semibold text-navy-600">AI caption: </span>
                    {images[0].caption}
                  </p>
                )}
                {images[0].flagged && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                    <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                    Flagged by Beacon at intake
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/70">
            {lightboxIndex + 1} / {images.length}
          </p>
          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.max(0, (i ?? 1) - 1)); }}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex].dataUrl}
              alt={images[lightboxIndex].caption || images[lightboxIndex].name || "Attachment"}
              className={cx(
                "max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-all",
                images[lightboxIndex].flagged && !revealedImages.has(lightboxIndex) ? "blur-xl" : ""
              )}
            />
            {images[lightboxIndex].flagged && !revealedImages.has(lightboxIndex) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 rounded bg-black/70 px-3 py-1.5 text-sm font-bold text-amber-300">
                  <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                  Flagged Image
                </div>
                <button
                  type="button"
                  onClick={() => revealImage(lightboxIndex)}
                  className="rounded bg-white/90 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-white"
                >
                  View image anyway
                </button>
              </div>
            )}
          </div>
          {images[lightboxIndex].caption && (
            <p
              className="absolute bottom-6 left-1/2 max-w-[80vw] -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-center text-sm text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {images[lightboxIndex].caption}
            </p>
          )}
          {lightboxIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.min(images.length - 1, (i ?? 0) + 1)); }}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

function CompactField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-navy-700 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[2.5]">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-navy-600">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-navy-900">{children}</dd>
      </div>
    </div>
  );
}

function ChatBubble({ entry }: { entry: ChatLogEntry }) {
  const isUser = entry.role === "user";
  return (
    <div
      className={cx(
        "rounded px-3 py-2 text-xs",
        isUser ? "ml-4 bg-navy-900 text-white" : "mr-4 bg-slate-100 text-ink"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide opacity-70">
        <span>{isUser ? "You" : "Beacon"}</span>
        <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
      </div>
      <p className="leading-relaxed">{entry.text}</p>
    </div>
  );
}
