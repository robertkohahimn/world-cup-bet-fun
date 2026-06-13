import type Database from "better-sqlite3";
import {
  assignThirdSlots,
  bestEightThirds,
  parseSlot,
  type ThirdSlot,
  type ThirdTeam,
} from "./bracket";
import { computeGroupTable, type TableRow } from "./standings";

const GROUPS = "ABCDEFGHIJKL".split("");

interface KnockoutRow {
  id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  home_label: string | null;
  away_label: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: number | null;
  status: string;
}

/** Final group standings, or null if the group hasn't finished all its matches. */
function groupTable(db: Database.Database, group: string): TableRow[] | null {
  const teamIds = (
    db.prepare("SELECT id FROM teams WHERE group_name = ?").all(group) as { id: number }[]
  ).map((r) => r.id);
  const matches = db
    .prepare(
      "SELECT home_team_id, away_team_id, home_goals, away_goals, status FROM matches WHERE stage = 'group' AND group_name = ?",
    )
    .all(group) as {
    home_team_id: number;
    away_team_id: number;
    home_goals: number | null;
    away_goals: number | null;
    status: string;
  }[];
  if (matches.length === 0 || matches.some((m) => m.status !== "finished")) return null;
  return computeGroupTable(
    teamIds,
    matches.map((m) => ({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      finished: true,
    })),
  );
}

/** Winner/loser of a finished knockout match, or null if undecided. */
function matchOutcome(
  db: Database.Database,
  n: number,
): { winner: number; loser: number } | null {
  const m = db.prepare("SELECT * FROM matches WHERE id = ?").get(n) as KnockoutRow | undefined;
  if (!m || m.status !== "finished" || m.home_team_id == null || m.away_team_id == null) return null;
  if (m.home_goals != null && m.away_goals != null) {
    if (m.home_goals > m.away_goals) return { winner: m.home_team_id, loser: m.away_team_id };
    if (m.away_goals > m.home_goals) return { winner: m.away_team_id, loser: m.home_team_id };
  }
  // Level after regulation — decided on penalties via winner_team_id.
  if (m.winner_team_id == null) return null;
  const loser = m.winner_team_id === m.home_team_id ? m.away_team_id : m.home_team_id;
  return { winner: m.winner_team_id, loser };
}

/**
 * Resolve concrete team ids for knockout matches from their placeholder slots,
 * looping until nothing more changes. Idempotent and safe to call after every
 * recorded result; runs inside the caller's transaction. As well as filling
 * empty slots, it *re-reconciles* already-filled ones when an upstream result is
 * corrected — but only for matches that are still scheduled and have no lines
 * yet, so it never rewrites the teams of a played match or one already bet on.
 */
export function propagateBracket(db: Database.Database) {
  const tables = new Map<string, TableRow[] | null>();
  for (const g of GROUPS) tables.set(g, groupTable(db, g));
  const groupsComplete = GROUPS.every((g) => tables.get(g) != null);

  // Write a resolved team into a slot — but only for a match that hasn't been
  // played and that no room has bet on yet. This both fills empty slots and
  // *re-reconciles* them when an upstream result is corrected, while refusing to
  // mutate the teams of a finished match or one with lines already on it (that
  // would invalidate recorded scores or placed bets — a deeper correction the
  // admin must make by re-recording those matches). Returns true if it changed.
  const updatable =
    "status = 'scheduled' AND NOT EXISTS (SELECT 1 FROM lines WHERE match_id = matches.id)";
  const setHome = db.prepare(
    `UPDATE matches SET home_team_id = ? WHERE id = ? AND ${updatable} AND (home_team_id IS NULL OR home_team_id <> ?)`,
  );
  const setAway = db.prepare(
    `UPDATE matches SET away_team_id = ? WHERE id = ? AND ${updatable} AND (away_team_id IS NULL OR away_team_id <> ?)`,
  );
  const putHome = (teamId: number, matchId: number) => setHome.run(teamId, matchId, teamId).changes > 0;
  const putAway = (teamId: number, matchId: number) => setAway.run(teamId, matchId, teamId).changes > 0;

  // Assign the eight best-third slots together (a constrained matching needs the
  // full picture). Only possible once every group has finished.
  if (groupsComplete) {
    const thirds: ThirdTeam[] = GROUPS.map((g) => {
      const row = tables.get(g)![2];
      return { teamId: row.teamId, group: g, points: row.points, gd: row.gd, gf: row.gf };
    });
    const qualifiers = bestEightThirds(thirds);

    const r32 = db
      .prepare("SELECT id, home_label, away_label FROM matches WHERE stage = 'r32'")
      .all() as { id: number; home_label: string | null; away_label: string | null }[];
    const slots: ThirdSlot[] = [];
    const slotSide = new Map<number, "home" | "away">();
    for (const m of r32) {
      const home = parseSlot(m.home_label);
      if (home?.kind === "third") {
        slots.push({ n: m.id, groups: home.groups });
        slotSide.set(m.id, "home");
      }
      const away = parseSlot(m.away_label);
      if (away?.kind === "third") {
        slots.push({ n: m.id, groups: away.groups });
        slotSide.set(m.id, "away");
      }
    }
    if (slots.length === 8) {
      const assignment = assignThirdSlots(slots, qualifiers);
      if (assignment) {
        for (const [matchId, teamId] of assignment) {
          (slotSide.get(matchId) === "home" ? putHome : putAway)(teamId, matchId);
        }
      }
    }
  }

  // Resolve group winner/runner-up and prior-match winner/loser slots, looping
  // so later rounds fill once the rounds they depend on are decided.
  const resolve = (label: string | null): number | null => {
    const slot = parseSlot(label);
    if (!slot) return null;
    switch (slot.kind) {
      case "groupWinner":
        return tables.get(slot.group)?.[0].teamId ?? null;
      case "groupRunnerUp":
        return tables.get(slot.group)?.[1].teamId ?? null;
      case "matchWinner":
        return matchOutcome(db, slot.match)?.winner ?? null;
      case "matchLoser":
        return matchOutcome(db, slot.match)?.loser ?? null;
      case "third":
        return null; // handled in the batch above
    }
  };

  // Revisit every not-yet-played knockout match (not just empty ones) so a
  // corrected upstream result re-flows downstream, looping until nothing more
  // changes. resolve() only returns a concrete id once its dependency is
  // decided, so a slot is never wiped back to NULL mid-flight.
  let changed = true;
  while (changed) {
    changed = false;
    const pending = db
      .prepare(
        "SELECT id, home_team_id, away_team_id, home_label, away_label FROM matches WHERE stage != 'group' AND status = 'scheduled'",
      )
      .all() as KnockoutRow[];
    for (const m of pending) {
      const homeId = resolve(m.home_label);
      if (homeId != null && putHome(homeId, m.id)) changed = true;
      const awayId = resolve(m.away_label);
      if (awayId != null && putAway(awayId, m.id)) changed = true;
    }
  }
}
