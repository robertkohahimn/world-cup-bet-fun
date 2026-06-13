"use client";

import { useActionState, useState } from "react";
import { setLine, type ActionState } from "@/lib/actions/betting";

export interface LineableMatch {
  id: number;
  label: string;
  homeId: number;
  homeName: string;
  awayId: number;
  awayName: string;
  kickoff: string;
  hasLine: boolean;
}

const selectClass =
  "w-full border border-line bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/25";

/** Room-admin tool: pick a match, the favored team, and the goal spread. */
export function SetLineForm({ roomId, matches }: { roomId: number; matches: LineableMatch[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setLine, {});
  const [matchId, setMatchId] = useState(matches[0]?.id ?? 0);
  const selected = matches.find((m) => m.id === matchId);

  if (matches.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No matches are open for lines right now — check back after the next results come in.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="roomId" value={roomId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Match
          </span>
          <select
            name="matchId"
            value={matchId}
            onChange={(e) => setMatchId(Number(e.target.value))}
            className={selectClass}
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.hasLine ? " (line set)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Favored team
          </span>
          <select name="teamId" key={matchId} className={selectClass}>
            {selected && (
              <>
                <option value={selected.homeId}>{selected.homeName}</option>
                <option value={selected.awayId}>{selected.awayName}</option>
              </>
            )}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Spread
          </span>
          <input
            type="number"
            name="spread"
            min={0}
            max={10}
            step={0.5}
            defaultValue={1}
            required
            className={`${selectClass} w-24`}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="display self-end bg-pitch px-5 py-2 text-base tracking-wide text-paper transition-colors hover:bg-pitch-deep disabled:opacity-60"
        >
          {pending ? "Setting…" : "Set line"}
        </button>
      </div>
      <p className="text-[11px] text-ink-faint">
        Changing an existing line clears everyone&apos;s picks for that match — members re-pick
        until 6h before kickoff.
      </p>
      {state.error && (
        <p className="text-xs font-semibold text-signal" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-xs font-semibold text-pitch">Line saved.</p>}
    </form>
  );
}
