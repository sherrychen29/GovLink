import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { BeaconMark } from "./Logo";
import { severityMeta } from "@/lib/meta";
import { cx } from "@/lib/utils";

function PreviewBeaconBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <BeaconMark className="mt-0.5" />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-navy-50 px-3.5 py-2.5 text-sm leading-relaxed text-navy-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function PreviewUserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-900 px-3.5 py-2.5 text-sm leading-relaxed text-white">
        {children}
      </div>
    </div>
  );
}

/** Static homepage preview of the Beacon intake chat — matches live report UI. */
export function BeaconHeroPreview({ className }: { className?: string }) {
  const severity = 4;
  const meta = severityMeta(severity);

  return (
    <div
      className={cx(
        "card flex min-h-[420px] flex-col overflow-hidden p-0 animate-fade-in-up sm:min-h-[480px]",
        className
      )}
      aria-hidden="true"
    >
      <header className="flex items-center gap-2.5 border-b border-navy-100 px-4 py-3 sm:px-5">
        <BeaconMark size="md" />
        <div>
          <p className="text-sm font-semibold text-navy-900">Beacon</p>
          <p className="text-xs text-ink-muted">Intake assistant</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col space-y-4 px-4 py-5 sm:px-5">
        <PreviewUserBubble>
          <p>There&apos;s a streetlight that&apos;s been out for about a week near my place.</p>
        </PreviewUserBubble>

        <PreviewBeaconBubble>
          <p>
            I&apos;ll file this under <strong>Electricity / Power</strong>. Where
            exactly is the streetlight?
          </p>
        </PreviewBeaconBubble>

        <PreviewUserBubble>
          <p>Elm &amp; 22nd — the one on the northeast corner.</p>
        </PreviewUserBubble>

        <div className="flex justify-start">
          <div className="w-full max-w-[95%] rounded-2xl border border-navy-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-900 text-accent-300">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              Pin the location
            </div>
            <div className="overflow-hidden rounded-lg border border-navy-200 bg-navy-50">
              <div className="flex h-24 items-center justify-center bg-[linear-gradient(135deg,#e8eef6_25%,#d4dce8_25%,#d4dce8_50%,#e8eef6_50%,#e8eef6_75%,#d4dce8_75%,#d4dce8)] bg-[length:16px_16px]">
                <MapPin className="h-6 w-6 text-accent-500" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-2 text-sm text-navy-900">Elm St &amp; 22nd St, San Jose</p>
          </div>
        </div>

        <PreviewBeaconBubble>
          <p>
            Location set. Add a photo if you have one, or submit when you&apos;re
            ready.
          </p>
        </PreviewBeaconBubble>
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-navy-100 bg-white px-4 py-3 sm:px-5">
        <span className="font-mono text-xs font-semibold text-accent-600">
          GL-7H4N-9B
        </span>
        <span
          className={cx(
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
            meta.chip
          )}
        >
          Severity {severity} · {meta.label}
        </span>
      </footer>
    </div>
  );
}
