import { execSync } from "node:child_process";
import { afterAll, expect, test } from "vitest";
import { createDatabase } from "../src/lib/db";
import { propagateBracket } from "../src/lib/propagate";

// Isolated DB file so running the suite never touches the dev/app database.
const DB_PATH = "data/_test_bracket.db";
afterAll(() => execSync(`rm -f ${DB_PATH}*`));

test("full bracket propagates group → final against the real fixture", () => {
  const db = createDatabase(DB_PATH);
  const rank = (id: number) =>
    (db.prepare("SELECT fifa_rank FROM teams WHERE id=?").get(id) as { fifa_rank: number }).fifa_rank;

  const finish = (m: any, drawWinner: number | null = null) => {
    let hg: number, ag: number, w: number | null = null;
    if (drawWinner) {
      hg = 1; ag = 1; w = drawWinner;
    } else if (rank(m.home_team_id) <= rank(m.away_team_id)) {
      hg = 2; ag = 0;
    } else {
      hg = 0; ag = 2;
    }
    db.prepare(
      "UPDATE matches SET home_goals=?, away_goals=?, winner_team_id=?, status='finished' WHERE id=?",
    ).run(hg, ag, w, m.id);
  };
  const pending = (stage: string) =>
    db.prepare(
      "SELECT * FROM matches WHERE stage=? AND (home_team_id IS NULL OR away_team_id IS NULL)",
    ).all(stage) as any[];
  const ready = (stage: string) =>
    db.prepare(
      "SELECT * FROM matches WHERE stage=? AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL AND status='scheduled'",
    ).all(stage) as any[];

  // Group stage → fills R32
  for (const m of db.prepare("SELECT * FROM matches WHERE stage='group'").all() as any[]) finish(m);
  propagateBracket(db);
  expect(pending("r32").length).toBe(0);

  // R32 (match 73 decided on penalties) → fills R16
  let firstR32 = true;
  for (const m of ready("r32")) {
    finish(m, firstR32 ? m.home_team_id : null);
    firstR32 = false;
  }
  propagateBracket(db);
  expect(pending("r16").length).toBe(0);

  // R16 → QF → SF → fills final + third place
  for (const stage of ["r16", "qf", "sf"]) {
    for (const m of ready(stage)) finish(m);
    propagateBracket(db);
  }
  expect(pending("final").length).toBe(0);
  expect(pending("third").length).toBe(0);

  // Every knockout match now has both concrete teams.
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

  // The final's two slots resolve to real, distinct teams.
  const final = db.prepare("SELECT home_team_id, away_team_id FROM matches WHERE id=104").get() as {
    home_team_id: number; away_team_id: number;
  };
  expect(final.home_team_id).toBeGreaterThan(0);
  expect(final.away_team_id).toBeGreaterThan(0);
  expect(final.home_team_id).not.toBe(final.away_team_id);
});
