"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Phone,
  Send,
  TriangleAlert,
  Ban,
  Info,
  Loader2,
  CheckCircle2,
  SkipForward,
  MapPin,
  Camera,
  Mail,
} from "lucide-react";
import { BeaconMark } from "./Logo";
import { MediaUpload } from "./MediaUpload";
import { CategoryChip } from "./Chips";
import { LocationPicker } from "./map/LocationPickerDynamic";
import { cx } from "@/lib/utils";
import { extractLocationHint, type BeaconIntent } from "@/lib/beacon-logic";
import type { Category, ContactInfo, ChatLogEntry, MediaItem, Report, ReportLocation, ServicePriority } from "@/lib/types";
import { formalizeReport, locationLabel } from "@/lib/formalize-report";
import { fileReport, type FileReportResult } from "@/lib/file-report";
import { BEACON_GREETING } from "@/lib/seed";

interface BeaconDraftReady {
  category: Category;
  description: string;
  baseSeverity: number;
  formalTitle?: string;
  residentDescription?: string;
  servicePriority?: ServicePriority;
}

type IntakePhase = "intake" | "review" | "blocked" | "filed";
type WidgetKind = "map" | "photos" | "contact" | "review";

type ChatItem =
  | { id: string; kind: "beacon"; text: string; intent?: BeaconIntent }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "widget"; widget: WidgetKind; locked: boolean };

function nowIso(): string {
  return new Date().toISOString();
}

function buildChatLog(items: ChatItem[]): ChatLogEntry[] {
  return items
    .filter(
      (item): item is Extract<ChatItem, { kind: "beacon" | "user" }> =>
        item.kind === "beacon" || item.kind === "user"
    )
    .map((item) => {
      const match = item.id.match(/_(\d{10,})$/);
      const at = match ? new Date(Number(match[1])).toISOString() : nowIso();
      return {
        role: item.kind === "user" ? "user" : "beacon",
        text: item.text,
        at,
      };
    });
}

