import { redirect } from "next/navigation";
import { LocalTime } from "@/components/LocalTime";
import { RecordResultForm, type KnockoutTeams } from "@/components/RecordResultForm";
import { matchesAwaitingResult, recentResults, type MatchWithTeams } from "@/lib/queries";
import { requireUser } from "@/lib/session";

/** Penalty-winner picker data — only for knockout matches with both teams set. */
function knockoutTeams(m: MatchWithTeams): KnockoutTeams | undefined {
  if (m.stage === "group" || !m.home || !m.away) return undefined;
  return {
    homeId: m.home.id,
    homeName: m.home.name,
    awayId: m.away.id,
    awayName: m.away.name,
    currentWinnerId: m.winner_team_id,
  };
}

export const metadata = { title: "Results desk — WCBet.fun" };
export const dynamic = "force-dynamic";

export default async function ResultsDeskPage() {
  const user = await requireUser();
  if (!user.is_admin) redirect("/dashboard");

  const awaiting = matchesAwaitingResult();
  const recent = recentResults(10);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">Platform admin only</p>
      <h1 className="display mt-1 text-5xl">Results desk</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Enter final scores here. Saving a score settles every room that posted a line on the match
        — winners collect, losers pay, missed picks auto-lose. Re-saving a corrected score
        recomputes everything safely.
      </p>

      <section className="mt-8">
        <h2 className="display text-3xl">Awaiting final score</h2>
        {awaiting.length === 0 ? (
          <p className="mt-3 border border-line bg-card p-6 text-sm text-ink-soft">
            All caught up — no kicked-off matches without a score.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line bg-card">
            {awaiting.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-semibold">
                    {m.home?.flag} {m.home?.name ?? m.home_label} v {m.away?.name ?? m.away_label} {m.away?.flag}
                  </div>
                  <div className="text-xs text-ink-faint">
                    M{m.id} · <LocalTime iso={m.kickoff_utc} /> · {m.venue}, {m.city}
                  </div>
                </div>
                <RecordResultForm
                  matchId={m.id}
                  homeGoals={m.home_goals}
                  awayGoals={m.away_goals}
                  knockout={knockoutTeams(m)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">Recently recorded</h2>
        <ul className="mt-3 divide-y divide-line border border-line bg-card">
          {recent.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="font-semibold">
                {m.home?.flag} {m.home?.name} <span className="score-num text-xl">{m.home_goals}–{m.away_goals}</span> {m.away?.name} {m.away?.flag}
              </div>
              <RecordResultForm
                matchId={m.id}
                homeGoals={m.home_goals}
                awayGoals={m.away_goals}
                knockout={knockoutTeams(m)}
              />
            </li>
          ))}
          {recent.length === 0 && (
            <li className="px-4 py-6 text-sm text-ink-soft">No results recorded yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
