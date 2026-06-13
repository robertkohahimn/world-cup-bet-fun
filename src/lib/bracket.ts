/**
 * Pure knockout-bracket logic: parsing placeholder slot labels, ranking the
 * best third-placed teams, and assigning them to Round-of-32 slots. The
 * DB-coupled propagation that uses these lives in propagateBracket() (db side).
 */

export interface ThirdTeam {
  teamId: number;
  group: string;
  points: number;
  gd: number;
  gf: number;
}

export type Slot =
  | { kind: "groupWinner"; group: string }
  | { kind: "groupRunnerUp"; group: string }
  | { kind: "third"; groups: string[] }
  | { kind: "matchWinner"; match: number }
  | { kind: "matchLoser"; match: number };

/** Parse a placeholder label like "Winner A", "Runner-up B", "3rd place (A/B/C)",
 *  "Winner M74", "Loser M101". Returns null for anything that isn't a slot. */
export function parseSlot(label: string | null | undefined): Slot | null {
  if (!label) return null;

  const winnerMatch = label.match(/^Winner M(\d+)$/);
  if (winnerMatch) return { kind: "matchWinner", match: Number(winnerMatch[1]) };

  const loserMatch = label.match(/^Loser M(\d+)$/);
  if (loserMatch) return { kind: "matchLoser", match: Number(loserMatch[1]) };

  const winnerGroup = label.match(/^Winner ([A-L])$/);
  if (winnerGroup) return { kind: "groupWinner", group: winnerGroup[1] };

  const runnerUp = label.match(/^Runner-up ([A-L])$/);
  if (runnerUp) return { kind: "groupRunnerUp", group: runnerUp[1] };

  const third = label.match(/^3rd place \(([A-L/]+)\)$/);
  if (third) return { kind: "third", groups: third[1].split("/") };

  return null;
}

/** Rank thirds the FIFA way: points, then GD, then GF; group letter as the
 *  deterministic final tiebreak (standing in for fair-play / drawing of lots). */
export function rankThirds(thirds: ThirdTeam[]): ThirdTeam[] {
  return [...thirds].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.group.localeCompare(b.group),
  );
}

/** The eight best third-placed teams that advance to the Round of 32. */
export function bestEightThirds(thirds: ThirdTeam[]): ThirdTeam[] {
  return rankThirds(thirds).slice(0, 8);
}

export interface ThirdSlot {
  n: number;
  groups: string[];
}

/**
 * Assign each "3rd place (...)" slot a qualifying third-placed team from one of
 * its eligible groups, each team used once (a bipartite matching / system of
 * distinct representatives). FIFA publishes an exact combination table for this;
 * we instead solve the eligibility constraint directly, which yields a
 * structurally valid bracket for any set of qualifiers. Deterministic.
 *
 * Returns a Map of slot number -> teamId, or null if no complete matching exists.
 */
export function assignThirdSlots(
  slots: ThirdSlot[],
  qualifiers: ThirdTeam[],
): Map<number, number> | null {
  const groupToTeam = new Map<string, number>();
  for (const q of qualifiers) groupToTeam.set(q.group, q.teamId);

  // Most-constrained slot first keeps the backtracking shallow.
  const ordered = [...slots].sort((a, b) => a.groups.length - b.groups.length || a.n - b.n);
  const usedGroups = new Set<string>();
  const result = new Map<number, number>();

  const solve = (i: number): boolean => {
    if (i === ordered.length) return true;
    const slot = ordered[i];
    // Eligible groups that actually have a qualifier and aren't taken, in order.
    const options = slot.groups
      .filter((g) => groupToTeam.has(g) && !usedGroups.has(g))
      .sort();
    for (const g of options) {
      usedGroups.add(g);
      result.set(slot.n, groupToTeam.get(g)!);
      if (solve(i + 1)) return true;
      usedGroups.delete(g);
      result.delete(slot.n);
    }
    return false;
  };

  return solve(0) ? result : null;
}
