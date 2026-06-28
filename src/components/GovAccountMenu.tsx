"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/lib/store";
import { cx } from "@/lib/utils";

/**
 * The "Signed in · San Jose Government" badge that doubles as the sign-out
 * control. Shared by the public site header and the gov dashboard header so
 * both surfaces behave identically.
 */
export function GovAccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function signOut() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Signed in as San Jose Government ; open account menu"
        title="Signed in as San Jose Government"
        className="btn shrink-0 whitespace-nowrap border-2 border-accent-400 bg-accent-400/15 font-semibold text-accent-200 hover:border-accent-300 hover:bg-accent-400 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        San Jose Staff
        <ChevronDown
          className={cx("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[1200] mt-2 w-44 overflow-hidden rounded-lg border border-navy-200 bg-white py-1 shadow-lg shadow-navy-950/30"
        >
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
