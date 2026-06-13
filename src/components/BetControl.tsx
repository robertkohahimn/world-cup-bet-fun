"use client";

import { useActionState } from "react";
import { placeBet, type ActionState } from "@/lib/actions/betting";

interface TeamInfo {
  name: string;
  flag: string;
}

/**
 * Pick-a-side control. "cover" backs the favored team to beat the spread;
 * "against" backs the other side. Re-submitting switches your pick.
 */
export function BetControl({
  lineId,
  favored,
  other,
  spread,
  mySide,
}: {
  lineId: number;
  favored: TeamInfo;
  other: TeamInfo;
  spread: number;
  mySide: "cover" | "against" | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(placeBet, {});

  const option = (side: "cover" | "against", team: TeamInfo, blurb: string) => {
    const active = mySide === side;
    return (
      <button
        type="submit"
        name="side"
        value={side}
        disabled={pending}
        aria-pressed={active}
        className={`flex-1 border px-3 py-2.5 text-left transition-all disabled:opacity-60 ${
          active
            ? "border-pitch bg-pitch text-paper shadow-[3px_3px_0_0] shadow-pitch-deep"
            : "border-line bg-card hover:border-pitch hover:bg-pitch-tint/50"
        }`}
      >
        <span className="block text-sm font-bold">
          <span aria-hidden>{team.flag}</span> {team.name}
        </span>
        <span className={`block text-[11px] ${active ? "text-paper/80" : "text-ink-faint"}`}>
          {blurb}
          {active ? " · your pick" : ""}
        </span>
      </button>
    );
  };

  return (
    <form action={formAction}>
      <input type="hidden" name="lineId" value={lineId} />
      <div className="flex gap-2">
        {option("cover", favored, `wins by more than ${spread}`)}
        {option("against", other, `or ${favored.name} fails to cover`)}
      </div>
      {state.error && (
        <p className="mt-2 text-xs font-semibold text-signal" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
