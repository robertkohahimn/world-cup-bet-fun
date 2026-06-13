export interface GroupMatch {
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  finished: boolean;
}

export interface TableRow {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export function computeGroupTable(teamIds: number[], matches: GroupMatch[]): TableRow[] {
  const rows = new Map<number, TableRow>(
    teamIds.map((teamId) => [
      teamId,
      { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
    ]),
  );

  const tally = (teamId: number, scored: number, conceded: number) => {
    const r = rows.get(teamId);
    if (!r) return;
    r.played += 1;
    r.gf += scored;
    r.ga += conceded;
    r.gd = r.gf - r.ga;
    if (scored > conceded) {
      r.won += 1;
      r.points += 3;
    } else if (scored === conceded) {
      r.drawn += 1;
      r.points += 1;
    } else {
      r.lost += 1;
    }
  };

  for (const m of matches) {
    if (!m.finished || m.homeGoals === null || m.awayGoals === null) continue;
    tally(m.homeTeamId, m.homeGoals, m.awayGoals);
    tally(m.awayTeamId, m.awayGoals, m.homeGoals);
  }

  // First pass: overall points, then goal difference, then goals for.
  const sorted = [...rows.values()].sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );

  // FIFA tiebreak: among teams equal on all three, apply a head-to-head
  // mini-table (points, then GD, then GF in matches between only those teams).
  // Anything still level falls back to a deterministic order (ascending id),
  // standing in for the fair-play / drawing-of-lots steps we don't model.
  const equalOverall = (a: TableRow, b: TableRow) =>
    a.points === b.points && a.gd === b.gd && a.gf === b.gf;

  const result: TableRow[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && equalOverall(sorted[i], sorted[j])) j++;
    if (j - i === 1) {
      result.push(sorted[i]);
    } else {
      const tied = sorted.slice(i, j);
      result.push(...breakTie(tied, matches));
    }
    i = j;
  }
  return result;
}

/** Rank a set of teams tied on overall pts/GD/GF by their head-to-head record. */
function breakTie(tied: TableRow[], matches: GroupMatch[]): TableRow[] {
  const ids = new Set(tied.map((r) => r.teamId));
  const h2h = new Map<number, { points: number; gd: number; gf: number }>(
    tied.map((r) => [r.teamId, { points: 0, gd: 0, gf: 0 }]),
  );

  const add = (teamId: number, scored: number, conceded: number) => {
    const s = h2h.get(teamId)!;
    s.gf += scored;
    s.gd += scored - conceded;
    s.points += scored > conceded ? 3 : scored === conceded ? 1 : 0;
  };

  for (const m of matches) {
    if (!m.finished || m.homeGoals === null || m.awayGoals === null) continue;
    if (!ids.has(m.homeTeamId) || !ids.has(m.awayTeamId)) continue;
    add(m.homeTeamId, m.homeGoals, m.awayGoals);
    add(m.awayTeamId, m.awayGoals, m.homeGoals);
  }

  return [...tied].sort((a, b) => {
    const sa = h2h.get(a.teamId)!;
    const sb = h2h.get(b.teamId)!;
    return (
      sb.points - sa.points || sb.gd - sa.gd || sb.gf - sa.gf || a.teamId - b.teamId
    );
  });
}
