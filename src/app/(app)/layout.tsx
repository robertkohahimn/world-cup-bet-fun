import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-[11px] uppercase tracking-wider text-ink-faint sm:px-6">
        WCBet.fun — friendly wagers only. No money, just pride.
      </footer>
    </div>
  );
}
