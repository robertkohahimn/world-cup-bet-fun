"use client";

import { useActionState } from "react";
import { createRoom, joinRoom, type RoomFormState } from "@/lib/actions/rooms";

const inputClass =
  "w-full border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/25";

export function CreateRoomForm() {
  const [state, formAction, pending] = useActionState<RoomFormState, FormData>(createRoom, {});
  return (
    <form action={formAction} className="space-y-3">
      <input
        name="name"
        required
        minLength={2}
        maxLength={40}
        placeholder="e.g. Office Cup Champs"
        className={inputClass}
        aria-label="Room name"
      />
      {state.error && <p className="text-xs font-semibold text-signal" role="alert">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="display w-full bg-pitch px-4 py-2.5 text-base tracking-wide text-paper transition-colors hover:bg-pitch-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create room"}
      </button>
    </form>
  );
}

export function JoinRoomForm() {
  const [state, formAction, pending] = useActionState<RoomFormState, FormData>(joinRoom, {});
  return (
    <form action={formAction} className="space-y-3">
      <input
        name="code"
        required
        minLength={6}
        maxLength={6}
        placeholder="6-letter code, e.g. K7MWPA"
        className={`${inputClass} font-mono uppercase tracking-[0.2em]`}
        aria-label="Room code"
        autoCapitalize="characters"
        autoComplete="off"
      />
      {state.error && <p className="text-xs font-semibold text-signal" role="alert">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="display w-full border-2 border-pitch bg-card px-4 py-2.5 text-base tracking-wide text-pitch transition-colors hover:bg-pitch-tint disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join with code"}
      </button>
    </form>
  );
}
