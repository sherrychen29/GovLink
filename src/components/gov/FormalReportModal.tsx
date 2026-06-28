"use client";

import { useState } from "react";
import {
  X,
  Download,
  ChevronDown,
  ChevronUp,
  MapPin,
  CalendarClock,
  Lock,
  Plus,
  CheckCircle2,
  XCircle,
  Users,
  Mail,
  Phone,
  UserRound,
  ShieldOff,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Send,
  MailOpen,
  Loader2,
  TriangleAlert,
} from "lucide-react";

const STATUS_ICON_MAP = {
  sent: Send,
  opened: MailOpen,
  in_progress: Loader2,
  resolved: CheckCircle2,
} as const;
import type { ChatLogEntry, Report, ReportStatus } from "@/lib/types";
import {
  STATUS_PIPELINE,
  allReportChatEntries,
  corroborations,
  reportChatSections,
} from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { severityMeta } from "@/lib/meta";
import { CategoryChip } from "@/components/Chips";
import { StatusPill } from "@/components/StatusPill";
import { addInternalNote, updateStatus } from "@/lib/store";
import { downloadReportPdf } from "@/lib/report-pdf";
import { CITY } from "@/lib/seed";
import { cx, formatCoords, formatDateTime, timeAgo } from "@/lib/utils";

