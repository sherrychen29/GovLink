import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="text-center">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-navy-900 text-accent-300">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900">
          Page not found
        </h1>
        <p className="mt-2 text-ink-soft">
          We couldn&apos;t find that page. Let&apos;s get you back on track.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/report" className="btn-outline">
            Report an issue
          </Link>
        </div>
      </div>
    </div>
  );
}
