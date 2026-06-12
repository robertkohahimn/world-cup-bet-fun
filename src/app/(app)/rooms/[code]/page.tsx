import Link from "next/link";
import { notFound } from "next/navigation";
import { BetControl } from "@/components/BetControl";
import { Countdown } from "@/components/Countdown";
import { LocalTime } from "@/components/LocalTime";
import { SetLineForm, type LineableMatch } from "@/components/SetLineForm";
import { joinRoom } from "@/lib/actions/rooms";
import {
  getRoomByCode,
  isRoomMember,
  lineSettlements,
  lineableMatches,
  roomLeaderboard,
  roomLines,
  type LineDetail,
} from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { betDeadline, deadlinePassed } from "@/lib/types";

export const dynamic = "force-dynamic";

function LineTicket({ detail, userId }: { detail: LineDetail; userId: number }) {
  const { line, match, favored, other, myBet, picks, settled } = detail;
  const locked = deadlinePassed(match.kickoff_utc);
  const finished = match.status === "finished";
  const settlements = settled ? lineSettlements(line.id) : [];

  return (
    <article className="ticket p-5 pl-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-soft">
          {match.home?.name ?? match.home_label}{" "}
          {finished && (
            <span className="score-num text-xl text-ink">
              {match.home_goals}–{match.away_goals}
            </span>
          )}{" "}
          {!finished && <span className="text-ink-faint">v</span>} {match.away?.name ?? match.away_label}
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-ink-faint">
          <LocalTime iso={match.kickoff_utc} /> · {match.venue}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="display text-3xl text-pitch">
          {favored.flag} {favored.name} +{line.spread}
        </span>
        {!finished && <Countdown deadlineIso={betDeadline(match.kickoff_utc).toISOString()} />}
        {finished && !settled && (
          <span className="bg-ink/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            settling…
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        {Number.isInteger(line.spread)
          ? `${favored.name} must win by more than ${line.spread} — exactly ${line.spread} is a push, nobody wins.`
          : `${favored.name} must win by ${line.spread + 0.5} or more — half spreads never push.`}
      </p>

      <div className="perf-divider mt-4 pt-4">
        {!locked ? (
          <BetControl
            lineId={line.id}
            favored={{ name: favored.name, flag: favored.flag }}
            other={{ name: other.name, flag: other.flag }}
            spread={line.spread}
            mySide={myBet?.side ?? null}
          />
        ) : settled ? (
          <ul className="space-y-1 text-sm">
            {settlements.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2">
                <span className={s.userId === userId ? "font-bold" : ""}>
                  {s.name}
                  {s.userId === userId ? " (you)" : ""}
                  <span className="ml-2 text-xs text-ink-faint">
                    {picks.find((p) => p.userId === s.userId)
                      ? picks.find((p) => p.userId === s.userId)!.side === "cover"
                        ? `took ${favored.name}`
                        : `took ${other.name}`
                      : "no pick — auto-loss"}
                  </span>
                </span>
                <span
                  className={`score-num text-lg ${
                    s.delta > 0 ? "text-pitch" : s.delta < 0 ? "text-signal" : "text-ink-faint"
                  }`}
                >
                  {s.delta > 0 ? `+${s.delta}` : s.delta}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Picks are in — locked at −6h
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="font-bold">
                  {favored.flag} {favored.name} +{line.spread}
                </span>
                <p className="text-ink-soft">
                  {picks.filter((p) => p.side === "cover").map((p) => p.name).join(", ") || "nobody"}
                </p>
              </div>
              <div>
                <span className="font-bold">
                  {other.flag} {other.name}
                </span>
                <p className="text-ink-soft">
                  {picks.filter((p) => p.side === "against").map((p) => p.name).join(", ") || "nobody"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const room = getRoomByCode(code);
  if (!room) notFound();

  if (!isRoomMember(room.id, user.id)) {
    async function joinThis(formData: FormData) {
      "use server";
      await joinRoom({}, formData);
    }
    return (
      <div className="mx-auto max-w-md">
        <div className="ticket p-8 pl-10">
          <h1 className="display text-4xl">{room.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            You&apos;ve been invited to a betting room. Join to see the lines, the leaderboard,
            and who&apos;s talking the most trash.
          </p>
          <form action={joinThis} className="mt-6">
            <input type="hidden" name="code" value={room.code} />
            <button className="display w-full bg-pitch px-4 py-3 text-lg tracking-wide text-paper hover:bg-pitch-deep">
              Join {room.name}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const board = roomLeaderboard(room.id);
  const lines = roomLines(room.id, user.id);
  const open = lines.filter((l) => !l.settled && l.match.status !== "finished");
  const past = lines.filter((l) => l.settled || l.match.status === "finished").reverse();
  const isAdmin = room.admin_id === user.id;
  const adminName = board.find((m) => m.isAdmin)?.name;

  const lineable: LineableMatch[] = isAdmin
    ? lineableMatches().map((m) => ({
        id: m.id,
        label: `${m.home!.name} v ${m.away!.name} — ${m.kickoff_utc.slice(5, 10).replace("-", "/")}`,
        homeId: m.home!.id,
        homeName: m.home!.name,
        awayId: m.away!.id,
        awayName: m.away!.name,
        kickoff: m.kickoff_utc,
        hasLine: lines.some((l) => l.match.id === m.id),
      }))
    : [];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
            Room · run by {adminName}
          </p>
          <h1 className="display mt-1 text-5xl">{room.name}</h1>
        </div>
        <div className="border-2 border-dashed border-ink bg-card px-4 py-2 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            invite code
          </div>
          <div className="font-mono text-2xl font-bold tracking-[0.3em] text-pitch">{room.code}</div>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-8">
          {isAdmin && (
            <div className="border-2 border-ink bg-card p-5">
              <h2 className="display text-2xl">Bookmaker&apos;s desk</h2>
              <p className="mb-4 mt-1 text-xs text-ink-soft">
                Post a spread for any upcoming match. Members can bet until 6 hours before kickoff.
              </p>
              <SetLineForm roomId={room.id} matches={lineable} />
            </div>
          )}

          <div>
            <h2 className="display text-3xl">Open lines</h2>
            {open.length === 0 ? (
              <p className="mt-3 border border-line bg-card p-6 text-sm text-ink-soft">
                {isAdmin
                  ? "No open lines. Post one above to get the room betting."
                  : `No open lines right now — nudge ${adminName} to post the next spread.`}
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {open.map((l) => (
                  <LineTicket key={l.line.id} detail={l} userId={user.id} />
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="display text-3xl">Settled</h2>
              <div className="mt-3 space-y-4">
                {past.map((l) => (
                  <LineTicket key={l.line.id} detail={l} userId={user.id} />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="border border-line bg-card">
            <h2 className="display border-b-2 border-ink px-4 py-2.5 text-2xl">Table</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="w-8 py-1.5 text-center font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Member</th>
                  <th className="w-16 py-1.5 text-center font-semibold">W–L–P</th>
                  <th className="w-12 px-2 py-1.5 text-right font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {board.map((m, i) => (
                  <tr
                    key={m.userId}
                    className={`border-t border-line ${m.userId === user.id ? "bg-pitch-tint/50" : ""}`}
                  >
                    <td className="score-num py-2 text-center text-base">
                      {i === 0 && m.points > 0 ? "👑" : i + 1}
                    </td>
                    <td className="px-2 py-2 font-semibold">
                      {m.name}
                      {m.isAdmin && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-ink-faint">adm</span>
                      )}
                    </td>
                    <td className="py-2 text-center text-ink-soft">
                      {m.wins}–{m.losses}–{m.pushes}
                    </td>
                    <td
                      className={`score-num px-2 py-2 text-right text-lg ${
                        m.points > 0 ? "text-pitch" : m.points < 0 ? "text-signal" : ""
                      }`}
                    >
                      {m.points > 0 ? `+${m.points}` : m.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-line bg-paper-warm p-4 text-xs leading-relaxed text-ink-soft">
            <h3 className="display text-lg text-ink">House rules</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Bets lock 6 hours before kickoff. You can change your pick any time before that.</li>
              <li>No pick by the deadline counts as a loss.</li>
              <li>Winners earn one point per loser; losers drop one point.</li>
              <li>Win by exactly the spread = push. Bettors break even; no-shows still lose.</li>
              <li>Everyone&apos;s picks stay hidden until the lock.</li>
              <li>Join mid-tournament and you&apos;re only on the hook for future deadlines.</li>
            </ul>
            <p className="mt-3">
              Share the code <strong className="font-mono tracking-widest">{room.code}</strong> or
              this page&apos;s link — <Link href={`/rooms/${room.code}`} className="underline">wcbet.fun/rooms/{room.code}</Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