export function FormalReportModal({
  report,
  authorName,
  onClose,
  onShowOnMap,
}: {
  report: Report;
  authorName: string;
  onClose: () => void;
  onShowOnMap?: () => void;
}) {
  const [composer, setComposer] = useState<null | "resolved" | "declined">(null);
  const [noteText, setNoteText] = useState("");
  const [internalDraft, setInternalDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [revealedImages, setRevealedImages] = useState<Set<number>>(new Set());
  function revealImage(idx: number) {
    setRevealedImages((s) => new Set(s).add(idx));
  }

  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);
  const chatSections = reportChatSections(report);
  const chatCount = allReportChatEntries(report).length;
  const images = report.media.filter((m) => m.kind === "image");
  const sevMeta = severityMeta(report.severity);

  function setStatus(s: ReportStatus) {
    if (s === "resolved") {
      setComposer("resolved");
      return;
    }
    updateStatus(report.id, s);
  }

  function confirmResolution() {
    updateStatus(report.id, "resolved", {
      note: noteText.trim(),
      rejected: composer === "declined",
    });
    setComposer(null);
    setNoteText("");
  }

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!internalDraft.trim()) return;
    addInternalNote(report.id, internalDraft, authorName);
    setInternalDraft("");
  }

  async function handleDownloadPdf() {
    setPdfError(null);
    setPdfBusy(true);
    try {
      await downloadReportPdf(report);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF download failed.");
    } finally {
      setPdfBusy(false);
    }
  }

  const locLabel =
    report.location.address ||
    report.location.crossStreet ||
    formatCoords(report.location.lat, report.location.lng);

  return (
    <>
      <div
        className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Service request ${report.id}`}
        onClick={onClose}
      >
        <div
          className="my-auto w-full max-w-3xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-xl border border-navy-200 bg-white shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-navy-100 bg-slate-50 px-4 py-2.5 sm:px-6">
              <p className="font-mono text-xl font-bold text-navy-800">
                {report.id}
              </p>
              <div className="flex items-center gap-2">
                {onShowOnMap && (
                  <button
                    type="button"
                    onClick={onShowOnMap}
                    className="btn-primary !py-1 text-xs"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Map
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfBusy}
                  className="btn-accent !py-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {pdfBusy ? "Generating…" : "PDF"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg bg-navy-100 text-navy-700 transition-colors hover:bg-navy-200"
                  aria-label="Close report"
                >
                  <X className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                </button>
              </div>
            </div>

            {pdfError && (
              <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
                {pdfError}
              </p>
            )}

            {/* Document body */}
            <div className="max-h-[76vh] overflow-y-auto">
              <div className="px-5 py-4 sm:px-8 sm:py-5">
                {/* Compact header */}
                <div className="mb-3 border-b border-navy-100 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-navy-400">
                    City of {CITY.name} · Municipal Service Request
                  </p>
                  {/* Title row with status in top-right */}
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold leading-snug text-navy-900">
                      {report.formalTitle || "Service Request"}
                    </h2>
                    <div className="shrink-0 pt-0.5">
                      <StatusPill status={report.status} rejected={rejected} size="sm" />
                    </div>
                  </div>
                  {/* Category below title */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <CategoryChip category={report.category} size="sm" />
                    {count >= 2 && (
                      <span className="chip bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-700">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {count} residents
                      </span>
                    )}
                  </div>
                </div>

                {/* Two-column layout: main left, attachments right */}
                <div className={cx("gap-5", images.length > 0 ? "grid lg:grid-cols-3" : "block")}>
                  {/* Main content */}
                  <div className={cx("space-y-4", images.length > 0 ? "lg:col-span-2" : "")}>
                    {/* Description; grey box, light rounding */}
                    <div className="rounded bg-slate-100/80 px-3.5 py-3 text-sm leading-relaxed text-ink">
                      {report.description}
                    </div>

                    {/* Severity inline */}
                    <p className="text-sm font-medium text-ink-soft">
                      Severity:{" "}
                      <span className="font-bold" style={{ color: sevMeta.hex }}>
                        {report.severity}/10
                      </span>
                    </p>

                    {/* Location / Date / Contact compact grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CompactField icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
                        {locLabel}
                        <span className="mt-0.5 block font-mono text-[11px] text-ink-muted">
                          {formatCoords(report.location.lat, report.location.lng)}
                        </span>
                      </CompactField>
                      <CompactField icon={<CalendarClock className="h-3.5 w-3.5" />} label="Noticed">
                        {formatDateTime(report.noticedAt)}
                        <span className="mt-0.5 block text-[11px] text-ink-muted">
                          Reported {timeAgo(report.createdAt)}
                        </span>
                      </CompactField>
                      <CompactField
                        icon={
                          report.contact.anonymous ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <UserRound className="h-3.5 w-3.5" />
                          )
                        }
                        label="Contact"
                      >
                        {report.contact.anonymous ? (
                          <span className="text-ink-muted">Anonymous</span>
                        ) : (
                          <div className="space-y-0.5">
                            {report.contact.name && <span>{report.contact.name}</span>}
                            {report.contact.email && (
                              <a href={`mailto:${report.contact.email}`} className="flex items-center gap-1 text-accent-700 hover:underline">
                                <Mail className="h-3 w-3" aria-hidden="true" />
                                {report.contact.email}
                              </a>
                            )}
                            {report.contact.phone && (
                              <a href={`tel:${report.contact.phone}`} className="flex items-center gap-1 text-accent-700 hover:underline">
                                <Phone className="h-3 w-3" aria-hidden="true" />
                                {report.contact.phone}
                              </a>
                            )}
                          </div>
                        )}
                      </CompactField>
                    </div>

                    {/* Corroborating submissions */}
                    {count >= 2 && (
                      <div className="border-t border-navy-100 pt-3">
                        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-navy-500">
                          Corroborating submissions ({count})
                        </h4>
                        <ol className="space-y-1.5">
                          {report.submissions.map((s, i) => (
                            <li key={s.id} className="rounded border border-navy-100 bg-slate-50 p-2.5 text-xs">
                              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                                <span className="font-medium text-navy-700">
                                  {i === 0 ? "Original" : `Corroboration ${i}`}
                                  {s.distanceM != null && ` · ${s.distanceM}m away`}
                                </span>
                                <span>{timeAgo(s.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-ink">{s.description}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Intake chat; at the bottom, prominent button */}
                    <div className="border-t border-navy-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setChatOpen((o) => !o)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-2.5 text-left hover:bg-navy-100/60 transition-colors"
                        aria-expanded={chatOpen}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                          <MessageSquare className="h-4 w-4 text-navy-500" aria-hidden="true" />
                          View intake chat
                          {chatCount > 0 && (
                            <span className="rounded-full bg-navy-200 px-2 py-0.5 text-[11px] font-bold text-navy-700">
                              {chatCount} messages
                            </span>
                          )}
                        </span>
                        {chatOpen ? (
                          <ChevronUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                        )}
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

                  {/* Attachments; right column */}
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
                            aria-label={`View ${images[0].name || "attachment"}`}
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
                          <span className="font-semibold text-navy-600">
                            AI caption:{" "}
                          </span>
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

              {/* Staff workflow */}
              <div className="border-t-2 border-navy-300 bg-slate-50 px-5 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setStaffOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={staffOpen}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-navy-500">
                    Staff actions
                  </span>
                  {staffOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  )}
                </button>

                {staffOpen && (
                  <div className="mt-3 space-y-4">
                    <div>
                      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Update status
                      </h4>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {STATUS_PIPELINE.map((s) => {
                          const isCurrent = report.status === s;
                          const Icon = STATUS_ICON_MAP[s];
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              aria-pressed={isCurrent}
                              className={cx(
                                "flex flex-col items-center gap-1 rounded px-3 py-2 text-xs font-semibold transition-colors",
                                isCurrent
                                  ? "bg-navy-900 text-white"
                                  : "border border-navy-200 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50"
                              )}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                              {STATUS_META[s].label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => { setComposer("declined"); setNoteText(""); }}
                          className="flex flex-col items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Decline
                        </button>
                      </div>

                      {composer && (
                        <div className="mt-3 rounded border border-navy-200 bg-white p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-navy-900">
                            {composer === "declined" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            )}
                            {composer === "declined" ? "Decline this request" : "Resolve this issue"}
                          </h4>
                          <label htmlFor="resolution-note" className="mt-2 field-label">
                            {composer === "declined" ? (
                              <>Reason for declining <span className="font-bold text-red-600">*</span></>
                            ) : (
                              <>Resolution note <span className="font-bold text-red-600">*</span></>
                            )}
                          </label>
                          <textarea
                            id="resolution-note"
                            rows={2}
                            required
                            className={cx(
                              "field-input resize-none text-sm",
                              !noteText.trim()
                                ? "border-red-400 ring-1 ring-red-300 focus:border-red-400 focus:ring-red-300"
                                : ""
                            )}
                            placeholder={
                              composer === "declined"
                                ? "Required; the resident will see this reason…"
                                : "Required; describe what was done to fix it…"
                            }
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                          />
                          {!noteText.trim() && (
                            <p className="mt-1 text-[11px] font-medium text-red-600">
                              {composer === "declined" ? "A reason is required before declining." : "A resolution note is required."}
                            </p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={confirmResolution}
                              disabled={!noteText.trim()}
                              className={cx(
                                "btn flex-1 text-white text-sm",
                                composer === "declined" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                              )}
                            >
                              {composer === "declined" ? "Confirm decline" : "Confirm resolved"}
                            </button>
                            <button type="button" onClick={() => setComposer(null)} className="btn-outline text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-navy-200 pt-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Internal notes; staff only
                      </h4>
                      {report.internalNotes.length > 0 && (
                        <ol className="mb-2 space-y-1.5">
                          {report.internalNotes.map((n) => (
                            <li key={n.id} className="rounded bg-amber-50/70 p-2.5 text-xs ring-1 ring-amber-100">
                              <p className="text-navy-900">{n.text}</p>
                              <p className="mt-0.5 text-[11px] text-ink-muted">
                                {n.author} · {timeAgo(n.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                      <form onSubmit={addNote}>
                        <label htmlFor="internal-note" className="sr-only">Add an internal note</label>
                        <textarea
                          id="internal-note"
                          rows={2}
                          className="field-input resize-none text-sm"
                          placeholder="Add a private note for your team…"
                          value={internalDraft}
                          onChange={(e) => setInternalDraft(e.target.value)}
                        />
                        <button type="submit" disabled={!internalDraft.trim()} className="btn-outline mt-1.5 w-full text-xs sm:w-auto">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add note
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
        <span>{isUser ? "Resident" : "Beacon"}</span>
        <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
      </div>
      <p className="leading-relaxed">{entry.text}</p>
    </div>
  );
}
