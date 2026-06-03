import type { Outcome } from "@ai-impostor/shared";

/**
 * PURE round resolution — the money/win choke point. No I/O, no clocks, no RNG.
 *
 * Resolution order (HARD invariant, SPEC §2 / standards.md §4):
 *   1. Tally votes → determine eliminated set (ties = ALL tied players out).
 *   2. Remove eliminated players.
 *   3. WIN-CHECK FIRST:
 *        - Human win  ⇔ aliveAI == 0
 *        - AI win     ⇔ aliveAI >= aliveHumans  (parity = AI win)
 *   4. Penalty LAST: flat 10% of the *current* pool for any round in which a
 *      human is eliminated — UNLESS the round ends in a human win (waived), and
 *      never for an AI-only vote-out. Penalty is a single flat cut regardless of
 *      how many humans went out that round.
 *
 * The penalty is applied to the pool *before* this round's cut (i.e. compounds
 * across rounds because the caller feeds the reduced pool back in).
 */

/** Minimal seat view the resolver needs — no codenames/colors/addresses. */
export interface ResolverSeat {
  seatId: string;
  isAI: boolean;
  alive: boolean;
}

export interface ResolveInput {
  /** Living seats entering the resolve (the resolver only looks at alive ones). */
  seats: ResolverSeat[];
  /** voterSeatId -> targetSeatId for THIS round (secret ballot map). */
  votes: Map<string, string>;
  /** Current pool in wei BEFORE this round's penalty. */
  pool: bigint;
  /** House take accumulated so far in wei. */
  houseWei: bigint;
  /** Flat misvote penalty as an integer percent of pool (e.g. 10). */
  penaltyPct: number;
}

export interface ResolveResult {
  /** Seat ids eliminated this round (ties → multiple). NO vote counts. */
  eliminatedSeatIds: string[];
  /** New alive map after removal: seatId -> alive. */
  aliveAfter: Map<string, boolean>;
  /** Living humans after removal. */
  aliveHumans: number;
  /** Living AI after removal. */
  aliveAI: number;
  /** Whether the game is over this round. */
  gameOver: boolean;
  /** Final outcome if the game is over, else null. */
  outcome: Outcome | null;
  /** Whether ≥1 human was eliminated this round. */
  humanEliminated: boolean;
  /** Whether the 10% penalty was applied this round. */
  penaltyApplied: boolean;
  /** Pool in wei AFTER any penalty cut. */
  pool: bigint;
  /** Delta added to house this round (the penalty cut, in wei). */
  houseDelta: bigint;
  /** House take in wei AFTER adding this round's penalty. */
  houseWei: bigint;
}

/**
 * Tally votes and return the eliminated set.
 * - Most votes is eliminated.
 * - Ties: ALL tied (at the max) are eliminated.
 * - Only votes that target a currently-alive seat count.
 * - A round with zero valid votes eliminates nobody.
 */
export function tallyVotes(
  votes: Map<string, string>,
  aliveSeatIds: Set<string>,
): string[] {
  const counts = new Map<string, number>();
  for (const target of votes.values()) {
    if (!aliveSeatIds.has(target)) continue; // ignore votes for dead/invalid seats
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  let max = 0;
  for (const c of counts.values()) if (c > max) max = c;
  if (max === 0) return [];
  const eliminated: string[] = [];
  for (const [seatId, c] of counts) {
    if (c === max) eliminated.push(seatId);
  }
  // Deterministic order for stable broadcasts.
  eliminated.sort();
  return eliminated;
}

/**
 * Resolve one round. Pure. See module header for the exact order.
 */
export function resolveRound(input: ResolveInput): ResolveResult {
  const { seats, votes, pool, houseWei, penaltyPct } = input;

  const aliveBefore = seats.filter((s) => s.alive);
  const aliveIds = new Set(aliveBefore.map((s) => s.seatId));

  // 1. Tally → eliminated set.
  const eliminatedSeatIds = tallyVotes(votes, aliveIds);
  const eliminatedSet = new Set(eliminatedSeatIds);

  // 2. Remove eliminated. Build new alive map.
  const aliveAfter = new Map<string, boolean>();
  let aliveHumans = 0;
  let aliveAI = 0;
  let humanEliminated = false;
  for (const s of seats) {
    const stillAlive = s.alive && !eliminatedSet.has(s.seatId);
    aliveAfter.set(s.seatId, stillAlive);
    if (s.alive && eliminatedSet.has(s.seatId) && !s.isAI) {
      humanEliminated = true;
    }
    if (stillAlive) {
      if (s.isAI) aliveAI++;
      else aliveHumans++;
    }
  }

  // 3. WIN-CHECK FIRST (before penalty).
  let gameOver = false;
  let outcome: Outcome | null = null;
  if (aliveAI === 0) {
    gameOver = true;
    outcome = "HUMAN_WIN";
  } else if (aliveAI >= aliveHumans) {
    // Parity (AI >= humans) is an AI win.
    gameOver = true;
    outcome = "AI_WIN";
  }

  // 4. Penalty LAST. Flat 10% of current pool if a human was eliminated this
  //    round, WAIVED on a human win, never for AI vote-out.
  let newPool = pool;
  let houseDelta = 0n;
  let penaltyApplied = false;
  if (humanEliminated && outcome !== "HUMAN_WIN") {
    // Integer-percent cut of the pool; dust stays in the pool (caller's
    // settlement sends final dust to house). Use bigint floor division.
    const cut = (pool * BigInt(penaltyPct)) / 100n;
    newPool = pool - cut;
    houseDelta = cut;
    penaltyApplied = true;
  }

  return {
    eliminatedSeatIds,
    aliveAfter,
    aliveHumans,
    aliveAI,
    gameOver,
    outcome,
    humanEliminated,
    penaltyApplied,
    pool: newPool,
    houseDelta,
    houseWei: houseWei + houseDelta,
  };
}
