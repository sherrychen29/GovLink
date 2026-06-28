"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Users,
  PenLine,
  MessageSquareText,
  Loader2,
  WifiOff,
  MapPin,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconCapabilities } from "@/components/BeaconIntake";
import { LocationPicker } from "@/components/map/LocationPickerDynamic";
import { MediaUpload } from "@/components/MediaUpload";
import { CategoryChip } from "@/components/Chips";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/CategoryIcon";
import { STATUS_META } from "@/lib/meta";
import { CITY } from "@/lib/seed";
import { formatCoords } from "@/lib/utils";
import { formalizeReport } from "@/lib/formalize-report";
import { fileReport, type FileReportResult } from "@/lib/file-report";
import {
  CATEGORIES,
  type Category,
  type ContactInfo,
  type MediaItem,
  type ReportLocation,
} from "@/lib/types";
import { useCurrentUser } from "@/lib/store";

const BeaconIntake = dynamic(
  () => import("@/components/BeaconIntake").then((m) => m.BeaconIntake),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy-400" aria-hidden="true" />
      </div>
    ),
  }
);

type ReportMode = "chat" | "manual";

const MODE_TOGGLE_BTN =
  "flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-accent-300 bg-white px-2 text-navy-700 shadow-md transition-colors hover:border-accent-500 hover:bg-accent-100";

function ModeToggleButton({
  label,
  icon: Icon,
  onClick,
  ariaLabel,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={MODE_TOGGLE_BTN}
    >
      <Icon className="h-8 w-8 shrink-0" aria-hidden="true" />
      <span className="mt-1 max-w-[6rem] text-center text-xs font-bold leading-tight tracking-wide text-navy-600">
        {label}
      </span>
    </button>
  );
}

