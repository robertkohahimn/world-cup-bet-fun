import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import type { UserRow } from "./types";

const COOKIE = "wcbet_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "wcbet-dev-secret-change-me-in-prod",
);

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<UserRow | null> {
  const id = await getUserId();
  if (id === null) return null;
  const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
  return user ?? null;
}

/** For pages/actions that require a logged-in user. Redirects to /login. */
export async function requireUser(): Promise<UserRow> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
