import Link from "next/link";
import type { GroupStanding } from "@/lib/queries";

export function GroupTable({
  group,
  rows,
  highlightTeamId,
}: {
  group: string;
  rows: GroupStanding[];
  highlightTeamId?: number;
}) {
  return (
    <div className="border border-line bg-card">
      <div className="display flex items-baseline justify-between border-b-2 border-ink px-3 py-2 text-lg">
        <span>Group {group}</span>
        <span className="text-xs font-semibold normal-case tracking-wide text-ink-faint">
          top 2 advance
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-ink-faint">
            <th className="px-3 py-1.5 text-left font-semibold">Team</th>
            <th className="w-8 py-1.5 text-center font-semibold">P</th>
            <th className="w-8 py-1.5 text-center font-semibold">W</th>
            <th className="w-8 py-1.5 text-center font-semibold">D</th>
            <th className="w-8 py-1.5 text-center font-semibold">L</th>
            <th className="w-10 py-1.5 text-center font-semibold">GD</th>
            <th className="w-10 px-2 py-1.5 text-center font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.teamId}
              className={`border-t border-line ${i < 2 ? "bg-pitch-tint/40" : ""} ${
                r.teamId === highlightTeamId ? "outline outline-2 -outline-offset-2 outline-pitch" : ""
              }`}
            >
              <td className="px-3 py-1.5">
                <Link href={`/teams/${r.teamId}`} className="font-semibold hover:text-pitch hover:underline underline-offset-2">
                  <span aria-hidden>{r.team.flag}</span> {r.team.name}
                </Link>
              </td>
              <td className="text-center text-ink-soft">{r.played}</td>
              <td className="text-center text-ink-soft">{r.won}</td>
              <td className="text-center text-ink-soft">{r.drawn}</td>
              <td className="text-center text-ink-soft">{r.lost}</td>
              <td className="text-center text-ink-soft">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="score-num px-2 text-center text-base">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
