import { describe, expect, it } from "vitest";
import { resolveRound, tallyVotes, type ResolverSeat } from "./resolution.js";

/**
 * Exhaustive resolution coverage (HARD invariant §4 / SPEC §2,§4):
 * win/tie/penalty/waiver combinations, including:
 *   - human win clears the last AI (penalty waived even on a mixed tie)
 *   - AI win at parity (AI >= humans)
 *   - ties eliminating multiple, incl. mixed AI+human (win-check first, then
 *     penalty waiver)
 *   - misvote 10% applied and compounded across rounds
 *   - AI vote-out = no penalty
 */

const PENALTY = 10;
const POOL = 1000n; // round wei numbers for easy assertions

function seat(seatId: string, isAI: boolean, alive = true): ResolverSeat {
  return { seatId, isAI, alive };
}

function votesFor(...pairs: [string, string][]): Map<string, string> {
  return new Map(pairs);
}

describe("tallyVotes", () => {
  it("eliminates the single highest", () => {
    const alive = new Set(["a", "b", "c"]);
    const v = votesFor(["a", "b"], ["c", "b"], ["b", "a"]);
    expect(tallyVotes(v, alive)).toEqual(["b"]);
  });

  it("ties eliminate ALL tied players (sorted)", () => {
    const alive = new Set(["a", "b", "c"]);
    const v = votesFor(["a", "b"], ["c", "a"]); // a:1, b:1
    expect(tallyVotes(v, alive)).toEqual(["a", "b"]);
  });

  it("ignores votes for dead/invalid targets", () => {
    const alive = new Set(["a", "b"]);
    const v = votesFor(["a", "zzz"], ["b", "a"]);
    expect(tallyVotes(v, alive)).toEqual(["a"]);
  });

  it("eliminates nobody when there are no valid votes", () => {
    const alive = new Set(["a", "b"]);
    expect(tallyVotes(new Map(), alive)).toEqual([]);
    expect(tallyVotes(votesFor(["a", "dead"]), alive)).toEqual([]);
  });
});

describe("resolveRound — win checks (FIRST)", () => {
  it("HUMAN_WIN when the last AI is voted out", () => {
    const seats = [seat("h1", false), seat("h2", false), seat("ai", true)];
    const v = votesFor(["h1", "ai"], ["h2", "ai"], ["ai", "h1"]);
    const r = resolveRound({ seats, votes: v, pool: POOL, houseWei: 0n, penaltyPct: PENALTY });
    expect(r.eliminatedSeatIds).toEqual(["ai"]);
    expect(r.gameOver).toBe(true);
    expect(r.outcome).toBe("HUMAN_WIN");
    expect(r.aliveAI).toBe(0);
    // No human eliminated → no penalty.
    expect(r.penaltyApplied).toBe(false);
    expect(r.pool).toBe(POOL);
  });

  it("AI_WIN at parity (AI == humans after removal)", () => {
    // 3 humans, 2 AI. Vote out one human → 2 humans, 2 AI = parity = AI win.
    const seats = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("ai1", true),
      seat("ai2", true),
    ];
    const v = votesFor(
      ["ai1", "h1"],
      ["ai2", "h1"],
      ["h2", "h1"], // bloc + a misvote lands on h1
      ["h1", "ai1"],
      ["h3", "ai1"],
    );
    const r = resolveRound({ seats, votes: v, pool: POOL, houseWei: 0n, penaltyPct: PENALTY });
    expect(r.eliminatedSeatIds).toEqual(["h1"]);
    expect(r.aliveHumans).toBe(2);
    expect(r.aliveAI).toBe(2);
    expect(r.gameOver).toBe(true);
    expect(r.outcome).toBe("AI_WIN");
    // Human eliminated, NOT a human win → penalty applies.
    expect(r.penaltyApplied).toBe(true);
    expect(r.pool).toBe(POOL - (POOL * 10n) / 100n);
    expect(r.houseDelta).toBe((POOL * 10n) / 100n);
  });

  it("AI_WIN when AI strictly exceed humans", () => {
    // 2 humans, 1 AI; vote out a human → 1 human, 1 AI = parity AI win.
    const seats = [seat("h1", false), seat("h2", false), seat("ai", true)];
    const v = votesFor(["ai", "h1"], ["h2", "h1"], ["h1", "ai"]);
    const r = resolveRound({ seats, votes: v, pool: POOL, houseWei: 0n, penaltyPct: PENALTY });
    expect(r.outcome).toBe("AI_WIN");
    expect(r.aliveHumans).toBe(1);
    expect(r.aliveAI).toBe(1);
  });
});