export default function ReportPage() {
  const { user } = useCurrentUser();
  const [beaconAvailable, setBeaconAvailable] = useState<boolean | null>(null);
  const [mode, setMode] = useState<ReportMode>("chat");
  const [result, setResult] = useState<FileReportResult | null>(null);
  const [chatEnded, setChatEnded] = useState(false);

  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filing, setFiling] = useState(false);

  useEffect(() => {
    fetch("/api/beacon/status")
      .then((r) => r.json())
      .then((data: { available: boolean }) => {
        setBeaconAvailable(data.available);
        if (!data.available) setMode("manual");
      })
      .catch(() => {
        setBeaconAvailable(false);
        setMode("manual");
      });
  }, []);

  const contact: ContactInfo =
    user?.role === "citizen"
      ? {
          anonymous: false,
          name: user.displayName,
          email: user.email,
          phone: user.phone,
        }
      : { anonymous: true };

  if (result) {
    return (
      <SiteShell>
        <ConfirmationView result={result} loggedIn={!!user} />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {/* Mode toggle; only shown when Beacon is available */}
      {beaconAvailable && (
        <div className="fixed right-4 top-[7rem] z-[1050] sm:right-6 lg:right-8">
          {mode === "chat" ? (
            <ModeToggleButton
              label="Manual Report Entry"
              icon={PenLine}
              onClick={() => setMode("manual")}
              ariaLabel="Manual report entry"
            />
          ) : (
            <ModeToggleButton
              label="Chat with Beacon"
              icon={MessageSquareText}
              onClick={() => setMode("chat")}
              ariaLabel="Chat with Beacon"
            />
          )}
        </div>
      )}

      <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-accent-50">
        <div className="gl-container pt-8 pb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            {mode === "chat" ? "Report an issue" : "Enter report manually"}
          </h1>
          <p className="mt-2 text-base text-ink-soft sm:text-lg">
            {mode === "chat"
              ? "Chat with Beacon to create an official report for the City of San Jose."
              : "Fill out the form directly, the City of San Jose will review it afterwards"}
          </p>
        </div>

        {/* Beacon unavailable banner */}
        {beaconAvailable === false && (
          <div className="gl-container mb-2">
            <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <WifiOff className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <span className="font-semibold">Beacon is unavailable</span>; no API key is
                configured. You can still submit a report using the form below.
              </span>
            </div>
          </div>
        )}

        <div className="gl-container flex flex-1 flex-col pt-3 pb-6 lg:pb-10">
          {mode === "chat" ? (
            <section
              aria-label="Report with Beacon"
              className="mx-auto flex w-full max-w-3xl min-h-[480px] flex-1 flex-col rounded-2xl border border-navy-100/80 bg-white p-5 shadow-2xl shadow-black/20 sm:p-6 lg:min-h-[560px]"
            >
              <header className="mb-3 border-b border-navy-100 pb-4">
                <h2 className="text-xl font-semibold text-navy-900">Beacon</h2>
              </header>
              <BeaconIntake
                reporterId={user?.role === "citizen" ? user.id : undefined}
                contact={contact}
                onFiled={setResult}
                onChatEnded={setChatEnded}
              />
              {chatEnded && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn mt-4 w-full border-2 border-navy-900 bg-white py-3.5 text-base font-semibold text-navy-900 hover:bg-navy-50"
                >
                  Report a new issue
                </button>
              )}
              <div className="mt-4">
                <BeaconCapabilities />
              </div>
            </section>
          ) : (
            <ManualForm
              category={category}
              onCategoryChange={setCategory}
              description={description}
              onDescriptionChange={setDescription}
              location={location}
              onLocationChange={setLocation}
              media={media}
              onMediaChange={setMedia}
              filing={filing}
              beaconAvailable={beaconAvailable ?? false}
              onSubmit={async () => {
                if (!category || !location || !description.trim()) return;
                setFiling(true);
                try {
                  let fileInput;
                  try {
                    const formal = await formalizeReport({
                      description: description.trim(),
                      category: category as Category,
                      location,
                    });
                    fileInput = {
                      category: formal.category,
                      description: formal.formalDescription,
                      baseSeverity: formal.baseSeverity,
                      formalTitle: formal.formalTitle,
                      residentDescription: description.trim(),
                      servicePriority: formal.servicePriority,
                    };
                  } catch {
                    // Beacon unavailable; file with raw values, no AI polish
                    fileInput = {
                      category: category as Category,
                      description: description.trim(),
                      baseSeverity: 5,
                      formalTitle: undefined,
                      residentDescription: description.trim(),
                      servicePriority: undefined,
                    };
                  }
                  const filed = await fileReport({
                    ...fileInput,
                    location,
                    media,
                    contact,
                    noticedAt: new Date().toISOString(),
                    reporterId: user?.role === "citizen" ? user.id : undefined,
                  });
                  setResult(filed);
                } finally {
                  setFiling(false);
                }
              }}
            />
          )}
        </div>
      </div>
    </SiteShell>
  );
}

function ManualForm({
  category,
  onCategoryChange,
  description,
  onDescriptionChange,
  location,
  onLocationChange,
  media,
  onMediaChange,
  filing,
  beaconAvailable,
  onSubmit,
}: {
  category: Category | "";
  onCategoryChange: (c: Category) => void;
  description: string;
  onDescriptionChange: (d: string) => void;
  location: ReportLocation | null;
  onLocationChange: (l: ReportLocation | null) => void;
  media: MediaItem[];
  onMediaChange: (m: MediaItem[]) => void;
  filing: boolean;
  beaconAvailable: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="card mx-auto w-full max-w-2xl space-y-5 p-6 sm:p-8">
      <div>
        <label htmlFor="manual-category" className="field-label text-base">
          Category
        </label>
        <select
          id="manual-category"
          className="field-input text-base"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as Category)}
        >
          <option value="">Select…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="manual-desc" className="field-label text-base">
          Description
        </label>
        <textarea
          id="manual-desc"
          rows={4}
          className="field-input resize-none text-base"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label text-base">Location</span>
        <LocationPicker value={location} onChange={onLocationChange} />
      </div>
      <div>
        <span className="field-label text-base">Photos (optional)</span>
        <MediaUpload
          items={media}
          onChange={onMediaChange}
          category={category}
          description={description}
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={filing || !category || !description.trim() || !location}
        className="btn-accent w-full py-3.5 text-base"
      >
        {filing ? "Submitting…" : "Submit report"}
      </button>
      {beaconAvailable && (
        <p className="mt-2 text-center text-sm text-ink-muted">
          Beacon will verify the category, assign a priority rating, and format
          your report for city staff before filing.
        </p>
      )}
    </div>
  );
}

