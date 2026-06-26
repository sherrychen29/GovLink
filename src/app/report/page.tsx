"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconCapabilities } from "@/components/BeaconIntake";
import { LocationPicker } from "@/components/map/LocationPickerDynamic";
import { CategoryChip } from "@/components/Chips";
import { SeverityBar } from "@/components/Severity";
import { StatusPill } from "@/components/StatusPill";
import { formalizeReport } from "@/lib/formalize-report";
import { fileReport, type FileReportResult } from "@/lib/file-report";
import {
  CATEGORIES,
  type Category,
  type ContactInfo,
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
  "flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-accent-300 bg-white text-navy-700 shadow-md transition-colors hover:border-accent-500 hover:bg-accent-100";

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
      <Icon className="h-8 w-8" aria-hidden="true" />
      <span className="mt-1.5 text-[11px] font-bold leading-none tracking-wide text-navy-600">
        {label}
      </span>
    </button>
  );
}

export default function ReportPage() {
  const { user } = useCurrentUser();
  const [mode, setMode] = useState<ReportMode>("chat");
  const [result, setResult] = useState<FileReportResult | null>(null);

  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [filing, setFiling] = useState(false);

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
      <div className="fixed right-4 top-[6.75rem] z-[1050] sm:right-6 lg:right-8">
        {mode === "chat" ? (
          <ModeToggleButton
            label="Manual"
            icon={PenLine}
            onClick={() => setMode("manual")}
            ariaLabel="Enter manually"
          />
        ) : (
          <ModeToggleButton
            label="Beacon"
            icon={MessageSquareText}
            onClick={() => setMode("chat")}
            ariaLabel="Back to Beacon"
          />
        )}
      </div>

      {mode === "chat" ? (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-accent-50">
          <div className="gl-container py-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
              Report an issue
            </h1>
          </div>

          <div className="gl-container flex flex-1 flex-col py-4 lg:py-8">
            <section
              aria-label="Report with Beacon"
              className="mx-auto flex w-full max-w-3xl min-h-[480px] flex-1 flex-col rounded-2xl border border-navy-100/80 bg-white p-4 shadow-2xl shadow-black/20 sm:p-5 lg:min-h-[560px]"
            >
              <header className="mb-2 flex items-center justify-between border-b border-navy-100 pb-3">
                <h2 className="text-sm font-semibold text-navy-900">Beacon</h2>
                <span className="text-xs text-ink-muted">Intake assistant</span>
              </header>
              <BeaconIntake
                reporterId={user?.role === "citizen" ? user.id : undefined}
                contact={contact}
                onFiled={setResult}
              />
              <div className="mt-3">
                <BeaconCapabilities />
              </div>
            </section>
          </div>
        </div>
      ) : (
        <ManualForm
          category={category}
          onCategoryChange={setCategory}
          description={description}
          onDescriptionChange={setDescription}
          location={location}
          onLocationChange={setLocation}
          filing={filing}
          onSubmit={async () => {
            if (!category || !location || !description.trim()) return;
            setFiling(true);
            try {
              const formal = await formalizeReport({
                description: description.trim(),
                category: category as Category,
                location,
              });
              const result = await fileReport({
                category: formal.category,
                description: formal.formalDescription,
                location,
                media: [],
                contact,
                baseSeverity: formal.baseSeverity,
                noticedAt: new Date().toISOString(),
                reporterId: user?.role === "citizen" ? user.id : undefined,
                formalTitle: formal.formalTitle,
                residentDescription: description.trim(),
                servicePriority: formal.servicePriority,
              });
              setResult(result);
            } finally {
              setFiling(false);
            }
          }}
        />
      )}
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
  filing,
  onSubmit,
}: {
  category: Category | "";
  onCategoryChange: (c: Category) => void;
  description: string;
  onDescriptionChange: (d: string) => void;
  location: ReportLocation | null;
  onLocationChange: (l: ReportLocation | null) => void;
  filing: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen bg-accent-50">
      <div className="gl-container max-w-2xl py-8 lg:py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Enter report manually
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Fill out the form directly — no chat required.
          </p>
        </div>

        <div className="card space-y-4 p-5 sm:p-6">
          <div>
            <label htmlFor="manual-category" className="field-label">
              Category
            </label>
            <select
              id="manual-category"
              className="field-input"
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
            <label htmlFor="manual-desc" className="field-label">
              Description
            </label>
            <textarea
              id="manual-desc"
              rows={4}
              className="field-input resize-none"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
          <div>
            <span className="field-label">Location</span>
            <LocationPicker value={location} onChange={onLocationChange} />
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={filing || !category || !description.trim() || !location}
            className="btn-accent w-full py-3"
          >
            {filing ? "Formatting & submitting…" : "Submit report"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Beacon will verify the category, assign a priority rating, and format
            your report for city staff before filing.
          </p>
        </div>
      </div>
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
              ? "Thanks — we matched your report to an existing case and added your details."
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

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Category">
              <CategoryChip category={report.category} />
            </Detail>
            <Detail label="Status">
              <StatusPill status={report.status} />
            </Detail>
            <Detail label="Severity">
              <SeverityBar severity={report.severity} />
            </Detail>
            <Detail label="Location">
              <span className="text-sm text-navy-900">
                {report.location.address ||
                  report.location.crossStreet ||
                  `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
              </span>
            </Detail>
          </dl>

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
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
