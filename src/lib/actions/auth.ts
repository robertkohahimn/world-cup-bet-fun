"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { createSession, destroySession } from "../session";
import type { UserRow } from "../types";

export interface AuthState {
  error?: string;
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Pick a name with at least 2 characters." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  if (password.length < 8) return { error: "Password needs at least 8 characters." };

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return { error: "An account with that email already exists." };

  // First account on the instance becomes the platform admin (records results).
  const isFirst = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c === 0;
  const hash = bcrypt.hashSync(password, 10);
  const res = db
    .prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)")
    .run(name, email, hash, isFirst ? 1 : 0);

  await createSession(Number(res.lastInsertRowid));
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return { error: "Wrong email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
