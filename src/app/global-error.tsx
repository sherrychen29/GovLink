"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-navy-900">
        <div className="grid min-h-screen place-items-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              GovLink encountered a critical error. Please refresh or try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg bg-[#0b2447] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1f3d]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
