"use client";

import Link from "next/link";
import Image from "next/image";
import {
  MessageSquareText,
  MapPin,
  Activity,
  Building2,
  UserRound,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { BeaconHeroPreview } from "@/components/BeaconHeroPreview";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES } from "@/lib/types";
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
            <p className="mt-4 text-xs text-ink-muted">
              No account needed. For emergencies, always call{" "}
              <span className="font-semibold text-navy-800">911</span>.
            </p>
          </div>

          <BeaconHeroPreview />
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
            title: "City Staff",
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
