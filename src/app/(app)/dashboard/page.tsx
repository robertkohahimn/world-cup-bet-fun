import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { LocalTime } from "@/components/LocalTime";
import { MatchRow } from "@/components/MatchRow";
import {
  pendingPicks,
  recentResults,
  upcomingMatches,
  userAnalytics,
  userRooms,
} from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { betDeadline } from "@/lib/types";

export const metadata = { title: "Dashboard — WCBet.fun" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const rooms = userRooms(user.id);
  const pending = pendingPicks(user.id);
  const upcoming = upcomingMatches(6);
  const results = recentResults(4);
  const stats = userAnalytics(user.id);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
            Matchday programme
          </p>
          <h1 className="display mt-1 text-5xl">Hello, {user.name}</h1>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="score-num text-3xl leading-none text-pitch">
              {stats.totalPoints > 0 ? `+${stats.totalPoints}` : stats.totalPoints}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-ink-faint">total points</div>
          </div>
          <div>
            <div className="score-num text-3xl leading-none">
              {stats.wins}–{stats.losses}
              {stats.pushes > 0 ? `–${stats.pushes}` : ""}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-ink-faint">W–L{stats.pushes > 0 ? "–P" : ""}</div>
          </div>
        </div>
      </header>

      {pending.length > 0 && (
        <section className="rise border-2 border-signal bg-signal-tint p-4 sm:p-5">
          <h2 className="display text-2xl text-signal">Picks needed</h2>
          <ul className="mt-3 space-y-2">
            {pending.slice(0, 5).map((p) => (
              <li key={p.lineId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>
                    {p.match.home?.name ?? p.match.home_label} v {p.match.away?.name ?? p.match.away_label}
                  </strong>{" "}
                  <span className="text-ink-soft">
                    — {p.favored.name} +{p.spread} in <em>{p.roomName}</em>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Countdown deadlineIso={betDeadline(p.match.kickoff_utc).toISOString()} />
                  <Link
                    href={`/rooms/${p.roomCode}`}
                    className="bg-signal px-3 py-1 text-xs font-bold uppercase tracking-wider text-paper hover:opacity-90"
                  >
                    Pick now
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">Up next</h2>
            <Link href="/schedule" className="text-sm font-semibold text-pitch underline underline-offset-2">
              Full schedule
            </Link>
          </div>
          <div className="mt-4 divide-y divide-line border border-line bg-card">
            {upcoming.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
            {upcoming.length === 0 && (
              <p className="p-6 text-sm text-ink-soft">The tournament is over — see you in 2030.</p>
            )}
          </div>

          {results.length > 0 && (
            <>
              <h2 className="display mt-10 text-3xl">Latest results</h2>
              <div className="mt-4 divide-y divide-line border border-line bg-card">
                {results.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">My rooms</h2>
            <Link href="/rooms" className="text-sm font-semibold text-pitch underline underline-offset-2">
              All rooms
            </Link>
          </div>
          {rooms.length === 0 ? (
            <div className="ticket p-5 pl-7">
              <p className="text-sm leading-relaxed text-ink-soft">
                You&apos;re not in any room yet. Create one and send the code to your group chat —
                that&apos;s the whole onboarding.
              </p>
              <Link
                href="/rooms"
                className="display mt-4 inline-block bg-pitch px-4 py-2 text-base tracking-wide text-paper hover:bg-pitch-deep"
              >
                Open a room
              </Link>
            </div>
          ) : (
            rooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.code}`}
                className="ticket block p-4 pl-7 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="display text-xl">{room.name}</span>
                  <span className="font-mono text-xs tracking-[0.2em] text-ink-faint">{room.code}</span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-ink-soft">
                  <span>
                    <span className="score-num text-lg text-pitch">{room.myRank}</span>
                    <span className="text-ink-faint">/{room.memberCount}</span> place
                  </span>
                  <span>
                    <span className={`score-num text-lg ${room.myPoints < 0 ? "text-signal" : "text-ink"}`}>
                      {room.myPoints > 0 ? `+${room.myPoints}` : room.myPoints}
                    </span>{" "}
                    pts
                  </span>
                  {room.isAdmin && (
                    <span className="ml-auto bg-pitch-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pitch-deep">
                      admin
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}

          {stats.history.length > 0 && (
            <div className="border border-line bg-card p-4">
              <h3 className="display text-xl">Last settled</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {stats.history.slice(-4).reverse().map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate text-ink-soft">
                      {h.homeName} {h.homeGoals}–{h.awayGoals} {h.awayName}
                    </span>
                    <span
                      className={`score-num text-base ${
                        h.delta > 0 ? "text-pitch" : h.delta < 0 ? "text-signal" : "text-ink-faint"
                      }`}
                    >
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/analytics"
                className="mt-3 inline-block text-sm font-semibold text-pitch underline underline-offset-2"
              >
                Full analytics
              </Link>
            </div>
          )}

          <p className="text-xs leading-relaxed text-ink-faint">
            Next deadline closes 6 hours before kickoff
            {upcoming[0] && (
              <>
                {" "}
                — first up <LocalTime iso={betDeadline(upcoming[0].kickoff_utc).toISOString()} />
              </>
            )}
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
