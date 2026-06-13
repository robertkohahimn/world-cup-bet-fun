import type DatabaseT from "better-sqlite3";
import { execSync } from "node:child_process";
import { afterAll, expect, test } from "vitest";
import { createDatabase } from "../src/lib/db";
import { propagateBracket } from "../src/lib/propagate";

// Isolated DB files so running the suite never touches the dev/app database.
const dbPaths: string[] = [];
afterAll(() => dbPaths.forEach((p) => execSync(`rm -f ${p}*`)));

function freshDb(tag: string): DatabaseT.Database {
  const path = `data/_test_${tag}.db`;
  execSync(`rm -f ${path}*`);
  dbPaths.push(path);
  return createDatabase(path);
}

const rank = (db: DatabaseT.Database, id: number) =>
  (db.prepare("SELECT fifa_rank FROM teams WHERE id=?").get(id) as { fifa_rank: number }).fifa_rank;

/** Finish a match: better-ranked team wins by 2, unless a penalty winner is given. */
function finish(db: DatabaseT.Database, m: any, drawWinner: number | null = null) {
  let hg: number, ag: number, w: number | null = null;
  if (drawWinner) {
    hg = 1; ag = 1; w = drawWinner;
  } else if (rank(db, m.home_team_id) <= rank(db, m.away_team_id)) {
    hg = 2; ag = 0;
  } else {
    hg = 0; ag = 2;
  }
  db.prepare(
    "UPDATE matches SET home_goals=?, away_goals=?, winner_team_id=?, status='finished' WHERE id=?",
  ).run(hg, ag, w, m.id);
}

const ready = (db: DatabaseT.Database, stage: string) =>
  db.prepare(
    "SELECT * FROM matches WHERE stage=? AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL AND status='scheduled'",
  ).all(stage) as any[];
const pending = (db: DatabaseT.Database, stage: string) =>
  db.prepare(
    "SELECT * FROM matches WHERE stage=? AND (home_team_id IS NULL OR away_team_id IS NULL)",
  ).all(stage) as any[];

/** Fresh DB with every group match finished and the bracket propagated to R32. */
function throughGroups(tag: string): DatabaseT.Database {
  const db = freshDb(tag);
  for (const m of db.prepare("SELECT * FROM matches WHERE stage='group'").all() as any[]) finish(db, m);
  propagateBracket(db);
  return db;
}

test("full bracket propagates group → final against the real fixture", () => {
  const db = throughGroups("full");
  expect(pending(db, "r32").length).toBe(0);

  // R32 (match 73 decided on penalties) → fills R16
  let firstR32 = true;
  for (const m of ready(db, "r32")) {
    finish(db, m, firstR32 ? m.home_team_id : null);
    firstR32 = false;
  }
  propagateBracket(db);
  expect(pending(db, "r16").length).toBe(0);

  // R16 → QF → SF → fills final + third place
  for (const stage of ["r16", "qf", "sf"]) {
    for (const m of ready(db, stage)) finish(db, m);
    propagateBracket(db);
  }
  expect(pending(db, "final").length).toBe(0);
  expect(pending(db, "third").length).toBe(0);

  const unresolved = (
    db.prepare(
      "SELECT COUNT(*) c FROM matches WHERE stage!='group' AND (home_team_id IS NULL OR away_team_id IS NULL)",
    ).get() as { c: number }
  ).c;
  expect(unresolved).toBe(0);

  // The penalty winner of M73 (not a goals winner) advanced to M90's home slot.
  const m73 = db.prepare("SELECT winner_team_id FROM matches WHERE id=73").get() as { winner_team_id: number };
  const m90 = db.prepare("SELECT home_team_id FROM matches WHERE id=90").get() as { home_team_id: number };
  expect(m73.winner_team_id).toBe(m90.home_team_id);

  const final = db.prepare("SELECT home_team_id, away_team_id FROM matches WHERE id=104").get() as {
    home_team_id: number; away_team_id: number;
  };
  expect(final.home_team_id).toBeGreaterThan(0);
  expect(final.away_team_id).toBeGreaterThan(0);
  expect(final.home_team_id).not.toBe(final.away_team_id);
});

test("correcting an upstream result re-flows the downstream slot", () => {
  const db = throughGroups("cascade");
  const m73 = db.prepare("SELECT home_team_id, away_team_id FROM matches WHERE id=73").get() as {
    home_team_id: number; away_team_id: number;
  };
  const m90Home = () =>
    (db.prepare("SELECT home_team_id FROM matches WHERE id=90").get() as { home_team_id: number }).home_team_id;

  // Home team wins M73 → advances to M90's home (Winner M73).
  db.prepare("UPDATE matches SET home_goals=2, away_goals=0, status='finished' WHERE id=73").run();
  propagateBracket(db);
  expect(m90Home()).toBe(m73.home_team_id);

  // Correct M73 so the away team wins instead → M90's home must update.
  db.prepare("UPDATE matches SET home_goals=0, away_goals=2 WHERE id=73").run();
  propagateBracket(db);
  expect(m90Home()).toBe(m73.away_team_id);
});

test("a downstream match that already has a line is never re-teamed", () => {
  const db = throughGroups("locked");
  const m73 = db.prepare("SELECT home_team_id, away_team_id FROM matches WHERE id=73").get() as {
    home_team_id: number; away_team_id: number;
  };
  const m90Home = () =>
    (db.prepare("SELECT home_team_id FROM matches WHERE id=90").get() as { home_team_id: number }).home_team_id;

  db.prepare("UPDATE matches SET home_goals=2, away_goals=0, status='finished' WHERE id=73").run();
  propagateBracket(db);
  expect(m90Home()).toBe(m73.home_team_id);

  // A room posts a line on M90 — now its teams are locked against later reshuffles.
  const userId = Number(
    db.prepare("INSERT INTO users (name, email, password_hash) VALUES ('A','a@x.io','h')").run().lastInsertRowid,
  );
  const roomId = Number(
    db.prepare("INSERT INTO rooms (code, name, admin_id) VALUES ('LOCK01','R',?)").run(userId).lastInsertRowid,
  );
  db.prepare("INSERT INTO lines (room_id, match_id, team_id, spread) VALUES (?,?,?,1)").run(
    roomId, 90, m73.home_team_id,
  );

  // Correct M73; M90 must stay put because a bet already references its teams.
  db.prepare("UPDATE matches SET home_goals=0, away_goals=2 WHERE id=73").run();
  propagateBracket(db);
  expect(m90Home()).toBe(m73.home_team_id);
});
