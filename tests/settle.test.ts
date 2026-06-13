import { describe, expect, test } from "vitest";
import { evaluateLine, settleRoomMatch, type Participant } from "../src/lib/settle";

describe("evaluateLine", () => {
  test("favored team covers when margin exceeds spread", () => {
    // Mexico +1, Mexico wins 2-0 → margin 2 > 1 → cover
    expect(evaluateLine(2, 0, 1)).toBe("cover");
  });

  test("push when margin equals an integer spread", () => {
    // Mexico +1, Mexico wins 2-1 → margin 1 === 1 → push
    expect(evaluateLine(2, 1, 1)).toBe("push");
  });

  test("against when favored team wins by less than the spread", () => {
    expect(evaluateLine(2, 1, 1.5)).toBe("against");
  });

  test("against when favored team draws", () => {
    expect(evaluateLine(1, 1, 1)).toBe("against");
  });

  test("against when favored team loses", () => {
    expect(evaluateLine(0, 2, 0.5)).toBe("against");
  });

  test("half spreads can never push", () => {
    expect(evaluateLine(1, 0, 0.5)).toBe("cover");
    expect(evaluateLine(1, 1, 0.5)).toBe("against");
  });

  test("zero spread: any win covers, draw pushes", () => {
    expect(evaluateLine(1, 0, 0)).toBe("cover");
    expect(evaluateLine(0, 0, 0)).toBe("push");
    expect(evaluateLine(0, 1, 0)).toBe("against");
  });
});

describe("settleRoomMatch", () => {
  const p = (userId: number, side: Participant["side"]): Participant => ({ userId, side });

  test("spec example: 4 members, 1 covers and wins, 3 lose → +3 / -1 each", () => {
    const deltas = settleRoomMatch("cover", [
      p(1, "cover"),
      p(2, "against"),
      p(3, "against"),
      p(4, "against"),
    ]);
    expect(deltas).toEqual([
      { userId: 1, delta: 3, result: "win" },
      { userId: 2, delta: -1, result: "loss" },
      { userId: 3, delta: -1, result: "loss" },
      { userId: 4, delta: -1, result: "loss" },
    ]);
  });

  test("members who never bet count as losers and feed the winners' pot", () => {
    const deltas = settleRoomMatch("against", [
      p(1, "against"),
      p(2, "cover"),
      p(3, null),
    ]);
    expect(deltas).toEqual([
      { userId: 1, delta: 2, result: "win" },
      { userId: 2, delta: -1, result: "loss" },
      { userId: 3, delta: -1, result: "loss" },
    ]);
  });

  test("push: bettors get 0, non-bettors still lose 1, nobody collects", () => {
    const deltas = settleRoomMatch("push", [
      p(1, "cover"),
      p(2, "against"),
      p(3, null),
    ]);
    expect(deltas).toEqual([
      { userId: 1, delta: 0, result: "push" },
      { userId: 2, delta: 0, result: "push" },
      { userId: 3, delta: -1, result: "loss" },
    ]);
  });

  test("everyone on the winning side: no losers, winners get +0", () => {
    const deltas = settleRoomMatch("cover", [p(1, "cover"), p(2, "cover")]);
    expect(deltas).toEqual([
      { userId: 1, delta: 0, result: "win" },
      { userId: 2, delta: 0, result: "win" },
    ]);
  });

  test("everyone loses: each -1, no winners", () => {
    const deltas = settleRoomMatch("cover", [p(1, "against"), p(2, null)]);
    expect(deltas).toEqual([
      { userId: 1, delta: -1, result: "loss" },
      { userId: 2, delta: -1, result: "loss" },
    ]);
  });

  test("two winners each get the full loser count", () => {
    const deltas = settleRoomMatch("cover", [
      p(1, "cover"),
      p(2, "cover"),
      p(3, "against"),
      p(4, null),
    ]);
    expect(deltas).toEqual([
      { userId: 1, delta: 2, result: "win" },
      { userId: 2, delta: 2, result: "win" },
      { userId: 3, delta: -1, result: "loss" },
      { userId: 4, delta: -1, result: "loss" },
    ]);
  });

  test("empty room settles to empty deltas", () => {
    expect(settleRoomMatch("cover", [])).toEqual([]);
  });
});
