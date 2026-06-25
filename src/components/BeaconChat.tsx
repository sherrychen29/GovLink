"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Send, TriangleAlert, Ban, Info } from "lucide-react";
import { LogoMark } from "./Logo";
import { cx } from "@/lib/utils";
import type { BeaconIntent } from "@/lib/beacon-logic";
import type { Category } from "@/lib/types";

export interface BeaconDraftReady {
  category: Category;
  description: string;
  baseSeverity: number;
}

interface ChatMsg {
  id: string;
  role: "user" | "beacon";
  content: string;
  intent?: BeaconIntent;
}

const GREETING =
  "Hi, I'm Beacon — I help report city issues. Tell me what's going on and roughly where, and I'll put together a report for you. What are you seeing?";

export function BeaconChat({
  onReady,
  filed = false,
}: {
  onReady: (draft: BeaconDraftReady) => void;
  filed?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "greet", role: "beacon", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastIntent, setLastIntent] = useState<BeaconIntent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMsg = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    const apiMessages = next
      .filter((m) => m.id !== "greet")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    try {
      const res = await fetch("/api/beacon/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: `b_${Date.now()}`,
          role: "beacon",
          content: data.reply,
          intent: data.intent,
        },
      ]);
      setLastIntent(data.intent);
      if (data.intent === "ready" && data.draft) {
        onReady(data.draft);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `err_${Date.now()}`,
          role: "beacon",
          content:
            "I'm having trouble connecting right now. Please check your connection and try again — your message wasn't lost.",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

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
        {messages.map((m) =>
          m.role === "beacon" ? (
            <BeaconBubble key={m.id} msg={m} />
          ) : (
            <UserBubble key={m.id} content={m.content} />
          )
        )}
        {busy && <TypingBubble />}
      </div>

      {filed ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          Report filed — thanks for helping keep the city running.
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
            Describe your issue to Beacon
          </label>
          <textarea
            id="beacon-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              lastIntent === "emergency"
                ? "If this is an emergency, call 911 first…"
                : "Describe what's wrong and where…"
            }
            className="field-input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
            disabled={busy}
          />
          <button
            type="submit"
            className="btn-accent h-11 w-11 shrink-0 !p-0"
            disabled={busy || !input.trim()}
            aria-label="Send message to Beacon"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

function BeaconBubble({ msg }: { msg: ChatMsg }) {
  const emergency = msg.intent === "emergency";
  const spam = msg.intent === "spam";
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-900">
        <LogoMark className="h-5 w-5" />
      </span>
      <div className="min-w-0 max-w-[85%]">
        <div
          className={cx(
            "rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed",
            emergency
              ? "bg-red-50 text-red-900 ring-1 ring-red-200"
              : spam
                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
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
          <p className="whitespace-pre-wrap">{msg.content}</p>
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

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-900 px-3.5 py-2.5 text-sm leading-relaxed text-white">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="true">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-900">
        <LogoMark className="h-5 w-5" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-navy-50 px-4 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

/** A small inline hint about how Beacon handles special cases. */
export function BeaconCapabilities() {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-navy-50/70 px-3 py-2 text-xs text-ink-soft">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
      <span>
        Beacon redirects emergencies to 911, asks follow-ups when details are
        thin, and won&apos;t file spam. Your key is used server-side only.
      </span>
    </div>
  );
}
