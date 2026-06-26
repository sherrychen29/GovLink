"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageSquareText,
  MapPin,
  Activity,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconHeroPreview } from "@/components/BeaconHeroPreview";
import { CategoryChip } from "@/components/Chips";
import { useReports } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";
import { CITY } from "@/lib/seed";

export default function LandingPage() {
  const { reports, hydrated } = useReports();
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const active = reports.filter((r) => r.status !== "resolved").length;
  const residents = reports.reduce((n, r) => n + r.submissions.length, 0);

  return (
    <SiteShell>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-navy-100">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/images/san-jose-skyline.jpg')] bg-cover bg-center bg-no-repeat"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-white/80" />
        <div className="gl-container relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <a
              href="https://www.sanjoseca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded focus-visible:ring-2 focus-visible:ring-accent-400"
              aria-label="City of San Jose — Capital of Silicon Valley"
            >
              <Image
                src="/images/san-jose-seal.png"
                alt="City of San Jose — Capital of Silicon Valley"
                width={1752}
                height={990}
                className="h-20 w-auto sm:h-24"
              />
            </a>
            <h1 className="mt-5">
              <span className="block text-[2.125rem] font-bold leading-[1.07] tracking-tight text-accent-500 sm:text-[2.875rem] lg:text-[3.625rem]">
                Built for residents.
              </span>
              <span className="mt-1 block text-[2.125rem] font-bold leading-[1.07] tracking-tight text-navy-900 sm:text-[2.875rem] lg:text-[3.625rem]">
                Built for San Jose.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink">
              GovLink is the direct line between {CITY.name} residents and city
              hall for everyday non-emergency issues. Broken streetlights, water
              leaks, fallen trees, and more: describe it in plain words, file a report, and bring it to our attention.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/report" className="btn-accent px-5 py-3 text-base">
                Report an issue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/track" className="btn-outline px-5 py-3 text-base">
                Track a report
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              No account needed. For emergencies, always call{" "}
              <span className="font-semibold text-navy-800">911</span>.
            </p>
          </div>

          <BeaconHeroPreview />
        </div>
      </section>

      {/* Stats ------------------------------------------------------------ */}
      <section className="border-b border-navy-100 bg-white">
        <div className="gl-container grid grid-cols-2 gap-px overflow-hidden rounded-none sm:grid-cols-4">
          {[
            { label: "Reports filed", value: hydrated ? reports.length : "—" },
            { label: "Active issues", value: hydrated ? active : "—" },
            { label: "Resolved", value: hydrated ? resolved : "—" },
            { label: "Resident voices", value: hydrated ? residents : "—" },
          ].map((s) => (
            <div key={s.label} className="px-2 py-7 text-center">
              <div className="text-3xl font-bold tracking-tight text-navy-900">
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works ---------------------------------------------------- */}
      <section className="gl-container py-16 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Reporting an issue takes a minute
          </h2>
          <p className="mt-3 text-ink-soft">
            No forms to decode. Just tell Beacon what&apos;s wrong and where —
            it builds a complete, standardized report for the right city team.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: MessageSquareText,
              title: "Describe it",
              body: "Tell Beacon what you see in plain language. It asks only the questions it needs to file a clear report.",
            },
            {
              icon: MapPin,
              title: "Pinpoint it",
              body: "Share your location automatically or drop a pin on the map. Add a photo if you have one.",
            },
            {
              icon: Activity,
              title: "Track it",
              body: "Get a tracking ID and follow your report from Sent to Resolved — no chasing required.",
            },
          ].map((step, i) => (
            <div key={step.title} className="card p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-accent-300">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories ------------------------------------------------------ */}
      <section className="border-y border-navy-100 bg-white py-16">
        <div className="gl-container">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            What you can report
          </h2>
          <p className="mt-2 text-ink-soft">
            From a flickering streetlight to a downed branch — if it&apos;s a
            non-emergency city issue, it belongs here.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <CategoryChip key={c} category={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Transparency + gov ---------------------------------------------- */}
      <section className="gl-container grid gap-5 py-16 md:grid-cols-2">
        <div className="card flex flex-col justify-between gap-6 p-7">
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-navy-900">
              See the city deliver
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Every resolved issue is published to a public transparency feed.
              Watch problems across {CITY.name} get closed out, week by week.
            </p>
          </div>
          <Link href="/resolved" className="btn-outline self-start">
            View resolved issues
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="card flex flex-col justify-between gap-6 bg-navy-900 p-7 text-white">
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-accent-300">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">
              City staff
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">
              Triage incoming reports on a live map, ranked by severity and
              corroboration. Update status, add internal notes, and keep
              residents informed.
            </p>
          </div>
          <Link
            href="/login"
            className="btn self-start bg-accent-500 text-white hover:bg-accent-600"
          >
            Open the dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
