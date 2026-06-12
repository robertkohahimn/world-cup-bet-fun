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

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId - b.teamId,
  );
}