describe("resolveRound — ties, mixed AI+human, win-check-first + waiver", () => {
  it("mixed tie that ends in HUMAN_WIN waives the penalty", () => {
    // 2 humans, 1 AI. Tie eliminates {ai, h1}. After: 1 human, 0 AI → HUMAN_WIN.
    // A human (h1) was eliminated, but the round ended in a human win → waived.
    const seats = [seat("h1", false), seat("h2", false), seat("ai", true)];
    const v = votesFor(["h1", "ai"], ["h2", "h1"], ["ai", "h1"]); // ai:1, h1:2... adjust
    // Make a real tie: ai:2, h1:2
    const tie = votesFor(["h2", "ai"], ["x1", "ai"], ["x2", "h1"], ["x3", "h1"]);
    // need voters to exist & be alive; simplify with explicit map:
    void v;
    const seats2 = [
      seat("h1", false),
      seat("h2", false),
      seat("ai", true),
    ];
    // voters: h1->ai, h2->ai (ai:2); ai->h1 (h1:1)... that's not a tie.
    // Construct tie ai:2, h1:2 using 4 living voters — add helpers as dead? no.
    // Use a 4-living-seat setup instead:
    const seats3 = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("ai", true),
    ];
    const v3 = votesFor(
      ["h2", "ai"],
      ["h3", "ai"], // ai:2
      ["h1", "ai"], // ai:3 actually
    );
    void seats2;
    void tie;
    void seats3;
    void v3;

    // Cleanest explicit tie: 4 living seats, ai:2 and h1:2.
    const fseats = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("ai", true),
    ];
    const fv = votesFor(
      ["h2", "ai"],
      ["h3", "ai"], // ai: 2
      ["h1", "h1"], // self-ish? h1 votes h1 — counts toward h1
      ["ai", "h1"], // h1: 2
    );
    const r = resolveRound({
      seats: fseats,
      votes: fv,
      pool: POOL,
      houseWei: 0n,
      penaltyPct: PENALTY,
    });
    expect(r.eliminatedSeatIds).toEqual(["ai", "h1"]); // tie, sorted
    expect(r.humanEliminated).toBe(true);
    expect(r.aliveAI).toBe(0);
    expect(r.outcome).toBe("HUMAN_WIN");
    // Waived because the round ended in a human win.
    expect(r.penaltyApplied).toBe(false);
    expect(r.pool).toBe(POOL);
  });

  it("mixed tie that does NOT end the game applies the penalty once (flat)", () => {
    // 5 humans, 2 AI. Tie eliminates {ai1, h1}. After: 4 humans, 1 AI → ongoing.
    const seats = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("h4", false),
      seat("h5", false),
      seat("ai1", true),
      seat("ai2", true),
    ];
    // ai1: 2 votes, h1: 2 votes (tie). Others scattered (won't reach 2).
    const v = votesFor(
      ["h2", "ai1"],
      ["h3", "ai1"], // ai1:2
      ["ai1", "h1"],
      ["ai2", "h1"], // h1:2
      ["h1", "h4"],
      ["h4", "h5"],
      ["h5", "h2"],
    );
    const r = resolveRound({ seats, votes: v, pool: POOL, houseWei: 0n, penaltyPct: PENALTY });
    expect(r.eliminatedSeatIds).toEqual(["ai1", "h1"]);
    expect(r.gameOver).toBe(false);
    expect(r.aliveHumans).toBe(4);
    expect(r.aliveAI).toBe(1);
    // One human out, game continues → single flat 10% (not 20% for two-out tie).
    expect(r.penaltyApplied).toBe(true);
    expect(r.pool).toBe(POOL - (POOL * 10n) / 100n);
  });
});

