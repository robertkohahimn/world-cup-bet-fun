/**
 * Seeds a demo room so the app has life on first open.
 * Run: npm run seed:demo
 * Log in as demo@wcbet.fun / demo1234 (platform admin if seeded first).
 */
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.ts";
import { evaluateLine, settleRoomMatch, type Participant } from "../src/lib/settle.ts";
import type { LineRow, MatchRow } from "../src/lib/types.ts";

const db = getDb();

if (db.prepare("SELECT 1 FROM users WHERE email = 'demo@wcbet.fun'").get()) {
  console.log("Demo data already present — nothing to do.");
  process.exit(0);
}

const JOINED = "2026-06-10T00:00:00Z"; // before every betting deadline
const hash = bcrypt.hashSync("demo1234", 10);
const noAdminYet = !db.prepare("SELECT 1 FROM users WHERE is_admin = 1").get();

const insertUser = db.prepare(
  "INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)",
);
const demo = Number(insertUser.run("Demo", "demo@wcbet.fun", hash, noAdminYet ? 1 : 0).lastInsertRowid);
const sam = Number(insertUser.run("Sam", "sam@wcbet.fun", hash, 0).lastInsertRowid);
const priya = Number(insertUser.run("Priya", "priya@wcbet.fun", hash, 0).lastInsertRowid);
const leo = Number(insertUser.run("Leo", "leo@wcbet.fun", hash, 0).lastInsertRowid);

const roomId = Number(
  db.prepare("INSERT INTO rooms (code, name, admin_id) VALUES ('CREW26', 'Copa Crew', ?)").run(demo)
    .lastInsertRowid,
);
const addMember = db.prepare(
  "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
);
for (const uid of [demo, sam, priya, leo]) addMember.run(roomId, uid, JOINED);

const teamId = (code: string) =>
  (db.prepare("SELECT id FROM teams WHERE code = ?").get(code) as { id: number }).id;

const addLine = (matchId: number, favored: string, spread: number) =>
  Number(
    db
      .prepare("INSERT INTO lines (room_id, match_id, team_id, spread) VALUES (?, ?, ?, ?)")
      .run(roomId, matchId, teamId(favored), spread).lastInsertRowid,
  );
const addBet = db.prepare("INSERT INTO bets (line_id, user_id, side) VALUES (?, ?, ?)");

// --- Settled history: the two June 11 results ---------------------------
// M1 Mexico 2–0 South Africa, line MEX +1  → covers (margin 2 > 1)
// M2 South Korea 2–1 Czechia, line KOR +1.5 → fails to cover (margin 1 < 1.5)
const settledSeed: { matchId: number; favored: string; spread: number; bets: [number, "cover" | "against"][] }[] = [
  { matchId: 1, favored: "MEX", spread: 1, bets: [[demo, "cover"], [sam, "against"], [priya, "against"]] }, // Leo forgot to pick
  { matchId: 2, favored: "KOR", spread: 1.5, bets: [[demo, "cover"], [sam, "cover"], [priya, "against"], [leo, "against"]] },
];

const insertSettlement = db.prepare(
  "INSERT INTO settlements (line_id, user_id, delta, outcome) VALUES (?, ?, ?, ?)",
);

for (const s of settledSeed) {
  const lineId = addLine(s.matchId, s.favored, s.spread);
  for (const [uid, side] of s.bets) addBet.run(lineId, uid, side);

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(s.matchId) as MatchRow;
  const line = db.prepare("SELECT * FROM lines WHERE id = ?").get(lineId) as LineRow;
  const favoredIsHome = line.team_id === match.home_team_id;
  const outcome = evaluateLine(
    favoredIsHome ? match.home_goals! : match.away_goals!,
    favoredIsHome ? match.away_goals! : match.home_goals!,
    line.spread,
  );
  const participants = db
    .prepare(
      `SELECT rm.user_id AS userId, b.side
       FROM room_members rm
       LEFT JOIN bets b ON b.line_id = ? AND b.user_id = rm.user_id
       WHERE rm.room_id = ?`,
    )
    .all(lineId, roomId) as Participant[];
  for (const d of settleRoomMatch(outcome, participants)) {
    insertSettlement.run(lineId, d.userId, d.delta, d.result);
  }
}

// --- Open lines on upcoming marquee matches -----------------------------
// Friends have picked; the demo user still owes picks → dashboard nudges.
const bra = addLine(7, "BRA", 0.5); // Brazil v Morocco, June 13
addBet.run(bra, sam, "cover");
addBet.run(bra, priya, "against");
const ned = addLine(11, "NED", 1); // Netherlands v Japan, June 14
addBet.run(ned, sam, "cover");
addBet.run(ned, leo, "cover");

console.log("Seeded Copa Crew (code CREW26).");
console.log("Log in: demo@wcbet.fun / demo1234" + (noAdminYet ? " (platform admin)" : ""));
console.log("Friends: sam@ / priya@ / leo@wcbet.fun, same password.");