function hasTrackableContact(c: ContactInfo): boolean {
  return !!(c.email?.trim() || c.phone?.trim());
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function BeaconIntake({
  reporterId,
  contact,
  onFiled,
}: {
  reporterId?: string;
  contact: ContactInfo;
  onFiled: (result: FileReportResult) => void;
}) {
  const [items, setItems] = useState<ChatItem[]>([
    { id: "greet", kind: "beacon", text: BEACON_GREETING },
  ]);
  const [phase, setPhase] = useState<IntakePhase>("intake");
  const [draft, setDraft] = useState<BeaconDraftReady | null>(null);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [filing, setFiling] = useState(false);
  const [lastIntent, setLastIntent] = useState<BeaconIntent | null>(null);
  const [mapSearchHint, setMapSearchHint] = useState<string | undefined>();
  const [reportContact, setReportContact] = useState<ContactInfo>(contact);
  const [contactEmail, setContactEmail] = useState(contact.email ?? "");
  const [contactPhone, setContactPhone] = useState(contact.phone ?? "");
  const [contactError, setContactError] = useState<string | null>(null);

  const accountHasContact = !contact.anonymous && hasTrackableContact(contact);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const widgetsAdded = useRef({ map: false, photos: false, contact: false, review: false });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items, busy, draft, location, media]);

  function append(...next: ChatItem[]) {
    setItems((prev) => [...prev, ...next]);
  }

  function lockWidget(widget: WidgetKind) {
    setItems((prev) =>
      prev.map((item) =>
        item.kind === "widget" && item.widget === widget
          ? { ...item, locked: true }
          : item
      )
    );
  }

  function apiMessages() {
    return items
      .filter((i) => i.kind === "beacon" || i.kind === "user")
      .filter((i) => i.id !== "greet")
      .map((i) => ({
        role: i.kind === "user" ? ("user" as const) : ("assistant" as const),
        content: i.text,
      }));
  }

  async function callBeacon(userText: string) {
    const messages = [
      ...apiMessages(),
      { role: "user" as const, content: userText },
    ];

    const body: Record<string, unknown> = { messages };
    if (phase === "review" && draft) {
      body.context = {
        phase: "review",
        category: draft.category,
        description: draft.residentDescription ?? draft.description,
        baseSeverity: draft.baseSeverity,
      };
    }

    const res = await fetch("/api/beacon/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("bad status");
    return res.json();
  }

  async function applyFormalization(
    residentText: string,
    category: Category,
    loc?: ReportLocation | null
  ) {
    const formal = await formalizeReport({
      description: residentText,
      category,
      location: loc,
    });
    setDraft({
      category: formal.category,
      description: formal.formalDescription,
      formalTitle: formal.formalTitle,
      baseSeverity: formal.baseSeverity,
      residentDescription: residentText,
      servicePriority: formal.servicePriority,
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || phase === "blocked" || phase === "filed") return;

    append({ id: `u_${Date.now()}`, kind: "user", text });
    setInput("");
    setBusy(true);

    try {
      const data = await callBeacon(text);
      append({
        id: `b_${Date.now()}`,
        kind: "beacon",
        text: data.reply,
        intent: data.intent,
      });
      setLastIntent(data.intent);

      if (data.intent === "emergency" || data.intent === "spam") {
        setPhase("blocked");
        return;
      }

      if (data.intent === "redirect") {
        return;
      }

      if (data.intent === "review_reply" && data.draft) {
        await applyFormalization(
          data.draft.description,
          data.draft.category,
          location
        );
      }

      if (data.intent === "ready" && data.draft) {
        const residentLines = items
          .filter((i) => i.kind === "user")
          .map((i) => i.text);
        residentLines.push(text);
        const hint =
          data.draft.locationHint ??
          extractLocationHint(residentLines.join("\n")) ??
          undefined;
        setMapSearchHint(hint);

        await applyFormalization(
          residentLines.join("\n"),
          data.draft.category,
          null
        );
        if (!widgetsAdded.current.map) {
          widgetsAdded.current.map = true;
          append({
            id: `w_map_${Date.now()}`,
            kind: "widget",
            widget: "map",
            locked: false,
          });
        }
      }
    } catch {
      append({
        id: `err_${Date.now()}`,
        kind: "beacon",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
      });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function confirmLocation() {
    if (!location || !draft) return;
    lockWidget("map");
    const label = locationLabel(location) ?? "pinned location";
    try {
      await applyFormalization(
        draft.residentDescription ?? draft.description,
        draft.category,
        location
      );
    } catch {
      /* keep existing draft if formalize fails */
    }
    append(
      { id: `u_loc_${Date.now()}`, kind: "user", text: `Location set: ${label}` },
      {
        id: `b_photos_${Date.now()}`,
        kind: "beacon",
        text: "Photos help the city respond faster. Add any below, or skip if you don't have any.",
      }
    );
    if (!widgetsAdded.current.photos) {
      widgetsAdded.current.photos = true;
      append({
        id: `w_photos_${Date.now()}`,
        kind: "widget",
        widget: "photos",
        locked: false,
      });
    }
  }

  function finishPhotos(skipped: boolean) {
    lockWidget("photos");
    if (skipped) {
      append({
        id: `u_skip_${Date.now()}`,
        kind: "user",
        text: "No photos to add",
      });
    } else {
      append({
        id: `u_photos_${Date.now()}`,
        kind: "user",
        text: `Added ${media.length} photo${media.length === 1 ? "" : "s"}`,
      });
    }
    showContactStep();
  }

  function showContactStep() {
    if (accountHasContact) {
      append({
        id: `b_contact_${Date.now()}`,
        kind: "beacon",
        text: "We already have your email or phone on file — you can look up this report on the Track page even without the tracking ID.",
      });
      showReview();
      return;
    }

    append({
      id: `b_contact_${Date.now()}`,
      kind: "beacon",
      text: "Optional: add an email or phone number so you can find this report later on the Track page without your tracking ID. You can skip if you prefer.",
    });
    if (!widgetsAdded.current.contact) {
      widgetsAdded.current.contact = true;
      append({
        id: `w_contact_${Date.now()}`,
        kind: "widget",
        widget: "contact",
        locked: false,
      });
    }
  }

  function finishContact(skipped: boolean) {
    lockWidget("contact");
    setContactError(null);

    if (skipped) {
      setReportContact({ anonymous: true });
      append({
        id: `u_contact_skip_${Date.now()}`,
        kind: "user",
        text: "Skip contact info",
      });
      showReview();
      return;
    }

    const email = contactEmail.trim();
    const phone = contactPhone.trim();

    if (!email && !phone) {
      setContactError("Enter an email or phone number, or skip this step.");
      return;
    }
    if (email && !isValidEmail(email)) {
      setContactError("Please enter a valid email address.");
      return;
    }

    const next: ContactInfo = {
      anonymous: false,
      name: contact.name,
      email: email || undefined,
      phone: phone || undefined,
    };
    setReportContact(next);

    const parts = [email && `email ${email}`, phone && `phone ${phone}`].filter(Boolean);
    append({
      id: `u_contact_${Date.now()}`,
      kind: "user",
      text: `Contact added: ${parts.join(", ")}`,
    });
    showReview();
  }

  function showReview() {
    append({
      id: `b_review_${Date.now()}`,
      kind: "beacon",
      text: "Here's your report. Review everything below and hit Submit when it looks right. If something's off — including the severity ranking — tell me here and I'll take another look.",
    });
    if (!widgetsAdded.current.review) {
      widgetsAdded.current.review = true;
      append({
        id: `w_review_${Date.now()}`,
        kind: "widget",
        widget: "review",
        locked: false,
      });
    }
    setPhase("review");
  }

  async function submitReport() {
    if (!draft || !location || filing) return;
    setFiling(true);

    try {
      const { report, merged, distanceM } = await fileReport({
        category: draft.category,
        description: draft.description,
        location,
        media,
        contact: reportContact,
        baseSeverity: draft.baseSeverity,
        noticedAt: nowIso(),
        reporterId,
        formalTitle: draft.formalTitle,
        residentDescription: draft.residentDescription ?? draft.description,
        servicePriority: draft.servicePriority,
        chatLog: buildChatLog(items),
      });

      lockWidget("review");
      setPhase("filed");
      append({
        id: `b_filed_${Date.now()}`,
        kind: "beacon",
        text: merged
          ? "Report submitted — your details were added to an existing case nearby. Thank you!"
          : "Report submitted — thank you for helping keep San Jose running!",
      });
      onFiled({ report, merged, distanceM });
    } finally {
      setFiling(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const chatDisabled = phase === "blocked" || phase === "filed";

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-1 py-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation with Beacon"
      >
        {items.map((item) => {
          if (item.kind === "beacon") {
            return <BeaconBubble key={item.id} text={item.text} intent={item.intent} />;
          }
          if (item.kind === "user") {
            return <UserBubble key={item.id} text={item.text} />;
          }
          if (item.widget === "map") {
            return (
              <WidgetShell key={item.id} title="Pin the location" icon={<MapPin className="h-4 w-4" />}>
                {item.locked && location ? (
                  <LocationPicker value={location} onChange={() => {}} readOnly compact />
                ) : (
                  <>
                    <LocationPicker
                      compact
                      value={location}
                      onChange={setLocation}
                      initialSearchQuery={mapSearchHint}
                    />
                    <button
                      type="button"
                      onClick={confirmLocation}
                      disabled={!location}
                      className="btn-accent mt-3 w-full"
                    >
                      Confirm location
                    </button>
                  </>
                )}
              </WidgetShell>
            );
          }
          if (item.widget === "photos") {
            return (
              <WidgetShell key={item.id} title="Add photos" icon={<Camera className="h-4 w-4" />}>
                {item.locked ? (
                  <p className="text-sm text-ink-soft">
                    {media.length
                      ? `${media.length} photo${media.length === 1 ? "" : "s"} attached`
                      : "No photos added"}
                  </p>
                ) : (
                  <>
                    <MediaUpload items={media} onChange={setMedia} />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => finishPhotos(false)}
                        className="btn-accent flex-1"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => finishPhotos(true)}
                        className="btn-outline flex-1"
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />
                        Skip
                      </button>
                    </div>
                  </>
                )}
              </WidgetShell>
            );
          }
          if (item.widget === "contact") {
            return (
              <WidgetShell key={item.id} title="Contact info (optional)" icon={<Mail className="h-4 w-4" />}>
                {item.locked ? (
                  <p className="text-sm text-ink-soft">
                    {hasTrackableContact(reportContact)
                      ? [reportContact.email, reportContact.phone].filter(Boolean).join(" · ")
                      : "No contact info added"}
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-sm text-ink-soft">
                      Used only to look up this report on the Track page — the city
                      won&apos;t share it publicly.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="beacon-contact-email" className="field-label">
                          Email
                        </label>
                        <input
                          id="beacon-contact-email"
                          type="email"
                          autoComplete="email"
                          className="field-input"
                          placeholder="you@example.com"
                          value={contactEmail}
                          onChange={(e) => {
                            setContactEmail(e.target.value);
                            setContactError(null);
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="beacon-contact-phone" className="field-label">
                          Phone
                        </label>
                        <input
                          id="beacon-contact-phone"
                          type="tel"
                          autoComplete="tel"
                          className="field-input"
                          placeholder="(408) 555-0100"
                          value={contactPhone}
                          onChange={(e) => {
                            setContactPhone(e.target.value);
                            setContactError(null);
                          }}
                        />
                      </div>
                    </div>
                    {contactError && (
                      <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                        {contactError}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => finishContact(false)}
                        className="btn-accent flex-1"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => finishContact(true)}
                        className="btn-outline flex-1"
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />
                        Skip
                      </button>
                    </div>
                  </>
                )}
              </WidgetShell>
            );
          }
          if (item.widget === "review" && draft && location) {
            return (
              <WidgetShell
                key={item.id}
                title="Review & submit"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                {draft.formalTitle && (
                  <p className="mb-3 text-sm font-semibold text-navy-900">
                    {draft.formalTitle}
                  </p>
                )}
                <dl className="space-y-3 text-sm">
                  <ReviewRow label="Category">
                    <CategoryChip category={draft.category} size="sm" />
                  </ReviewRow>
                  <ReviewRow label="Priority">
                    <span className="chip bg-navy-100 text-navy-800 ring-1 ring-navy-200">
                      {draft.servicePriority ?? "Standard"} · {draft.baseSeverity}/10
                    </span>
                  </ReviewRow>
                  <ReviewRow label="Official summary">{draft.description}</ReviewRow>
                  {draft.residentDescription &&
                    draft.residentDescription !== draft.description && (
                      <ReviewRow label="Your words">
                        <span className="text-ink-soft italic">
                          &ldquo;{draft.residentDescription}&rdquo;
                        </span>
                      </ReviewRow>
                    )}
                  <ReviewRow label="Location">
                    {location.address ||
                      location.crossStreet ||
                      `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </ReviewRow>
                  {media.length > 0 && (
                    <ReviewRow label="Photos">{media.length} attached</ReviewRow>
                  )}
                  <ReviewRow label="Contact">
                    {hasTrackableContact(reportContact)
                      ? [reportContact.email, reportContact.phone]
                          .filter(Boolean)
                          .join(" · ")
                      : "Anonymous — save your tracking ID"}
                  </ReviewRow>
                </dl>
                {!item.locked && (
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={filing}
                    className="btn-accent mt-4 w-full py-3 text-base"
                  >
                    {filing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        Submitting…
                      </>
                    ) : (
                      "Submit report"
                    )}
                  </button>
                )}
              </WidgetShell>
            );
          }
          return null;
        })}
        {busy && <TypingBubble />}
      </div>

      {phase === "filed" ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          Report submitted successfully.
        </div>
      ) : (
        <form
          className="mt-3 flex items-end gap-2 border-t border-navy-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="beacon-input" className="sr-only">
            Message Beacon
          </label>
          <textarea
            id="beacon-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              chatDisabled
                ? "Chat ended for this report"
                : lastIntent === "emergency"
                  ? "If this is an emergency, call 911 first…"
                  : lastIntent === "redirect"
                    ? "Describe a public infrastructure issue…"
                    : phase === "review"
                      ? "Question or correction about your report…"
                      : "Describe what's wrong…"
            }
            className="field-input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
            disabled={busy || chatDisabled}
          />
          <button
            type="submit"
            className="btn-accent h-11 w-11 shrink-0 !p-0"
            disabled={busy || chatDisabled || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

function WidgetShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] rounded-2xl border border-navy-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-900 text-accent-300">
            {icon}
          </span>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function ReviewRow({
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
      <dd className="mt-1 text-navy-900">{children}</dd>
    </div>
  );
}

function BeaconBubble({ text, intent }: { text: string; intent?: BeaconIntent }) {
  const emergency = intent === "emergency";
  const spam = intent === "spam";
  const redirect = intent === "redirect";
  return (
    <div className="flex items-start gap-2.5">
      <BeaconMark className="mt-0.5" />
      <div className="min-w-0 max-w-[85%]">
        <div
          className={cx(
            "rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed",
            emergency
              ? "bg-red-50 text-red-900 ring-1 ring-red-200"
              : spam
                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                : redirect
                  ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                  : "bg-navy-50 text-navy-900"
          )}
        >
          {emergency && (
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Emergency
            </span>
          )}
          {spam && (
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
              <Ban className="h-4 w-4" aria-hidden="true" /> Couldn&apos;t file this
            </span>
          )}
          {redirect && (
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-700">
              <ArrowRight className="h-4 w-4" aria-hidden="true" /> Not a city report
            </span>
          )}
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
        {emergency && (
          <a
            href="tel:911"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call 911 now
          </a>
        )}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-900 px-3.5 py-2.5 text-sm leading-relaxed text-white">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="true">
      <BeaconMark />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-navy-50 px-4 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

export function BeaconCapabilities() {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-navy-50/70 px-3 py-2 text-xs text-ink-soft">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
      <span>
        Beacon walks you through reporting step by step — map, photos, optional
        contact, and review all happen right here in chat. Add an email or phone
        to look up reports without a tracking ID. Emergencies go to 911.
      </span>
    </div>
  );
}
