"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { clearAllData, loadGenerated150Reports, login } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        {/* Background photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cdn.kqed.org/wp-content/uploads/sites/10/2023/07/RS36045__M6A0663-KQED.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* Navy blue overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-navy-900/75"
        />
        <Link href="/" className="relative inline-flex">
          <Logo markClassName="h-9 brightness-0 invert" />
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Government Staff Portal
          </h1>
          <p className="mt-4 text-navy-200">
            Sign in with your city-issued credentials to access the dashboard,
            triage incoming reports, and keep residents informed.
          </p>
        </div>
        <p className="relative text-xs text-navy-300">
          Prototype for FutureHacks · For emergencies call 911
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex lg:hidden">
            <Logo />
          </Link>

          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-lg border-2 border-navy-800 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>

          <SignInForm router={router} />
        </div>

        <DemoTools />
      </div>
    </div>
  );
}

function DemoTools() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate150() {
    if (
      !window.confirm(
        "Load 150 generated reports? This replaces all current reports."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await loadGenerated150Reports();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to load 150 reports."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-10 flex flex-col items-end gap-1 text-[11px] text-ink-muted/80">
      <button
        type="button"
        className="pointer-events-auto transition-colors hover:text-navy-800"
        onClick={() => {
          if (window.confirm("Clear all reports? Demo accounts are kept.")) {
            clearAllData();
          }
        }}
      >
        Reset demo
      </button>
      <button
        type="button"
        className="pointer-events-auto transition-colors hover:text-navy-800 disabled:opacity-50"
        disabled={loading}
        onClick={handleGenerate150}
      >
        {loading ? "Loading 150…" : "Generate 150 cases"}
      </button>
    </div>
  );
}

function SignInForm({ router }: { router: ReturnType<typeof useRouter> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const acc = login(username, password);
    if (!acc) {
      setError("That username and password don't match. Try again.");
      setBusy(false);
      return;
    }
    router.push("/gov");
  }

  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight text-navy-900">
        Staff credentials
      </h2>
      <p className="mt-1 text-base text-ink-soft">
        Sign in with your city-issued account.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            className="field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="field-error" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-4 text-base" disabled={busy}>
          Sign in
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Demo account · password &ldquo;demo&rdquo;
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setUsername("government");
              setPassword("demo");
              setError(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-accent-300 hover:bg-accent-50/40"
          >
            <Building2 className="h-4 w-4 text-navy-500" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-navy-900">Government</span>
              <span className="block text-xs text-ink-muted">government</span>
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
