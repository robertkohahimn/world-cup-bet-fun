import Link from "next/link";
import { PointsChart } from "@/components/PointsChart";
import { userAnalytics, userRooms } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Analytics — WCBet.fun" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const stats = userAnalytics(user.id);
  const rooms = userRooms(user.id);

  const stat = (value: string, label: string, tone = "") => (
    <div className="border border-line bg-card px-5 py-4">
      <div className={`score-num text-4xl leading-none ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  );

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">Your tournament, audited</p>
      <h1 className="display mt-1 text-5xl">Analytics</h1>

      {stats.history.length === 0 ? (
        <div className="mt-8 max-w-xl border border-line bg-card p-8">
          <h2 className="display text-2xl">Nothing settled yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Your numbers appear here once the first match you bet on gets a final score. Until
            then: <Link href="/rooms" className="font-semibold text-pitch underline underline-offset-2">place some picks</Link>{" "}
            and study the <Link href="/schedule" className="font-semibold text-pitch underline underline-offset-2">schedule</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stat(
              stats.totalPoints > 0 ? `+${stats.totalPoints}` : String(stats.totalPoints),
              "total points",
              stats.totalPoints >= 0 ? "text-pitch" : "text-signal",
            )}
            {stat(`${stats.wins}–${stats.losses}–${stats.pushes}`, "win–loss–push")}
            {stat(
              stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : "—",
              "win rate",
            )}
            {stat(String(stats.history.length), "bets settled")}
            {stat(String(stats.missedDeadlines), "deadlines missed", stats.missedDeadlines > 0 ? "text-signal" : "")}
          </div>

          <section className="mt-10">
            <h2 className="display text-3xl">Points over time</h2>
            <div className="mt-3 border border-line bg-card p-4">
              <PointsChart deltas={stats.history.map((h) => h.delta)} />
            </div>
          </section>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="display text-3xl">By room</h2>
              <ul className="mt-3 divide-y divide-line border border-line bg-card">
                {rooms.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-4 py-3">
                    <Link href={`/rooms/${r.code}`} className="font-semibold hover:text-pitch hover:underline underline-offset-2">
                      {r.name}
                    </Link>
                    <span className="flex items-center gap-4 text-sm text-ink-soft">
                      <span>#{r.myRank} of {r.memberCount}</span>
                      <span className={`score-num text-xl ${r.myPoints > 0 ? "text-pitch" : r.myPoints < 0 ? "text-signal" : ""}`}>
                        {r.myPoints > 0 ? `+${r.myPoints}` : r.myPoints}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="display text-3xl">Bet history</h2>
              <ul className="mt-3 divide-y divide-line border border-line bg-card">
                {[...stats.history].reverse().map((h, i) => (
                  <li key={i} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {h.homeName} {h.homeGoals}–{h.awayGoals} {h.awayName}
                      </span>
                      <span className={`score-num text-xl ${h.delta > 0 ? "text-pitch" : h.delta < 0 ? "text-signal" : "text-ink-faint"}`}>
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-faint">
                      {h.favoredName} +{h.spread} · {h.side === null ? "no pick (auto-loss)" : h.side === "cover" ? `you took ${h.favoredName}` : "you took the other side"} · {h.roomName}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
