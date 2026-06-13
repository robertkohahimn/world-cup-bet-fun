"use client";

import { useActionState, useState } from "react";
import { recordResult, type ActionState } from "@/lib/actions/betting";

const numClass =
  "w-14 border border-line bg-card px-2 py-1.5 text-center score-num text-lg focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/25";

export interface KnockoutTeams {
  homeId: number;
  homeName: string;
  awayId: number;
  awayName: string;
  currentWinnerId: number | null;
}

/**
 * Platform-admin inline score entry. Re-submitting corrects and re-settles.
 * For knockout matches, a level score reveals a penalty-shootout winner picker
 * so the bracket can advance.
 */
export function RecordResultForm({
  matchId,
  homeGoals,
  awayGoals,
  knockout,
}: {
  matchId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  knockout?: KnockoutTeams;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordResult, {});
  const [home, setHome] = useState(homeGoals ?? "");
  const [away, setAway] = useState(awayGoals ?? "");

  const level = home !== "" && away !== "" && Number(home) === Number(away);
  const needsWinner = Boolean(knockout) && level;
  // Only trust the stored winner as the default when the stored score was
  // itself a draw (a real shootout). If a decisive result is being corrected
  // to a draw, force a fresh pick rather than carrying over the old winner.
  const storedLevel = homeGoals != null && awayGoals != null && homeGoals === awayGoals;
  const defaultWinner = storedLevel ? knockout?.currentWinnerId ?? "" : "";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="number"
        name="homeGoals"
        min={0}
        max={99}
        required
        value={home}
        onChange={(e) => setHome(e.target.value)}
        className={numClass}
        aria-label="Home goals"
      />
      <span className="text-ink-faint">–</span>
      <input
        type="number"
        name="awayGoals"
        min={0}
        max={99}
        required
        value={away}
        onChange={(e) => setAway(e.target.value)}
        className={numClass}
        aria-label="Away goals"
      />
      {needsWinner && knockout && (
        <select
          name="winnerTeamId"
          required
          defaultValue={defaultWinner}
          className="border border-line bg-card px-2 py-1.5 text-xs focus:outline-none focus:border-pitch"
          aria-label="Penalty shootout winner"
        >
          <option value="" disabled>
            Pens won by…
          </option>
          <option value={knockout.homeId}>{knockout.homeName} (pens)</option>
          <option value={knockout.awayId}>{knockout.awayName} (pens)</option>
        </select>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-pitch px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:bg-pitch-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save & settle"}
      </button>
      {state.error && <span className="text-xs font-semibold text-signal" role="alert">{state.error}</span>}
      {state.ok && <span className="text-xs font-semibold text-pitch">Settled ✓</span>}
    </form>
  );
}
