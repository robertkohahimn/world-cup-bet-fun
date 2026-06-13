"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireUser } from "../session";
import { propagateBracket } from "../propagate";
import { evaluateLine, settleRoomMatch, type Participant, type Side } from "../settle";
import { betDeadline, deadlinePassed, parseKickoff } from "../types";
import type { LineRow, MatchRow, RoomRow } from "../types";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

/** Room admin sets or updates the spread for a match. Clears existing picks on change. */
export async function setLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const roomId = Number(formData.get("roomId"));
  const matchId = Number(formData.get("matchId"));
  const teamId = Number(formData.get("teamId"));
  const spread = Number(formData.get("spread"));

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as RoomRow | undefined;
  if (!room || room.admin_id !== user.id) return { error: "Only the room admin can set lines." };

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as
    | MatchRow
    | undefined;
  if (!match) return { error: "Unknown match." };
  if (match.status === "finished") return { error: "That match has already been played." };
  if (match.home_team_id === null || match.away_team_id === null) {
    return { error: "Teams for this match aren't decided yet." };
  }
  if (deadlinePassed(match.kickoff_utc)) {
    return { error: "Betting is closed for this match — the line is locked." };
  }
  if (teamId !== match.home_team_id && teamId !== match.away_team_id) {
    return { error: "The favored team must be playing in this match." };
  }
  if (!Number.isFinite(spread) || spread < 0 || spread > 10 || (spread * 2) % 1 !== 0) {
    return { error: "Spread must be between 0 and 10 in half-goal steps." };
  }

  db.transaction(() => {
    const existing = db
      .prepare("SELECT * FROM lines WHERE room_id = ? AND match_id = ?")
      .get(roomId, matchId) as LineRow | undefined;
    if (existing) {
      if (existing.team_id === teamId && existing.spread === spread) return;
      // The line's meaning changed — existing picks no longer mean what
      // members chose. Clear them AND replace the row so the line gets a fresh
      // id: any room page rendered against the old line now posts a dead id,
      // so a stale form can't silently re-pick against the new spread.
      db.prepare("DELETE FROM bets WHERE line_id = ?").run(existing.id);
      db.prepare("DELETE FROM lines WHERE id = ?").run(existing.id);
    }
    db.prepare(
      "INSERT INTO lines (room_id, match_id, team_id, spread) VALUES (?, ?, ?, ?)",
    ).run(roomId, matchId, teamId, spread);
  })();

  revalidatePath(`/rooms/${room.code}`);
  return { ok: true };
}

/** Member picks a side on a line. Upsert — adjustable until the deadline. */
export async function placeBet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const lineId = Number(formData.get("lineId"));
  const side = String(formData.get("side"));

  if (side !== "cover" && side !== "against") return { error: "Pick a side." };

  const db = getDb();
  const line = db.prepare("SELECT * FROM lines WHERE id = ?").get(lineId) as LineRow | undefined;
  if (!line) return { error: "That line no longer exists." };

  const member = db
    .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?")
    .get(line.room_id, user.id);
  if (!member) return { error: "You're not a member of this room." };

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(line.match_id) as MatchRow;
  if (match.status === "finished" || deadlinePassed(match.kickoff_utc)) {
    return { error: "Too late — betting closed 6 hours before kickoff." };
  }

  db.prepare(
    `INSERT INTO bets (line_id, user_id, side) VALUES (?, ?, ?)
     ON CONFLICT (line_id, user_id)
     DO UPDATE SET side = excluded.side, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).run(lineId, user.id, side as Side);

  const room = db.prepare("SELECT code FROM rooms WHERE id = ?").get(line.room_id) as {
    code: string;
  };
  revalidatePath(`/rooms/${room.code}`);
  return { ok: true };
}

/**
 * Platform admin records a final score. Re-runs settlement for every room
 * line on the match (idempotent: settlements are derived, so they are
 * deleted and recomputed — score corrections just work).
 */
export async function recordResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!user.is_admin) return { error: "Only the platform admin can record results." };

  const matchId = Number(formData.get("matchId"));
  const homeGoals = Number(formData.get("homeGoals"));
  const awayGoals = Number(formData.get("awayGoals"));

  if (
    !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) ||
    homeGoals < 0 || awayGoals < 0 || homeGoals > 99 || awayGoals > 99
  ) {
    return { error: "Goals must be whole numbers." };
  }

  const db = getDb();
  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as
    | MatchRow
    | undefined;
  if (!match) return { error: "Unknown match." };
  const kickoff = parseKickoff(match.kickoff_utc);
  if (!kickoff) return { error: "This match has no valid kickoff time set." };
  if (kickoff > new Date()) {
    return { error: "That match hasn't kicked off yet." };
  }

  // Knockout matches need a single winner so the bracket can advance. A level
  // score means it went to penalties — the admin picks who went through.
  const isKnockout = match.stage !== "group";
  let winnerTeamId: number | null = null;
  if (isKnockout) {
    if (match.home_team_id == null || match.away_team_id == null) {
      return { error: "Both teams for this match aren't decided yet." };
    }
    if (homeGoals === awayGoals) {
      const provided = Number(formData.get("winnerTeamId"));
      if (provided !== match.home_team_id && provided !== match.away_team_id) {
        return { error: "A level knockout score needs a penalty-shootout winner." };
      }
      winnerTeamId = provided;
    } else {
      winnerTeamId = homeGoals > awayGoals ? match.home_team_id : match.away_team_id;
    }
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE matches SET home_goals = ?, away_goals = ?, winner_team_id = ?, status = 'finished' WHERE id = ?",
    ).run(homeGoals, awayGoals, winnerTeamId, matchId);

    const lines = db.prepare("SELECT * FROM lines WHERE match_id = ?").all(matchId) as LineRow[];
    const insertSettlement = db.prepare(
      "INSERT INTO settlements (line_id, user_id, delta, outcome) VALUES (?, ?, ?, ?)",
    );

    for (const line of lines) {
      db.prepare("DELETE FROM settlements WHERE line_id = ?").run(line.id);

      const favoredIsHome = line.team_id === match.home_team_id;
      const outcome = evaluateLine(
        favoredIsHome ? homeGoals : awayGoals,
        favoredIsHome ? awayGoals : homeGoals,
        line.spread,
      );

      // Only members who joined before the betting deadline are on the hook.
      // kickoff is validated above, so betDeadline is non-null here.
      const deadlineIso = betDeadline(match.kickoff_utc)!.toISOString();
      const participants = db
        .prepare(
          `SELECT rm.user_id AS userId, b.side
           FROM room_members rm
           LEFT JOIN bets b ON b.line_id = ? AND b.user_id = rm.user_id
           WHERE rm.room_id = ? AND rm.joined_at < ?`,
        )
        .all(line.id, line.room_id, deadlineIso) as Participant[];

      for (const delta of settleRoomMatch(outcome, participants)) {
        insertSettlement.run(line.id, delta.userId, delta.delta, delta.result);
      }
    }

    // A finished result may decide a group or advance a knockout tie — fill in
    // any downstream bracket slots that are now known.
    propagateBracket(db);
  })();

  revalidatePath("/", "layout");
  return { ok: true };
}
