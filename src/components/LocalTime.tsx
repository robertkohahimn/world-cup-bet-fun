"use client";

import { useEffect, useState } from "react";

const FMT: Record<string, Intl.DateTimeFormatOptions> = {
  time: { hour: "numeric", minute: "2-digit" },
  datetime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  date: { weekday: "short", month: "short", day: "numeric" },
};

/** Renders an ISO timestamp in the viewer's timezone (UTC until hydration). */
export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: keyof typeof FMT }) {
  const [text, setText] = useState(() =>
    new Intl.DateTimeFormat("en-US", { ...FMT[mode], timeZone: "UTC" }).format(new Date(iso)) +
    (mode === "time" || mode === "datetime" ? " UTC" : ""),
  );
  useEffect(() => {
    setText(new Intl.DateTimeFormat("en-US", FMT[mode]).format(new Date(iso)));
  }, [iso, mode]);
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