describe("resolveRound — AI vote-out costs the pool nothing", () => {
  it("voting out an AI applies NO penalty", () => {
    const seats = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("ai1", true),
      seat("ai2", true),
    ];
    const v = votesFor(
      ["h1", "ai1"],
      ["h2", "ai1"],
      ["h3", "ai1"], // ai1 out
      ["ai1", "h1"],
      ["ai2", "h2"],
    );
    const r = resolveRound({ seats, votes: v, pool: POOL, houseWei: 0n, penaltyPct: PENALTY });
    expect(r.eliminatedSeatIds).toEqual(["ai1"]);
    expect(r.humanEliminated).toBe(false);
    expect(r.penaltyApplied).toBe(false);
    expect(r.pool).toBe(POOL);
    expect(r.gameOver).toBe(false); // 3 humans, 1 AI still ongoing
  });
});

describe("resolveRound — penalty compounds across rounds", () => {
  it("two misvote rounds compound multiplicatively", () => {
    // Round 1: human eliminated, game continues. Pool 1000 → 900.
    const seatsR1 = [
      seat("h1", false),
      seat("h2", false),
      seat("h3", false),
      seat("h4", false),
      seat("h5", false),
      seat("ai1", true),
      seat("ai2", true),
    ];
    const v1 = votesFor(
      ["ai1", "h1"],
      ["ai2", "h1"],
      ["h2", "h1"], // h1 out (3 votes)
      ["h3", "ai1"],
      ["h4", "ai1"], // ai1: 2, not enough
      ["h5", "h2"],
      ["h1", "ai2"],
    );
    const r1 = resolveRound({ seats: seatsR1, votes: v1, pool: 1000n, houseWei: 0n, penaltyPct: PENALTY });
    expect(r1.eliminatedSeatIds).toEqual(["h1"]);
    expect(r1.gameOver).toBe(false);
    expect(r1.pool).toBe(900n);
    expect(r1.houseWei).toBe(100n);

    // Round 2: another human eliminated, still ongoing. 900 → 810.
    const seatsR2 = [
      seat("h2", false),
      seat("h3", false),
      seat("h4", false),
      seat("h5", false),
      seat("ai1", true),
      seat("ai2", true),
    ];
    const v2 = votesFor(
      ["ai1", "h2"],
      ["ai2", "h2"],
      ["h3", "h2"], // h2 out
      ["h4", "ai1"],
      ["h5", "ai2"],
      ["h2", "ai1"],
    );
    const r2 = resolveRound({ seats: seatsR2, votes: v2, pool: r1.pool, houseWei: r1.houseWei, penaltyPct: PENALTY });
    expect(r2.eliminatedSeatIds).toEqual(["h2"]);
    // parity check: after removing h2 → 2 humans (h4,h5,h3 minus none... h3 alive) — recount
    // remaining humans: h3,h4,h5 = 3, AI: ai1,ai2 = 2 → ongoing
    expect(r2.gameOver).toBe(false);
    expect(r2.pool).toBe(810n);
    expect(r2.houseWei).toBe(190n); // 100 + 90
  });
});

describe("resolveRound — degenerate rounds", () => {
  it("no votes → nobody out, no penalty, no win", () => {
    const seats = [seat("h1", false), seat("h2", false), seat("ai", true)];
    const r = resolveRound({ seats, votes: new Map(), pool: POOL, houseWei: 5n, penaltyPct: PENALTY });
    expect(r.eliminatedSeatIds).toEqual([]);
    expect(r.gameOver).toBe(false);
    expect(r.pool).toBe(POOL);
    expect(r.houseWei).toBe(5n);
  });
});
