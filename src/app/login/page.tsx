"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Building2, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { login, registerCitizen } from "@/lib/store";
import { cx } from "@/lib/utils";

const DEMO = [
  { username: "government", label: "Government", role: "gov" as const },
  { username: "citizen1", label: "Citizen", role: "citizen" as const },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_80%_0%,rgba(31,199,239,0.18),transparent),radial-gradient(40%_40%_at_0%_100%,rgba(31,199,239,0.10),transparent)]"
        />
        <Link href="/" className="relative inline-flex">
          <Logo
            markClassName="h-9 w-9"
            className="[&_span]:text-white [&_.text-accent-500]:text-accent-400"
          />
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            One platform. Two sides of the same city.
          </h1>
          <p className="mt-4 text-navy-200">
            Residents report the everyday problems they see. City staff triage
            and resolve them in the open. GovLink keeps everyone moving forward.
          </p>
        </div>
        <p className="relative text-xs text-navy-300">
          Prototype for FutureHacks · For emergencies call 911
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex lg:hidden">
            <Logo />
          </Link>

          <div className="mb-6 inline-flex rounded-lg border border-navy-200 bg-navy-50 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={cx(
                "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
                mode === "signin"
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-ink-soft hover:text-navy-900"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={cx(
                "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
                mode === "register"
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-ink-soft hover:text-navy-900"
              )}
            >
              Create account
            </button>
          </div>

          {mode === "signin" ? (
            <SignInForm router={router} />
          ) : (
            <RegisterForm router={router} />
          )}
        </div>
      </div>
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
    router.push(acc.role === "government" ? "/gov" : "/account");
  }

  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight text-navy-900">
        Welcome back
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Sign in to manage your reports.
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

        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          Sign in
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Demo accounts · password “demo”
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.username}
              type="button"
              onClick={() => {
                setUsername(d.username);
                setPassword("demo");
                setError(null);
              }}
              className="flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-accent-300 hover:bg-accent-50/40"
            >
              {d.role === "gov" ? (
                <Building2 className="h-4 w-4 text-navy-500" aria-hidden="true" />
              ) : (
                <UserRound className="h-4 w-4 text-navy-500" aria-hidden="true" />
              )}
              <span>
                <span className="block font-semibold text-navy-900">
                  {d.label}
                </span>
                <span className="block text-xs text-ink-muted">
                  {d.username}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Also: <span className="font-medium">citizen2</span>,{" "}
          <span className="font-medium">citizen3</span> (password “demo”).
        </p>
      </div>
    </>
  );
}

function RegisterForm({ router }: { router: ReturnType<typeof useRouter> }) {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.username || !form.password || !form.displayName) {
      setError("Name, username and password are required.");
      return;
    }
    if (!form.email && !form.phone) {
      setError("Add an email or phone so we can link your reports.");
      return;
    }
    const res = registerCitizen(form);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/account");
  }

  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight text-navy-900">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Optional — it just keeps all your reports in one place.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="displayName" className="field-label">
            Full name
          </label>
          <input
            id="displayName"
            className="field-input"
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@gmail.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              className="field-input"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 000-0000"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-username" className="field-label">
              Username
            </label>
            <input
              id="new-username"
              autoComplete="username"
              className="field-input"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="new-password" className="field-label">
              Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p className="field-error" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-3">
          Create account
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-center text-xs text-ink-muted">
          You can always report an issue without an account.
        </p>
      </form>
    </>
  );
}
