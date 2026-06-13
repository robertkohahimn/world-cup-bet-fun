import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";

const steps = [
  {
    n: "01",
    title: "Open a room",
    body: "Create a room and share its 6-letter code. Friends join in seconds — no invites, no setup.",
  },
  {
    n: "02",
    title: "Set the line",
    body: "The room admin posts a spread for any match. Mexico +1.5 means Mexico must win by two or more.",
  },
  {
    n: "03",
    title: "Pick a side",
    body: "Everyone picks before the 6-hour lockout. Miss the deadline and it counts as a loss — no freeloading.",
  },
  {
    n: "04",
    title: "Settle up",
    body: "Winners collect a point per loser. Losers drop one. The table doesn't lie — all tournament long.",
  },
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <header className="flex items-center justify-between">
          <span className="display text-2xl text-pitch">
            WCBet<span className="text-signal">.fun</span>
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-bold text-ink-soft hover:text-pitch"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="display bg-pitch px-4 py-2 text-base tracking-wide text-paper hover:bg-pitch-deep"
            >
              Sign up
            </Link>
          </nav>
        </header>

        <section className="mt-16 sm:mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
            Official unofficial matchday programme · June 11 – July 19, 2026
          </p>
          <h1 className="display mt-4 max-w-3xl text-[clamp(3rem,9vw,6.5rem)]">
            Beat the spread.
            <br />
            <span className="text-pitch">Bury your friends.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            104 matches across North America. One room code between you and your group.
            Points-only spread betting for the World Cup — winner takes the bragging rights.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="display bg-signal px-7 py-3.5 text-xl tracking-wide text-paper shadow-[4px_4px_0_0] shadow-ink transition-transform hover:-translate-y-0.5"
            >
              Get your ticket
            </Link>
            <span className="text-sm font-semibold text-ink-faint">Free forever. Zero dollars at stake.</span>
          </div>
        </section>

        <section className="perf-divider mt-20 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <article key={s.n} className={`rise rise-${i} bg-card p-6`}>
              <span className="score-num text-4xl text-pitch/30">{s.n}</span>
              <h2 className="display mt-3 text-2xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 border-2 border-ink bg-card p-6 sm:p-8">
          <h2 className="display text-3xl">How a settled match pays out</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Four members. Line: <strong className="text-ink">Mexico +1</strong>. One backs Mexico,
            three back South Africa. Final score 2–0 — Mexico covers. The lone winner collects{" "}
            <strong className="text-pitch">+3</strong> (one per loser); each loser drops{" "}
            <strong className="text-signal">−1</strong>. Win by exactly one and it&apos;s a push —
            nobody wins. Skip your pick and you lose anyway.
          </p>
        </section>
      </div>
    </main>
  );
}
