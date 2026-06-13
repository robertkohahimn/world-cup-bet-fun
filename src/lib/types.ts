export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  is_admin: number;
  created_at: string;
}

export interface TeamRow {
  id: number;
  code: string;
  name: string;
  group_name: string;
  region: string;
  fifa_rank: number | null;
  flag: string;
}

export interface MatchRow {
  id: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  group_name: string | null;
  kickoff_utc: string;
  venue: string;
  city: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_label: string | null;
  away_label: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: number | null;
  status: "scheduled" | "finished";
}

export interface RoomRow {
  id: number;
  code: string;
  name: string;
  admin_id: number;
  created_at: string;
}

export interface LineRow {
  id: number;
  room_id: number;
  match_id: number;
  team_id: number;
  spread: number;
  created_at: string;
}

export interface BetRow {
  id: number;
  line_id: number;
  user_id: number;
  side: "cover" | "against";
  updated_at: string;
}

export const STAGE_NAMES: Record<MatchRow["stage"], string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "Third Place",
  final: "Final",
};

/** Betting closes this many hours before kickoff. */
export const BET_DEADLINE_HOURS = 6;

/** Kickoffs are stored as ISO-8601 UTC (e.g. 2026-06-11T20:00:00Z). */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** Parse a kickoff string strictly as UTC. Returns null on anything malformed. */
export function parseKickoff(kickoffUtc: string): Date | null {
  if (!ISO_UTC.test(kickoffUtc)) return null;
  const d = new Date(kickoffUtc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Deadline = kickoff − 6h. Null when the kickoff string is unparseable. */
export function betDeadline(kickoffUtc: string): Date | null {
  const k = parseKickoff(kickoffUtc);
  return k ? new Date(k.getTime() - BET_DEADLINE_HOURS * 3600_000) : null;
}

export function deadlinePassed(kickoffUtc: string, now = new Date()): boolean {
  const deadline = betDeadline(kickoffUtc);
  // Fail safe: an unparseable kickoff is treated as closed, never open for bets.
  if (!deadline) return true;
  return now >= deadline;
}

/** Deadline as an ISO string for UI components, or null when unparseable. */
export function betDeadlineIso(kickoffUtc: string): string | null {
  return betDeadline(kickoffUtc)?.toISOString() ?? null;
}
