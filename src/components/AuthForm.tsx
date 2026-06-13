"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/lib/actions/auth";

const inputClass =
  "w-full border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/25";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Display name
          </span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={40}
            placeholder="El Tri Fan"
            className={inputClass}
            autoComplete="name"
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className={inputClass}
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          className={inputClass}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>

      {state.error && (
        <p className="border border-signal/40 bg-signal-tint px-3 py-2 text-sm text-signal" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="display w-full bg-pitch px-4 py-3 text-lg tracking-wide text-paper transition-colors hover:bg-pitch-deep disabled:opacity-60"
      >
        {pending ? "One moment…" : mode === "signup" ? "Join the tournament" : "Back to the pitch"}
      </button>

      <p className="pt-1 text-sm text-ink-soft">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-pitch underline underline-offset-2">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-pitch underline underline-offset-2">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
