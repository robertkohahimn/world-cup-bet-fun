import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { login } from "@/lib/actions/auth";
import { getUser } from "@/lib/session";

export const metadata = { title: "Log in — WCBet.fun" };

export default async function LoginPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="ticket rise w-full max-w-md p-8 sm:p-10">
        <Link href="/" className="display text-2xl text-pitch">
          WCBet<span className="text-signal">.fun</span>
        </Link>
        <h1 className="display mt-6 text-4xl">Welcome back</h1>
        <p className="mt-2 mb-8 text-sm text-ink-soft">
          The tournament is underway. Your room needs you.
        </p>
        <AuthForm mode="login" action={login} />
      </div>
    </main>
  );
}
