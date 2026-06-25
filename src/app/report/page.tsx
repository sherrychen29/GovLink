"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  Camera,
  CalendarClock,
  UserRound,
  ShieldQuestion,
  Send,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Users,
  AlertCircle,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconChat, BeaconCapabilities, type BeaconDraftReady } from "@/components/BeaconChat";
import { MediaUpload } from "@/components/MediaUpload";
import { CategoryChip } from "@/components/Chips";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SeverityBar } from "@/components/Severity";
import { StatusPill } from "@/components/StatusPill";
import { Skeleton } from "@/components/Skeleton";
import {
  CATEGORIES,
  type Category,
  type ContactInfo,
  type MediaItem,
  type Report,
  type ReportLocation,
} from "@/lib/types";
import {
  createReport,
  mergeSubmission,
  openReports,
  useCurrentUser,
} from "@/lib/store";
import { cx } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  }
);

function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

interface FileResult {
  report: Report;
  merged: boolean;
  rationale: string;
  distanceM: number | null;
}

export default function ReportPage() {
  const { user } = useCurrentUser();

  const [draft, setDraft] = useState<BeaconDraftReady | null>(null);
  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [noticedAt, setNoticedAt] = useState<string>(nowLocalInput());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [filing, setFiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileResult | null>(null);

  // Prefill contact for signed-in citizens.
  useEffect(() => {
    if (user?.role === "citizen") {
      setName(user.displayName);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  function handleReady(d: BeaconDraftReady) {
    setDraft(d);
    setCategory(d.category);
    setDescription((prev) => (prev.trim() ? prev : d.description));
    setError(null);
  }

  const hasPin = !!location;
  const canFile =
    !!draft &&
    !!category &&
    description.trim().length > 3 &&
    hasPin &&
    !filing;

  async function fileReport() {
    if (!draft || !category || !location) return;
    setFiling(true);
    setError(null);

    const contact: ContactInfo = anonymous
      ? { anonymous: true }
      : {
          anonymous: false,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        };

    const input = {
      category: category as Category,
      description: description.trim(),
      location,
      media,
      contact,
      baseSeverity: draft.baseSeverity,
      noticedAt: new Date(noticedAt).toISOString(),
      reporterId: user?.role === "citizen" ? user.id : undefined,
    };

    let decision = { matchId: null as string | null, rationale: "", distanceM: null as number | null };
    try {
      const res = await fetch("/api/beacon/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: {
            category,
            description: input.description,
            lat: location.lat,
            lng: location.lng,
          },
          candidates: openReports().map((r) => ({
            id: r.id,
            category: r.category,
            description: r.description,
            lat: r.location.lat,
            lng: r.location.lng,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        decision = {
          matchId: data.matchId ?? null,
          rationale: data.rationale ?? "",
          distanceM: data.distanceM ?? null,
        };
      }
    } catch {
      // Network failure → file as a new report rather than losing it.
      decision = { matchId: null, rationale: "Filed offline as a new report.", distanceM: null };
    }

    let report: Report | null = null;
    let merged = false;
    if (decision.matchId) {
      report = mergeSubmission(decision.matchId, {
        ...input,
        distanceM: decision.distanceM ?? undefined,
      });
      merged = !!report;
    }
    if (!report) {
      report = createReport(input);
      merged = false;
    }

    setResult({
      report,
      merged,
      rationale: decision.rationale,
      distanceM: decision.distanceM,
    });
    setFiling(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return (
      <SiteShell>
        <ConfirmationView result={result} loggedIn={!!user} />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="gl-container py-8 lg:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Report an issue
          </h1>
          <p className="mt-1.5 max-w-2xl text-ink-soft">
            Chat with Beacon to describe the problem, then set the location and
            file. It usually takes about a minute.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Beacon chat -------------------------------------------------- */}
          <section
            aria-label="Describe your issue with Beacon"
            className="card flex h-[520px] flex-col p-4 sm:p-5 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]"
          >
            <header className="mb-2 flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-navy-900">Beacon</h2>
                <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>
              <span className="text-xs text-ink-muted">Intake assistant</span>
            </header>
            <BeaconChat onReady={handleReady} />
            <div className="mt-3">
              <BeaconCapabilities />
            </div>
          </section>

          {/* Live report panel ------------------------------------------- */}
          <section aria-label="Your report" className="space-y-5">
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                  Your report
                </h2>
                {draft ? (
                  <span className="chip bg-accent-50 text-accent-700 ring-1 ring-accent-200">
                    <Check className="h-3.5 w-3.5" /> Drafted by Beacon
                  </span>
                ) : (
                  <span className="chip bg-navy-50 text-ink-muted">
                    Waiting for details
                  </span>
                )}
              </div>

              {/* Category + description */}
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="category" className="field-label">
                    Issue category
                  </label>
                  {draft ? (
                    <div className="relative">
                      <CategoryIcon
                        category={(category || "Other") as Category}
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500"
                      />
                      <select
                        id="category"
                        className="field-input appearance-none pl-9"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex h-11 items-center rounded-lg border border-dashed border-navy-200 px-3 text-sm text-ink-muted">
                      Beacon will set this from your description
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="field-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="field-input resize-none"
                    placeholder="Beacon will draft this — you can edit it here."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {draft && (
                  <div className="rounded-xl bg-navy-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-800">
                        Beacon&apos;s severity estimate
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        adjusts if others report it too
                      </span>
                    </div>
                    <div className="mt-2">
                      <SeverityBar severity={draft.baseSeverity} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <FieldCard
              icon={<MapPin className="h-4 w-4" />}
              title="Location"
              required
              done={hasPin}
            >
              <LocationPicker value={location} onChange={setLocation} />
            </FieldCard>

            {/* Media */}
            <FieldCard
              icon={<Camera className="h-4 w-4" />}
              title="Photos or video"
              optional
              done={media.length > 0}
            >
              <MediaUpload items={media} onChange={setMedia} />
            </FieldCard>

            {/* Date noticed */}
            <FieldCard
              icon={<CalendarClock className="h-4 w-4" />}
              title="When did you notice it?"
            >
              <label htmlFor="noticedAt" className="sr-only">
                Date and time noticed
              </label>
              <input
                id="noticedAt"
                type="datetime-local"
                className="field-input max-w-xs"
                value={noticedAt}
                max={nowLocalInput()}
                onChange={(e) => setNoticedAt(e.target.value)}
              />
              <p className="field-hint">
                Defaults to now — change it if you saw the issue earlier.
              </p>
            </FieldCard>

            {/* Contact */}
            <FieldCard
              icon={<UserRound className="h-4 w-4" />}
              title="Contact info"
              optional
            >
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-navy-200 p-3 transition-colors has-[:checked]:border-accent-300 has-[:checked]:bg-accent-50/40">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-navy-300 text-accent-600 focus:ring-accent-400"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                    <ShieldQuestion className="h-4 w-4 text-navy-500" aria-hidden="true" />
                    Submit anonymously
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    We&apos;ll hide your contact details but still give you a
                    tracking ID.
                  </span>
                </span>
              </label>

              <div
                className={cx(
                  "grid gap-3 transition-opacity sm:grid-cols-2",
                  anonymous && "pointer-events-none opacity-50"
                )}
              >
                <div className="sm:col-span-2">
                  <label htmlFor="c-name" className="field-label">
                    Name
                  </label>
                  <input
                    id="c-name"
                    className="field-input"
                    value={name}
                    disabled={anonymous}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="c-email" className="field-label">
                    Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className="field-input"
                    placeholder="you@gmail.com"
                    value={email}
                    disabled={anonymous}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="c-phone" className="field-label">
                    Phone
                  </label>
                  <input
                    id="c-phone"
                    type="tel"
                    className="field-input"
                    placeholder="(555) 000-0000"
                    value={phone}
                    disabled={anonymous}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </FieldCard>

            {/* File action */}
            <div className="card p-5">
              {error && (
                <p className="field-error mb-3" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={fileReport}
                disabled={!canFile}
                className="btn-accent w-full py-3 text-base"
              >
                {filing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Filing your report…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    File report
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-ink-muted">
                {!draft
                  ? "Chat with Beacon first to draft your report."
                  : !hasPin
                    ? "Drop a pin on the map to set the location."
                    : "Beacon will check for matching reports before filing."}
              </p>
            </div>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}

function FieldCard({
  icon,
  title,
  required,
  optional,
  done,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  required?: boolean;
  optional?: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-50 text-navy-600">
            {icon}
          </span>
          {title}
          {required && <span className="text-xs font-normal text-red-500">Required</span>}
          {optional && <span className="text-xs font-normal text-ink-muted">Optional</span>}
        </h3>
        {done && (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Provided" />
        )}
      </div>
      {children}
    </div>
  );
}

function ConfirmationView({
  result,
  loggedIn,
}: {
  result: FileResult;
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
              ? "Thanks — we matched your report to an existing case and added your details. This raises its priority with the city."
              : "Thanks for helping keep the city running. Your report is on its way to the right team."}
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
            <p className="mt-1 text-xs text-ink-muted">
              Save this to check your report&apos;s status anytime.
            </p>
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
                  Severity is now{" "}
                  <span className="font-semibold">{report.severity}/10</span>.
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
            <Link
              href={`/track/${report.id}`}
              className="btn-primary flex-1 py-3"
            >
              Track this report
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/report" className="btn-outline flex-1 py-3" onClick={() => window.location.reload()}>
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
