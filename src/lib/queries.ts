import { getDb } from "./db";
import { computeGroupTable, type TableRow } from "./standings";
import { betDeadline } from "./types";
import type { BetRow, LineRow, MatchRow, RoomRow, TeamRow } from "./types";

export interface MatchWithTeams extends MatchRow {
  home: TeamRow | null;
  away: TeamRow | null;
}

const MATCH_SELECT = `
  SELECT m.*,
         h.id AS h_id, h.code AS h_code, h.name AS h_name, h.group_name AS h_group, h.region AS h_region, h.fifa_rank AS h_rank, h.flag AS h_flag,
         a.id AS a_id, a.code AS a_code, a.name AS a_name, a.group_name AS a_group, a.region AS a_region, a.fifa_rank AS a_rank, a.flag AS a_flag
  FROM matches m
  LEFT JOIN teams h ON h.id = m.home_team_id
  LEFT JOIN teams a ON a.id = m.away_team_id
`;

function rowToMatch(r: Record<string, unknown>): MatchWithTeams {
  const team = (p: "h" | "a"): TeamRow | null =>
    r[`${p}_id`] == null
      ? null
      : {
          id: r[`${p}_id`] as number,
          code: r[`${p}_code`] as string,
          name: r[`${p}_name`] as string,
          group_name: r[`${p}_group`] as string,
          region: r[`${p}_region`] as string,
          fifa_rank: r[`${p}_rank`] as number | null,
          flag: r[`${p}_flag`] as string,
        };
  return { ...(r as unknown as MatchRow), home: team("h"), away: team("a") };
}

export function listMatches(): MatchWithTeams[] {
  const rows = getDb().prepare(`${MATCH_SELECT} ORDER BY m.kickoff_utc, m.id`).all() as Record<
    string,
    unknown
  >[];
  return rows.map(rowToMatch);
}

export function getMatch(id: number): MatchWithTeams | null {
  const row = getDb().prepare(`${MATCH_SELECT} WHERE m.id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMatch(row) : null;
}

export function upcomingMatches(limit: number, now = new Date()): MatchWithTeams[] {
  const rows = getDb()
    .prepare(
      `${MATCH_SELECT} WHERE m.status = 'scheduled' AND m.kickoff_utc > ? ORDER BY m.kickoff_utc, m.id LIMIT ?`,
    )
    .all(now.toISOString(), limit) as Record<string, unknown>[];
  return rows.map(rowToMatch);
}

/** Kickoff has passed but no final score recorded yet. */
export function matchesAwaitingResult(now = new Date()): MatchWithTeams[] {
  const rows = getDb()
    .prepare(
      `${MATCH_SELECT} WHERE m.status = 'scheduled' AND m.kickoff_utc <= ? ORDER BY m.kickoff_utc, m.id`,
    )
    .all(now.toISOString()) as Record<string, unknown>[];
  return rows.map(rowToMatch);
}

export function recentResults(limit: number): MatchWithTeams[] {
  const rows = getDb()
    .prepare(`${MATCH_SELECT} WHERE m.status = 'finished' ORDER BY m.kickoff_utc DESC LIMIT ?`)
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToMatch);
}

export function getTeam(id: number): TeamRow | null {
  return (getDb().prepare("SELECT * FROM teams WHERE id = ?").get(id) as TeamRow | undefined) ?? null;
}

export function teamsByGroup(): Map<string, TeamRow[]> {
  const teams = getDb().prepare("SELECT * FROM teams ORDER BY group_name, name").all() as TeamRow[];
  const map = new Map<string, TeamRow[]>();
  for (const t of teams) {
    const list = map.get(t.group_name) ?? [];
    list.push(t);
    map.set(t.group_name, list);
  }
  return map;
}

export function teamMatches(teamId: number): MatchWithTeams[] {
  const rows = getDb()
    .prepare(
      `${MATCH_SELECT} WHERE m.home_team_id = ? OR m.away_team_id = ? ORDER BY m.kickoff_utc, m.id`,
    )
    .all(teamId, teamId) as Record<string, unknown>[];
  return rows.map(rowToMatch);
}

export interface GroupStanding extends TableRow {
  team: TeamRow;
}

export function groupTable(group: string): GroupStanding[] {
  const db = getDb();
  const teams = db
    .prepare("SELECT * FROM teams WHERE group_name = ? ORDER BY name")
    .all(group) as TeamRow[];
  const matches = db
    .prepare(
      "SELECT home_team_id, away_team_id, home_goals, away_goals, status FROM matches WHERE stage = 'group' AND group_name = ?",
    )
    .all(group) as Pick<
    MatchRow,
    "home_team_id" | "away_team_id" | "home_goals" | "away_goals" | "status"
  >[];

  const table = computeGroupTable(
    teams.map((t) => t.id),
    matches
      .filter((m) => m.home_team_id !== null && m.away_team_id !== null)
      .map((m) => ({
        homeTeamId: m.home_team_id as number,
        awayTeamId: m.away_team_id as number,
        homeGoals: m.home_goals,
        awayGoals: m.away_goals,
        finished: m.status === "finished",
      })),
  );
  const byId = new Map(teams.map((t) => [t.id, t]));
  return table.map((row) => ({ ...row, team: byId.get(row.teamId) as TeamRow }));
}

export interface MemberStanding {
  userId: number;
  name: string;
  joinedAt: string;
  isAdmin: boolean;
  points: number;
  wins: number;
  losses: number;
  pushes: number;
}

export function roomLeaderboard(roomId: number): MemberStanding[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS userId, u.name, rm.joined_at AS joinedAt,
              (u.id = r.admin_id) AS isAdmin,
              COALESCE(SUM(s.delta), 0) AS points,
              COALESCE(SUM(s.outcome = 'win'), 0) AS wins,
              COALESCE(SUM(s.outcome = 'loss'), 0) AS losses,
              COALESCE(SUM(s.outcome = 'push'), 0) AS pushes
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       JOIN rooms r ON r.id = rm.room_id
       LEFT JOIN lines l ON l.room_id = rm.room_id
       LEFT JOIN settlements s ON s.line_id = l.id AND s.user_id = u.id
       WHERE rm.room_id = ?
       GROUP BY u.id
       ORDER BY points DESC, wins DESC, rm.joined_at ASC`,
    )
    .all(roomId) as (Omit<MemberStanding, "isAdmin"> & { isAdmin: number })[];
  return rows.map((r) => ({ ...r, isAdmin: Boolean(r.isAdmin) }));
}

