"use client";

import { useEffect, useState } from "react";

function label(deadlineMs: number, nowMs: number): string {
  const diff = deadlineMs - nowMs;
  if (diff <= 0) return "Locked";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `closes in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `closes in ${hours}h ${mins % 60}m`;
  return `closes in ${Math.floor(hours / 24)}d`;
}

/** Live countdown to a betting deadline. */
export function Countdown({ deadlineIso }: { deadlineIso: string }) {
  const deadlineMs = new Date(deadlineIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const closed = deadlineMs <= now;
  return (
    <span
      suppressHydrationWarning
      className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        closed ? "bg-ink/10 text-ink-soft" : "bg-signal-tint text-signal"
      }`}
    >
      {label(deadlineMs, now)}
    </span>
  );
}
