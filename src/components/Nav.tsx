import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import type { UserRow } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/rooms", label: "Rooms" },
  { href: "/analytics", label: "Analytics" },
];

export function Nav({ user }: { user: UserRow }) {
  return (
    <header className="border-b-2 border-ink bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="display text-xl text-pitch">
          WCBet<span className="text-signal">.fun</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm font-semibold">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-pitch-tint hover:text-pitch-deep"
            >
              {l.label}
            </Link>
          ))}
          {user.is_admin === 1 && (
            <Link
              href="/admin/results"
              className="whitespace-nowrap px-2.5 py-1.5 text-signal transition-colors hover:bg-signal-tint"
            >
              Results desk
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-ink sm:block">{user.name}</span>
          <form action={logout}>
            <button className="text-xs font-bold uppercase tracking-wider text-ink-faint underline-offset-2 hover:text-signal hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
