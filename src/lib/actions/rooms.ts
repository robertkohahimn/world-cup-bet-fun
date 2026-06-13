"use server";

import { redirect } from "next/navigation";
import { getDb } from "../db";
import { requireUser } from "../session";
import type { RoomRow } from "../types";

export interface RoomFormState {
  error?: string;
}

/** Unambiguous alphabet — no 0/O, 1/I/L. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createRoom(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { error: "Room name should be 2–40 characters." };
  }

  const db = getDb();
  let code = generateCode();
  while (db.prepare("SELECT id FROM rooms WHERE code = ?").get(code)) {
    code = generateCode();
  }

  db.transaction(() => {
    const res = db
      .prepare("INSERT INTO rooms (code, name, admin_id) VALUES (?, ?, ?)")
      .run(code, name, user.id);
    db.prepare("INSERT INTO room_members (room_id, user_id) VALUES (?, ?)").run(
      Number(res.lastInsertRowid),
      user.id,
    );
  })();

  redirect(`/rooms/${code}`);
}

export async function joinRoom(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return { error: "Room codes are 6 letters/numbers." };
  }

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as RoomRow | undefined;
  if (!room) return { error: "No room with that code. Double-check with your friend." };

  const member = db
    .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?")
    .get(room.id, user.id);
  if (!member) {
    db.prepare("INSERT INTO room_members (room_id, user_id) VALUES (?, ?)").run(room.id, user.id);
  }

  redirect(`/rooms/${room.code}`);
}
