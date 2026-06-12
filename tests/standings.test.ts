import { describe, expect, test } from "vitest";
import { computeGroupTable, type GroupMatch } from "../src/lib/standings";

const m = (
  home: number,
  away: number,
  hg: number | null,
  ag: number | null,
): GroupMatch => ({
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  finished: hg !== null,
});

describe("computeGroupTable", () => {
  test("all zeros before any match is played", () => {
    const table = computeGroupTable([1, 2], [m(1, 2, null, null)]);
    expect(table).toEqual([
      { teamId: 1, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { teamId: 2, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
    ]);
  });

  test("win gives 3 points, loss none, goals tallied", () => {
    const table = computeGroupTable([1, 2], [m(1, 2, 2, 0)]);
    expect(table[0]).toEqual({
      teamId: 1, played: 1, won: 1, drawn: 0, lost: 0, gf: 2, ga: 0, gd: 2, points: 3,
    });
    expect(table[1]).toEqual({
      teamId: 2, played: 1, won: 0, drawn: 0, lost: 1, gf: 0, ga: 2, gd: -2, points: 0,
    });
  });

  test("draw gives a point each", () => {
    const table = computeGroupTable([1, 2], [m(1, 2, 1, 1)]);
    expect(table[0].points).toBe(1);
    expect(table[1].points).toBe(1);
    expect(table[0].drawn).toBe(1);
  });

  test("sorts by points, then goal difference, then goals for", () => {
    // team 3 beats 4 by 5; team 1 beats 2 by 1 → 3 tops on GD
    const table = computeGroupTable(
      [1, 2, 3, 4],
      [m(1, 2, 1, 0), m(3, 4, 5, 0)],
    );
    expect(table.map((r) => r.teamId)).toEqual([3, 1, 2, 4]);
  });

  test("unfinished matches are ignored", () => {
    const table = computeGroupTable([1, 2], [m(1, 2, null, null), m(2, 1, 1, 0)]);
    expect(table[0].teamId).toBe(2);
    expect(table[0].points).toBe(3);
    expect(table[0].played).toBe(1);
  });
});
