"use client";

import { useState } from "react";
import {
  X,
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
} from "lucide-react";
import type { Report, ReportStatus } from "@/lib/types";
import { STATUS_PIPELINE, corroborations } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { CategoryChip } from "@/components/Chips";
import { StatusPill } from "@/components/StatusPill";
import { SeverityBar } from "@/components/Severity";
import { addInternalNote, updateStatus } from "@/lib/store";
import { cx, formatCoords, formatDateTime, timeAgo } from "@/lib/utils";

export function TicketPanel({
  report,
  authorName,
  onClose,
}: {
  report: Report;
  authorName: string;
  onClose: () => void;
}) {
  const [composer, setComposer] = useState<null | "resolved" | "declined">(null);
  const [noteText, setNoteText] = useState("");
  const [internalDraft, setInternalDraft] = useState("");
  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);

  function setStatus(s: ReportStatus) {
    if (s === "resolved") {
      setComposer("resolved");
      return;
    }
    updateStatus(report.id, s);
  }

  function confirmResolution() {
    updateStatus(report.id, "resolved", {
      note: noteText.trim() || undefined,
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-navy-100 p-5">
        <div>
          <p className="font-mono text-xs font-semibold text-ink-muted">
            {report.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryChip category={report.category} size="sm" />
            <StatusPill status={report.status} rejected={rejected} size="sm" />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost shrink-0 !p-2"
          aria-label="Close ticket details"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Severity + corroboration */}
        <div className="rounded-xl bg-navy-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Severity
            </span>
            {count >= 2 && (
              <span className="chip bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-700">
                <Users className="h-3 w-3" aria-hidden="true" />
                {count} residents
              </span>
            )}
          </div>
          <div className="mt-2">
            <SeverityBar severity={report.severity} />
          </div>
          {count >= 2 && (
            <p className="mt-2 text-xs text-ink-muted">
              Base severity {report.baseSeverity}, raised by{" "}
              {count - 1} corroborating report{count - 1 === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        {/* Description + media */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Description
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {report.description}
          </p>
          {report.media.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.media.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={m.dataUrl}
                  alt={m.name || "Attachment"}
                  className="h-20 w-20 rounded-lg border border-navy-100 object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <Meta icon={<MapPin className="h-4 w-4" />} label="Location">
            {report.location.address ||
              report.location.crossStreet ||
              formatCoords(report.location.lat, report.location.lng)}
            <span className="mt-0.5 block font-mono text-xs text-ink-muted">
              {formatCoords(report.location.lat, report.location.lng)} ·{" "}
              {report.location.method}
            </span>
          </Meta>
          <Meta icon={<CalendarClock className="h-4 w-4" />} label="Noticed / reported">
            {formatDateTime(report.noticedAt)}
            <span className="mt-0.5 block text-xs text-ink-muted">
              Filed {timeAgo(report.createdAt)}
            </span>
          </Meta>
          <Meta
            icon={
              report.contact.anonymous ? (
                <ShieldOff className="h-4 w-4" />
              ) : (
                <UserRound className="h-4 w-4" />
              )
            }
            label="Contact"
          >
            {report.contact.anonymous ? (
              <span className="text-ink-muted">Anonymous submission</span>
            ) : (
              <div className="space-y-0.5">
                {report.contact.name && <span>{report.contact.name}</span>}
                {report.contact.email && (
                  <a
                    href={`mailto:${report.contact.email}`}
                    className="flex items-center gap-1.5 text-accent-700 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {report.contact.email}
                  </a>
                )}
                {report.contact.phone && (
                  <a
                    href={`tel:${report.contact.phone}`}
                    className="flex items-center gap-1.5 text-accent-700 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {report.contact.phone}
                  </a>
                )}
                {!report.contact.name &&
                  !report.contact.email &&
                  !report.contact.phone && (
                    <span className="text-ink-muted">No contact provided</span>
                  )}
              </div>
            )}
          </Meta>
        </dl>

        {/* Corroborating submissions */}
        {count >= 2 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {count} resident submissions
            </h3>
            <ol className="mt-2 space-y-2">
              {report.submissions.map((s, i) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-navy-100 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-ink-muted">
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

        {/* Status controls */}
        <div className="border-t border-navy-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Update status
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STATUS_PIPELINE.map((s) => {
              const isCurrent = report.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={isCurrent}
                  className={cx(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    isCurrent
                      ? "bg-navy-900 text-white"
                      : "border border-navy-200 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50"
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setComposer("declined");
                setNoteText("");
              }}
              className="btn-danger flex-1"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Decline request
            </button>
          </div>

          {composer && (
            <div className="mt-3 rounded-xl border border-navy-200 bg-slate-50 p-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                {composer === "declined" ? (
                  <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                )}
                {composer === "declined" ? "Decline this request" : "Resolve this issue"}
              </h4>
              <label htmlFor="resolution-note" className="mt-3 field-label">
                Message to the resident{" "}
                {composer === "declined" && (
                  <span className="font-normal text-red-600">(reason required)</span>
                )}
              </label>
              <textarea
                id="resolution-note"
                rows={3}
                className="field-input resize-none"
                placeholder={
                  composer === "declined"
                    ? "Explain why this request can't be actioned…"
                    : "Describe what was done to fix it…"
                }
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <p className="field-hint">
                This note is shown to the resident. The status will read
                “Resolved”
                {composer === "declined" ? " · Declined." : "."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={confirmResolution}
                  disabled={composer === "declined" && !noteText.trim()}
                  className={cx(
                    "btn flex-1 text-white",
                    composer === "declined"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {composer === "declined" ? "Confirm decline" : "Confirm resolved"}
                </button>
                <button
                  type="button"
                  onClick={() => setComposer(null)}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Internal notes */}
        <div className="border-t border-navy-100 pt-5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Internal notes — staff only
          </h3>
          {report.internalNotes.length > 0 && (
            <ol className="mt-3 space-y-2">
              {report.internalNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg bg-amber-50/70 p-3 text-sm ring-1 ring-amber-100"
                >
                  <p className="text-navy-900">{n.text}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {n.author} · {timeAgo(n.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={addNote} className="mt-3">
            <label htmlFor="internal-note" className="sr-only">
              Add an internal note
            </label>
            <textarea
              id="internal-note"
              rows={2}
              className="field-input resize-none"
              placeholder="Add a private note for your team…"
              value={internalDraft}
              onChange={(e) => setInternalDraft(e.target.value)}
            />
            <button
              type="submit"
              disabled={!internalDraft.trim()}
              className="btn-outline mt-2 w-full"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add internal note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-500">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-navy-900">{children}</dd>
      </div>
    </div>
  );
}
