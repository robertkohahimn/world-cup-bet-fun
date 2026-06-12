import { notFound } from "next/navigation";
import { GroupTable } from "@/components/GroupTable";
import { MatchRow } from "@/components/MatchRow";
import { getTeam, groupTable, teamMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = getTeam(Number(id));
  if (!team) notFound();

  const table = groupTable(team.group_name);
  const fixtures = teamMatches(team.id);
  const played = fixtures.filter((m) => m.status === "finished");
  const upcoming = fixtures.filter((m) => m.status !== "finished");
  const standing = table.findIndex((r) => r.teamId === team.id) + 1;
  const row = table.find((r) => r.teamId === team.id);

  return (
    <div>
      <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <span aria-hidden className="text-7xl leading-none">{team.flag}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
            Group {team.group_name} · {team.region}
            {team.fifa_rank ? ` · FIFA #${team.fifa_rank}` : ""}
          </p>
          <h1 className="display mt-1 text-6xl">{team.name}</h1>
        </div>
        {row && (
          <div className="ml-auto flex gap-6 text-right">
            <div>
              <div className="score-num text-3xl leading-none text-pitch">{standing}</div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">in group</div>
            </div>
            <div>
              <div className="score-num text-3xl leading-none">{row.points}</div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">points</div>
            </div>
            <div>
              <div className="score-num text-3xl leading-none">
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">goal diff</div>
            </div>
          </div>
        )}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="display text-3xl">Fixtures</h2>
              <div className="mt-3 divide-y divide-line border border-line bg-card">
                {upcoming.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
          {played.length > 0 && (
            <div>
              <h2 className="display text-3xl">Results</h2>
              <div className="mt-3 divide-y divide-line border border-line bg-card">
                {played.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
        </section>
        <aside>
          <GroupTable group={team.group_name} rows={table} highlightTeamId={team.id} />
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Top two from each group advance to the Round of 32, joined by the eight best
            third-placed sides.
          </p>
        </aside>
      </div>
    </div>
  );
}
