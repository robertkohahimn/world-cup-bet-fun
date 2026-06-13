import { describe, expect, test } from "vitest";
import { assignThirdSlots, bestEightThirds, parseSlot, type ThirdTeam } from "../src/lib/bracket";

describe("parseSlot", () => {
  test("group winner", () => {
    expect(parseSlot("Winner A")).toEqual({ kind: "groupWinner", group: "A" });
  });
  test("group runner-up", () => {
    expect(parseSlot("Runner-up B")).toEqual({ kind: "groupRunnerUp", group: "B" });
  });
  test("third-place slot with eligible groups", () => {
    expect(parseSlot("3rd place (A/B/C/D/F)")).toEqual({
      kind: "third",
      groups: ["A", "B", "C", "D", "F"],
    });
  });
  test("winner of a prior match", () => {
    expect(parseSlot("Winner M74")).toEqual({ kind: "matchWinner", match: 74 });
  });
  test("loser of a prior match", () => {
    expect(parseSlot("Loser M101")).toEqual({ kind: "matchLoser", match: 101 });
  });
  test("a concrete team name is not a slot", () => {
    expect(parseSlot("Mexico")).toBeNull();
    expect(parseSlot(null)).toBeNull();
  });
});

describe("bestEightThirds", () => {
  const third = (teamId: number, group: string, points: number, gd: number, gf: number): ThirdTeam => ({
    teamId,
    group,
    points,
    gd,
    gf,
  });

  test("takes the best 8 of 12 by points, then GD, then GF", () => {
    // 12 thirds with descending quality by teamId; the four weakest drop out.
    const thirds = Array.from({ length: 12 }, (_, i) =>
      third(i + 1, "ABCDEFGHIJKL"[i], 12 - i, 0, 0),
    );
    const best = bestEightThirds(thirds);
    expect(best).toHaveLength(8);
    expect(best.map((t) => t.teamId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("breaks equal points by goal difference then goals for", () => {
    const thirds = [
      third(1, "A", 3, 0, 1),
      third(2, "B", 3, 2, 2), // best GD
      third(3, "C", 3, 1, 5),
      third(4, "D", 3, 1, 9), // same GD as C, more GF → ahead of C
      third(5, "E", 0, 0, 0),
      third(6, "F", 0, 0, 0),
      third(7, "G", 0, 0, 0),
      third(8, "H", 0, 0, 0),
      third(9, "I", 0, 0, 0),
      third(10, "J", 0, 0, 0),
      third(11, "K", 0, 0, 0),
      third(12, "L", 0, 0, 0),
    ];
    const best = bestEightThirds(thirds);
    // Top four resolved by tiebreakers: B (GD2), D (GD1,GF9), C (GD1,GF5), A (GD0)
    expect(best.slice(0, 4).map((t) => t.teamId)).toEqual([2, 4, 3, 1]);
  });
});

describe("assignThirdSlots", () => {
  test("assigns each slot an eligible qualifier, all distinct", () => {
    // Eight slots, each eligible for a set of groups; eight qualifiers, one per group.
    const slots = [
      { n: 74, groups: ["A", "B", "C", "D", "F"] },
      { n: 77, groups: ["C", "D", "F", "G", "H"] },
      { n: 79, groups: ["C", "E", "F", "H", "I"] },
      { n: 80, groups: ["E", "H", "I", "J", "K"] },
      { n: 81, groups: ["B", "E", "F", "I", "J"] },
      { n: 82, groups: ["A", "E", "H", "I", "J"] },
      { n: 85, groups: ["E", "F", "G", "I", "J"] },
      { n: 87, groups: ["D", "E", "I", "J", "L"] },
    ];
    const qualifiers: ThirdTeam[] = [
      { teamId: 101, group: "A", points: 4, gd: 1, gf: 2 },
      { teamId: 103, group: "C", points: 4, gd: 1, gf: 2 },
      { teamId: 104, group: "D", points: 3, gd: 0, gf: 2 },
      { teamId: 105, group: "E", points: 3, gd: 0, gf: 1 },
      { teamId: 108, group: "H", points: 3, gd: 0, gf: 1 },
      { teamId: 109, group: "I", points: 3, gd: -1, gf: 1 },
      { teamId: 110, group: "J", points: 3, gd: -1, gf: 1 },
      { teamId: 112, group: "L", points: 2, gd: -2, gf: 1 },
    ];
    const assignment = assignThirdSlots(slots, qualifiers);
    expect(assignment).not.toBeNull();
    const byGroup = new Map(qualifiers.map((q) => [q.teamId, q.group]));
    const used = new Set<number>();
    for (const slot of slots) {
      const teamId = assignment!.get(slot.n)!;
      expect(teamId).toBeDefined();
      expect(used.has(teamId)).toBe(false); // distinct
      used.add(teamId);
      expect(slot.groups).toContain(byGroup.get(teamId)); // eligible
    }
    expect(used.size).toBe(8);
  });

  test("returns null when no complete matching exists", () => {
    // Two slots both only eligible for group A, but only one A qualifier.
    const slots = [
      { n: 1, groups: ["A"] },
      { n: 2, groups: ["A"] },
    ];
    const qualifiers: ThirdTeam[] = [{ teamId: 1, group: "A", points: 3, gd: 0, gf: 0 }];
    expect(assignThirdSlots(slots, qualifiers)).toBeNull();
  });
});
