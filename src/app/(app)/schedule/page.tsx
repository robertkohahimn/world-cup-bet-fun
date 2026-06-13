import Link from "next/link";
import { MatchRow } from "@/components/MatchRow";
import { listMatches } from "@/lib/queries";
import { STAGE_NAMES, type MatchRow as Match } from "@/lib/types";

export const metadata = { title: "Schedule — WCBet.fun" };
export const dynamic = "force-dynamic";

const STAGE_FILTERS: { key: string; label: string; stages: Match["stage"][] }[] = [
  { key: "all", label: "All 104", stages: [] },
  { key: "group", label: "Groups", stages: ["group"] },
  { key: "r32", label: "Rd of 32", stages: ["r32"] },
  { key: "r16", label: "Rd of 16", stages: ["r16"] },
  { key: "qf", label: "Quarters", stages: ["qf"] },
  { key: "finals", label: "Semis & Final", stages: ["sf", "third", "final"] },
];

const GROUPS = "ABCDEFGHIJKL".split("");

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; group?: string }>;
}) {
  const { stage = "all", group } = await searchParams;
  const filter = STAGE_FILTERS.find((f) => f.key === stage) ?? STAGE_FILTERS[0];

  let matches = listMatches();
  if (filter.stages.length > 0) {
    matches = matches.filter((m) => filter.stages.includes(m.stage));
  }
  if (group) {
    matches = matches.filter((m) => m.group_name === group);
  }

  const byDate = new Map<string, typeof matches>();
  for (const m of matches) {
    const day = m.kickoff_utc.slice(0, 10);
    byDate.set(day, [...(byDate.get(day) ?? []), m]);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
        June 11 — July 19 · 16 stadiums · 3 nations
      </p>
      <h1 className="display mt-1 text-5xl">Schedule</h1>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {STAGE_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/schedule" : `/schedule?stage=${f.key}`}
            className={`px-3 py-1.5 text-sm font-bold ${
              filter.key === f.key && !group
                ? "bg-ink text-paper"
                : "bg-card text-ink-soft border border-line hover:border-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-2 hidden h-5 w-px bg-line sm:block" />
        {GROUPS.map((g) => (
          <Link
            key={g}
            href={`/schedule?group=${g}`}
            className={`px-2.5 py-1.5 text-sm font-bold ${
              group === g
                ? "bg-pitch text-paper"
                : "bg-card text-ink-soft border border-line hover:border-pitch"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {[...byDate.entries()].map(([day, dayMatches]) => (
          <section key={day}>
            <h2 className="display sticky top-0 z-10 -mx-1 bg-paper px-1 py-2 text-2xl">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(day + "T12:00:00Z"))}
            </h2>
            <div className="mt-2 divide-y divide-line border border-line bg-card">
              {dayMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </section>
        ))}
        {matches.length === 0 && (
          <p className="border border-line bg-card p-6 text-sm text-ink-soft">
            Nothing matches that filter.
          </p>
        )}
      </div>
    </div>
  );
}
