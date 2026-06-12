"use client";

import { useActionState } from "react";
import { recordResult, type ActionState } from "@/lib/actions/betting";

const numClass =
  "w-14 border border-line bg-card px-2 py-1.5 text-center score-num text-lg focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/25";

/** Platform-admin inline score entry. Re-submitting corrects and re-settles. */
export function RecordResultForm({
  matchId,
  homeGoals,
  awayGoals,
}: {
  matchId: number;
  homeGoals: number | null;
  awayGoals: number | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordResult, {});
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="number"
        name="homeGoals"
        min={0}
        max={99}
        required
        defaultValue={homeGoals ?? ""}
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
        defaultValue={awayGoals ?? ""}
        className={numClass}
        aria-label="Away goals"
      />
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
