export type LineOutcome = "cover" | "against" | "push";
export type Side = "cover" | "against";

export interface Participant {
  userId: number;
  /** null = member never placed a bet before the deadline */
  side: Side | null;
}

export interface SettlementDelta {
  userId: number;
  delta: number;
  result: "win" | "loss" | "push";
}

/**
 * A line "Team X +S" means X must win by strictly more than S goals for
 * X-backers ("cover") to win. Winning by exactly S is a push; anything
 * less hands the win to the other side ("against").
 */
export function evaluateLine(
  favoredGoals: number,
  otherGoals: number,
  spread: number,
): LineOutcome {
  const margin = favoredGoals - otherGoals;
  if (margin > spread) return "cover";
  if (margin === spread) return "push";
  return "against";
}

/**
 * Room scoring: losers are wrong-side bettors plus members who never bet
 * (a missed deadline always counts as a loss). Each loser drops 1 point;
 * each winner gains one point per loser. On a push, bettors break even
 * but non-bettors still lose their point — with no winners to collect it.
 */
export function settleRoomMatch(
  outcome: LineOutcome,
  participants: Participant[],
): SettlementDelta[] {
  const isLoser = (p: Participant) =>
    p.side === null || (outcome !== "push" && p.side !== outcome);
  const loserCount = participants.filter(isLoser).length;

  return participants.map((p) => {
    if (isLoser(p)) return { userId: p.userId, delta: -1, result: "loss" };
    if (outcome === "push") return { userId: p.userId, delta: 0, result: "push" };
    return { userId: p.userId, delta: loserCount, result: "win" };
  });
}