function ConfirmationView({
  result,
  loggedIn,
}: {
  result: FileReportResult;
  loggedIn: boolean;
}) {
  const { report, merged, distanceM } = result;
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex-1 bg-accent-50">
    <div className="gl-container max-w-2xl py-12 lg:py-16">
      <div className="card animate-scale-in overflow-hidden">
        <div className="bg-navy-900 px-6 py-8 text-center text-white sm:px-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-500/15 text-accent-300">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            {merged ? "Report corroborated" : "Report filed"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy-200">
            {merged
              ? "Thanks; we matched your report to an existing case and added your details."
              : "Thanks for helping keep the city running."}
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-10">
          <div className="rounded-xl border border-navy-100 bg-slate-50 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Your tracking ID
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-tight text-navy-900">
                {report.id}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(report.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="btn-ghost !px-2 !py-1.5"
                aria-label="Copy tracking ID"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {merged && (
            <div className="flex items-start gap-3 rounded-xl bg-accent-50 p-4 text-sm text-accent-900 ring-1 ring-accent-200">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  Joined with {report.submissions.length} resident reports
                </p>
                <p className="mt-0.5 text-accent-800">
                  Matched within {distanceM != null ? `${distanceM}m` : "the area"}.
                  This case now has{" "}
                  <span className="font-semibold">{report.submissions.length} resident reports</span>.
                </p>
              </div>
            </div>
          )}

          {/* Report; presented exactly as City staff will see it */}
          <div className="overflow-hidden rounded-xl border border-navy-200 bg-white">
            <div className="border-b border-navy-100 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-navy-400">
                City of {CITY.name} · Municipal Service Request
              </p>
              <h2 className="mt-1.5 text-lg font-bold leading-snug text-navy-900">
                {report.formalTitle || "Service Request"}
              </h2>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded bg-slate-100/80 px-3.5 py-3 text-sm leading-relaxed text-ink">
                {report.description}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField icon={<Tag />} label="Category">
                  <CategoryChip category={report.category} size="sm" />
                </CompactField>
                <CompactField
                  icon={<Icon name={STATUS_META[report.status].icon} />}
                  label="Status"
                >
                  <StatusPill status={report.status} size="sm" />
                </CompactField>
                <CompactField icon={<MapPin />} label="Location">
                  {report.location.address ||
                    report.location.crossStreet ||
                    formatCoords(report.location.lat, report.location.lng)}
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-muted">
                    {formatCoords(report.location.lat, report.location.lng)}
                  </span>
                </CompactField>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-navy-100 pt-6 sm:flex-row">
            <Link href={`/track/${report.id}`} className="btn-primary flex-1 py-3">
              Track this report
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/report"
              className="btn-outline flex-1 py-3"
              onClick={() => window.location.reload()}
            >
              Report another issue
            </Link>
          </div>

          {!loggedIn && (
            <p className="text-center text-xs text-ink-muted">
              Want all your reports in one place?{" "}
              <Link href="/login" className="font-semibold text-accent-600 hover:text-accent-700">
                Create a free account
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// Mirrors the city staff view (FormalReportModal) so residents see their report
// in the same format; same icon sizing, label weight/color, and value styling.
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