export interface RoomSummary extends RoomRow {
  memberCount: number;
  myPoints: number;
  myRank: number;
  isAdmin: boolean;
}

export function userRooms(userId: number): RoomSummary[] {
  const db = getDb();
  const rooms = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS memberCount
       FROM rooms r JOIN room_members rm ON rm.room_id = r.id
       WHERE rm.user_id = ? ORDER BY r.created_at DESC`,
    )
    .all(userId) as (RoomRow & { memberCount: number })[];

  return rooms.map((room) => {
    const board = roomLeaderboard(room.id);
    const idx = board.findIndex((m) => m.userId === userId);
    return {
      ...room,
      myPoints: idx >= 0 ? board[idx].points : 0,
      myRank: idx + 1,
      isAdmin: room.admin_id === userId,
      memberCount: room.memberCount,
    };
  });
}

export function getRoomByCode(code: string): RoomRow | null {
  return (
    (getDb().prepare("SELECT * FROM rooms WHERE code = ?").get(code.toUpperCase()) as
      | RoomRow
      | undefined) ?? null
  );
}

export function isRoomMember(roomId: number, userId: number): boolean {
  return Boolean(
    getDb()
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?")
      .get(roomId, userId),
  );
}

export interface LineDetail {
  line: LineRow;
  match: MatchWithTeams;
  favored: TeamRow;
  other: TeamRow;
  myBet: BetRow | null;
  /** Everyone's picks — only populated once the deadline has passed. */
  picks: { userId: number; name: string; side: "cover" | "against" }[];
  betCount: number;
  settled: boolean;
}

export function roomLines(roomId: number, userId: number, now = new Date()): LineDetail[] {
  const db = getDb();
  const lines = db
    .prepare("SELECT * FROM lines WHERE room_id = ?")
    .all(roomId) as LineRow[];

  const details = lines.map((line) => {
    const match = getMatch(line.match_id) as MatchWithTeams;
    const favored = (match.home?.id === line.team_id ? match.home : match.away) as TeamRow;
    const other = (match.home?.id === line.team_id ? match.away : match.home) as TeamRow;
    const myBet =
      (db
        .prepare("SELECT * FROM bets WHERE line_id = ? AND user_id = ?")
        .get(line.id, userId) as BetRow | undefined) ?? null;
    const betCount = (
      db.prepare("SELECT COUNT(*) AS c FROM bets WHERE line_id = ?").get(line.id) as { c: number }
    ).c;

    const locked = now >= betDeadline(match.kickoff_utc);
    const picks = locked
      ? (db
          .prepare(
            `SELECT b.user_id AS userId, u.name, b.side
             FROM bets b JOIN users u ON u.id = b.user_id WHERE b.line_id = ?`,
          )
          .all(line.id) as LineDetail["picks"])
      : [];

    const settled = Boolean(
      db.prepare("SELECT 1 FROM settlements WHERE line_id = ? LIMIT 1").get(line.id),
    );

    return { line, match, favored, other, myBet, picks, betCount, settled };
  });

  return details.sort((a, b) => a.match.kickoff_utc.localeCompare(b.match.kickoff_utc));
}

export interface LineSettlement {
  userId: number;
  name: string;
  delta: number;
  outcome: "win" | "loss" | "push";
}

export function lineSettlements(lineId: number): LineSettlement[] {
  return getDb()
    .prepare(
      `SELECT s.user_id AS userId, u.name, s.delta, s.outcome
       FROM settlements s JOIN users u ON u.id = s.user_id
       WHERE s.line_id = ?
       ORDER BY s.delta DESC, u.name`,
    )
    .all(lineId) as LineSettlement[];
}

/** Matches a room admin can still set a line on: teams known, deadline not passed. */
export function lineableMatches(now = new Date()): MatchWithTeams[] {
  const cutoff = new Date(now.getTime() + 6 * 3600_000).toISOString();
  const rows = getDb()
    .prepare(
      `${MATCH_SELECT}
       WHERE m.status = 'scheduled' AND m.home_team_id IS NOT NULL
         AND m.away_team_id IS NOT NULL AND m.kickoff_utc > ?
       ORDER BY m.kickoff_utc, m.id`,
    )
    .all(cutoff) as Record<string, unknown>[];
  return rows.map(rowToMatch);
}

export interface SettledEntry {
  delta: number;
  outcome: "win" | "loss" | "push";
  spread: number;
  favoredName: string;
  roomName: string;
  roomCode: string;
  matchId: number;
  kickoff: string;
  homeName: string | null;
  awayName: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  side: "cover" | "against" | null;
}

export function userSettlements(userId: number): SettledEntry[] {
  return getDb()
    .prepare(
      `SELECT s.delta, s.outcome, l.spread,
              ft.name AS favoredName, r.name AS roomName, r.code AS roomCode,
              m.id AS matchId, m.kickoff_utc AS kickoff,
              h.name AS homeName, a.name AS awayName,
              m.home_goals AS homeGoals, m.away_goals AS awayGoals,
              b.side
       FROM settlements s
       JOIN lines l ON l.id = s.line_id
       JOIN rooms r ON r.id = l.room_id
       JOIN matches m ON m.id = l.match_id
       JOIN teams ft ON ft.id = l.team_id
       LEFT JOIN teams h ON h.id = m.home_team_id
       LEFT JOIN teams a ON a.id = m.away_team_id
       LEFT JOIN bets b ON b.line_id = l.id AND b.user_id = s.user_id
       WHERE s.user_id = ?
       ORDER BY m.kickoff_utc ASC`,
    )
    .all(userId) as SettledEntry[];
}

export interface UserAnalytics {
  totalPoints: number;
  wins: number;
  losses: number;
  pushes: number;
  missedDeadlines: number;
  winRate: number | null;
  history: SettledEntry[];
}

export function userAnalytics(userId: number): UserAnalytics {
  const history = userSettlements(userId);
  const wins = history.filter((h) => h.outcome === "win").length;
  const losses = history.filter((h) => h.outcome === "loss").length;
  const pushes = history.filter((h) => h.outcome === "push").length;
  const missedDeadlines = history.filter((h) => h.side === null && h.outcome === "loss").length;
  const decided = wins + losses;
  return {
    totalPoints: history.reduce((sum, h) => sum + h.delta, 0),
    wins,
    losses,
    pushes,
    missedDeadlines,
    winRate: decided > 0 ? wins / decided : null,
    history,
  };
}

/** Lines in the user's rooms that still need a pick, deadline soonest first. */
export interface PendingPick {
  roomName: string;
  roomCode: string;
  lineId: number;
  match: MatchWithTeams;
  favored: TeamRow;
  spread: number;
}

export function pendingPicks(userId: number, now = new Date()): PendingPick[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT l.id AS lineId, l.spread, l.team_id AS teamId, l.match_id AS matchId,
              r.name AS roomName, r.code AS roomCode
       FROM lines l
       JOIN rooms r ON r.id = l.room_id
       JOIN room_members rm ON rm.room_id = l.room_id AND rm.user_id = ?
       JOIN matches m ON m.id = l.match_id
       WHERE m.status = 'scheduled'
         AND NOT EXISTS (SELECT 1 FROM bets b WHERE b.line_id = l.id AND b.user_id = ?)
       ORDER BY m.kickoff_utc ASC`,
    )
    .all(userId, userId) as {
    lineId: number;
    spread: number;
    teamId: number;
    matchId: number;
    roomName: string;
    roomCode: string;
  }[];

  return rows
    .map((r) => {
      const match = getMatch(r.matchId) as MatchWithTeams;
      const favored = (match.home?.id === r.teamId ? match.home : match.away) as TeamRow;
      return { roomName: r.roomName, roomCode: r.roomCode, lineId: r.lineId, match, favored, spread: r.spread };
    })
    .filter((p) => now < betDeadline(p.match.kickoff_utc));
}
