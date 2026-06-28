"use client";

import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Building2,
  UserRound,
  Zap,
  Users,
  Route,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconHeroPreview } from "@/components/BeaconHeroPreview";
import { BeaconMark } from "@/components/Logo";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES } from "@/lib/types";
import { cx } from "@/lib/utils";
import { CITY } from "@/lib/seed";

export default function LandingPage() {
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
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/report" className="btn-accent flex-1 flex-col gap-2 py-6 text-lg sm:flex-row sm:py-5">
                <UserRound className="h-7 w-7" aria-hidden="true" />
                Report an Issue
              </Link>
              <Link href="/track" className="btn-primary flex-1 flex-col gap-2 py-6 text-lg sm:flex-row sm:py-5">
                <Building2 className="h-7 w-7" aria-hidden="true" />
                Track an Issue
              </Link>
            </div>
            <p className="mt-4 text-xs font-medium text-navy-900">
              No account needed. For emergencies, always call{" "}
              <span className="font-semibold text-navy-900">911</span>.
            </p>
          </div>

          <BeaconHeroPreview />
        </div>
      </section>

      {/* How it works ---------------------------------------------------- */}
      <HowItWorks />

      {/* Categories ------------------------------------------------------ */}
      <section className="border-y border-navy-100 bg-white py-16">
        <div className="gl-container">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            What you can report
          </h2>
          <p className="mt-2 text-ink-soft">
            Report non-emergency public infrastructure and service issues in your
            neighborhood or citywide so the City of San Jose can investigate
            and address them.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-8 sm:justify-start">
            {CATEGORIES.map((c) => (
              <div key={c} className="flex w-24 flex-col items-center text-center sm:w-28">
                <div className="grid aspect-square w-20 place-items-center rounded-full border-[3px] border-accent-400 sm:w-24">
                  <CategoryIcon
                    category={c}
                    className="h-9 w-9 text-navy-900 sm:h-10 sm:w-10"
                  />
                </div>
                <span className="mt-3 text-sm font-bold leading-tight text-navy-900">
                  {c.replace(/\//g, " & ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency + gov ---------------------------------------------- */}
      <section className="gl-container grid gap-8 py-16 md:grid-cols-2">
        {[
          {
            href: "/resolved",
            title: "See the City Deliver",
            image: "/images/see-city-deliver.jpg",
            alt: "City crew working with a resident on the street",
          },
          {
            href: "/login",
            title: "City Staff Dashboard",
            image: "/images/city-staff.jpeg",
            alt: "City of San Jose staff gathered for a community cleanup",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block overflow-hidden rounded-xl shadow-card transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <div className="relative aspect-[2/1] w-full overflow-hidden">
              <Image
                src={card.image}
                alt={card.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="border-t-4 border-accent-500 bg-navy-900 px-5 py-4 text-center">
              <span className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {card.title}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </SiteShell>
  );
}

/* ====================================================================== */
/*  How it works — the life of one report, shown end-to-end               */
/* ====================================================================== */

function HowItWorks() {
  return (
    <section className="border-b border-navy-100 bg-gradient-to-b from-white to-navy-50/40 py-16 lg:py-24">
      <div className="gl-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl lg:text-4xl">
            How GovLink works
          </h2>
        </div>

        {/* Three stages, connected left → right on desktop */}
        <div className="mt-12 grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-2">
          <Stage n={1} kicker="You describe it" title="Say it like you'd text a neighbor">
            <div className="flex justify-end">
              <p className="max-w-[92%] rounded-2xl rounded-tr-sm bg-navy-900 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                The streetlight at Elm &amp; 22nd has been out for about a week.
              </p>
            </div>
            <div className="my-3 flex items-center gap-2 pl-1">
              <BeaconMark size="sm" />
              <span className="text-xs font-semibold uppercase tracking-wide text-accent-600">
                Beacon turns it into a ticket
              </span>
            </div>
            {/* structured ticket */}
            <div className="rounded-xl border border-navy-100 bg-white p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-200">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Electricity / Power
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-navy-800">
                <MapPin className="h-4 w-4 text-navy-400" aria-hidden="true" />
                Elm St &amp; 22nd St, San Jose
              </div>
            </div>
          </Stage>

          <Connector />

          <Stage n={2} kicker="The city connects it" title="One pin on a smarter map">
            {/* mini map */}
            <div className="relative overflow-hidden rounded-xl border border-navy-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://tile.openstreetmap.org/14/2646/6363.png"
                alt="Map of San Jose"
                className="h-32 w-full object-cover"
                style={{ objectPosition: "center 40%" }}
              />
              {/* corroborating pins */}
              <Pin className="left-[22%] top-[58%]" color="#16a34a" />
              <Pin className="left-[64%] top-[30%]" color="#eab308" />
              {/* the focal pin */}
              <span className="absolute left-[42%] top-[44%] -translate-x-1/2 -translate-y-full">
                <MapPin
                  className="h-7 w-7 fill-accent-500 text-white drop-shadow"
                  aria-hidden="true"
                />
              </span>
            </div>
            <div className="mt-3.5 space-y-2.5">
              <p className="flex items-center gap-2 text-sm text-navy-800">
                <Users className="h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">3 neighbors</strong> flagged the
                  same light — ranked higher
                </span>
              </p>
              <p className="flex items-center gap-2 text-sm text-navy-800">
                <Route className="h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
                <span>
                  Auto-routed to <strong className="font-semibold">Dept. of
                  Transportation</strong>
                </span>
              </p>
            </div>
          </Stage>

          <Connector />

          <Stage n={3} kicker="You watch it close" title="Live status, no chasing">
            <ol className="space-y-0">
              <Step icon={<Check className="h-4 w-4" />} label="Sent" sub="Jun 24 · 9:14 AM" done first />
              <Step icon={<Check className="h-4 w-4" />} label="Opened by city staff" sub="Jun 24 · 2:03 PM" done />
              <Step
                icon={<Loader2 className="h-4 w-4" />}
                label="In progress"
                sub="Crew dispatched"
                done
                current
              />
              <Step icon={<Check className="h-4 w-4" />} label="Resolved" sub="Pending" />
            </ol>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-navy-900 px-3.5 py-2.5">
              <span className="text-xs font-medium text-navy-300">Tracking ID</span>
              <span className="font-mono text-sm font-bold tracking-wide text-accent-300">
                GL-7H4N-9B
              </span>
            </div>
          </Stage>
        </div>
      </div>
    </section>
  );
}

function Stage({
  n,
  kicker,
  title,
  children,
}: {
  n: number;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-accent-300">
          {n}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent-600">
            {kicker}
          </p>
          <h3 className="text-base font-semibold leading-tight text-navy-900">
            {title}
          </h3>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Chevron between stages — horizontal on desktop, hidden (stacked) on mobile. */
function Connector() {
  return (
    <div className="hidden items-center justify-center md:flex" aria-hidden="true">
      <ChevronRight className="h-6 w-6 text-navy-300" />
    </div>
  );
}

function Pin({ className, color }: { className: string; color: string }) {
  return (
    <MapPin
      className={cx("absolute h-5 w-5 -translate-x-1/2 -translate-y-full drop-shadow", className)}
      style={{ fill: color, color: "#fff" }}
      aria-hidden="true"
    />
  );
}

function Step({
  icon,
  label,
  sub,
  done = false,
  current = false,
  first = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  done?: boolean;
  current?: boolean;
  first?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* connector line */}
      {!first && (
        <span
          className={cx(
            "absolute left-[15px] top-[-12px] h-[12px] w-0.5",
            done ? "bg-accent-400" : "bg-navy-100"
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={cx(
          "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white",
          done ? "bg-accent-500 text-white" : "bg-navy-100 text-navy-400"
        )}
      >
        {icon}
      </span>
      <div className="pt-0.5">
        <p
          className={cx(
            "text-sm font-semibold leading-tight",
            done ? "text-navy-900" : "text-navy-400"
          )}
        >
          {label}
          {current && (
            <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
              Now
            </span>
          )}
        </p>
        <p className={cx("text-xs", done ? "text-ink-muted" : "text-navy-300")}>{sub}</p>
      </div>
    </li>
  );
}
