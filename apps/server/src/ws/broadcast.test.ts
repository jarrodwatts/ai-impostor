import { describe, expect, it } from "vitest";
import type { GamePhase } from "@ai-impostor/shared";
import {
  potHealthPct,
  projectStateForRecipient,
  type ProjectedState,
} from "./broadcast.js";
import type { GameState, SeatRecord } from "../game/types.js";

/**
 * Anti-leak property test (HARD invariant §1). For BOTH recipient roles
 * (ALIVE_HUMAN, SPECTATOR) across representative game states, the projected
 * payload must NEVER contain: aiCount/humanCount (or any split), AI identities
 * (isAI), vote tallies, or absolute MON. Pot Health is %-only.
 */

function makeSeat(
  i: number,
  isAI: boolean,
  alive: boolean,
  funder: string | null,
): SeatRecord {
  return {
    seatId: `seat-${i}`,
    codename: `Name${i}`,
    avatarColor: "#836EF9",
    isAI,
    alive,
    funderAddress: funder,
    personaKey: isAI ? "skeptic" : null,
  };
}

function makeGame(phase: GamePhase, opts: {
  humans: number;
  ai: number;
  deadHumans?: number;
  deadAI?: number;
  pool: bigint;
  startPool: bigint;
}): GameState {
  const seats = new Map<string, SeatRecord>();
  const seatOrder: string[] = [];
  let i = 0;
  const addHuman = (alive: boolean) => {
    const s = makeSeat(i, false, alive, `0x${"0".repeat(39)}${(i + 1).toString(16)}`);
    seats.set(s.seatId, s);
    seatOrder.push(s.seatId);
    i++;
  };
  const addAI = (alive: boolean) => {
    const s = makeSeat(i, true, alive, null);
    seats.set(s.seatId, s);
    seatOrder.push(s.seatId);
    i++;
  };
  const deadH = opts.deadHumans ?? 0;
  const deadA = opts.deadAI ?? 0;
  for (let h = 0; h < opts.humans; h++) addHuman(h >= deadH);
  for (let a = 0; a < opts.ai; a++) addAI(a >= deadA);

  // Seed secret votes — these must NOT surface.
  const votes = new Map<number, Map<string, string>>();
  votes.set(1, new Map(seatOrder.map((id, k) => [id, seatOrder[(k + 1) % seatOrder.length]!])));

  return {
    gameId: "g-test",
    gameIdNum: 42n,
    phase,
    round: 2,
    phaseEndsAt: Date.now() + 10_000,
    seats,
    seatOrder,
    votes,
    buyInWei: 1_000_000_000_000_000_000n,
    startPool: opts.startPool,
    pool: opts.pool,
    houseWei: opts.startPool - opts.pool,
    outcome: null,
    seq: 7,
  };
}

const FORBIDDEN_KEYS = [
  "aiCount",
  "humanCount",
  "isAI",
  "votes",
  "voteTally",
  "tally",
  "pool",
  "startPool",
  "buyInWei",
  "houseWei",
  "funderAddress",
  "personaKey",
  "gameIdNum",
];

/** Deep scan for forbidden keys or absolute-MON-looking bigints. */
function scanForLeaks(value: unknown, path = "$"): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, idx) => found.push(...scanForLeaks(v, `${path}[${idx}]`)));
    return found;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(k)) {
        found.push(`${path}.${k}`);
      }
      found.push(...scanForLeaks(v, `${path}.${k}`));
    }
  }
  if (typeof value === "bigint") {
    // No bigint (absolute wei) should ever be in a projection.
    found.push(`${path}<bigint>`);
  }
  return found;
}

const PHASES: GamePhase[] = [
  "ROUND_PROMPT",
  "ROUND_DISCUSSION",
  "CHAT_LOCKED",
  "VOTE_WINDOW",
  "RESOLVE",
];

const SCENARIOS = [
  { humans: 6, ai: 4, pool: 6n, startPool: 6n },
  { humans: 8, ai: 2, pool: 8n, startPool: 8n, deadHumans: 1 },
  { humans: 9, ai: 1, pool: 0n, startPool: 9n, deadHumans: 3, deadAI: 0 },
  { humans: 6, ai: 4, pool: 3n, startPool: 6n, deadHumans: 2, deadAI: 2 },
];

describe("projectStateForRecipient — anti-leak", () => {
  for (const phase of PHASES) {
    for (const scn of SCENARIOS) {
      for (const role of ["ALIVE_HUMAN", "SPECTATOR"] as const) {
        it(`${role} in ${phase} (${scn.humans}h/${scn.ai}ai) leaks nothing`, () => {
          const game = makeGame(phase, scn);
          const seatId = game.seatOrder[0]!;
          const proj = projectStateForRecipient(game, role, seatId);
          const leaks = scanForLeaks(proj);
          expect(leaks).toEqual([]);
        });
      }
    }
  }

  it("roster seats expose only {seatId,codename,avatarColor,alive}", () => {
    const game = makeGame("ROUND_DISCUSSION", { humans: 6, ai: 4, pool: 6n, startPool: 6n });
    const proj = projectStateForRecipient(game, "ALIVE_HUMAN", game.seatOrder[0]!);
    for (const seat of proj.roster) {
      expect(Object.keys(seat).sort()).toEqual(
        ["alive", "avatarColor", "codename", "seatId"].sort(),
      );
      expect((seat as Record<string, unknown>).isAI).toBeUndefined();
    }
  });

  it("never reveals AI count via roster (no isAI to count)", () => {
    const game = makeGame("VOTE_WINDOW", { humans: 6, ai: 4, pool: 6n, startPool: 6n });
    const proj = projectStateForRecipient(game, "SPECTATOR", game.seatOrder[0]!);
    const anyIsAI = proj.roster.some((s) => "isAI" in (s as object));
    expect(anyIsAI).toBe(false);
  });

  it("the ProjectedState type has no field able to hold absolute MON", () => {
    const game = makeGame("ROUND_DISCUSSION", { humans: 7, ai: 3, pool: 5n, startPool: 7n });
    const proj: ProjectedState = projectStateForRecipient(
      game,
      "ALIVE_HUMAN",
      game.seatOrder[0]!,
    );
    // Only numeric field is potHealthPct, bounded 0..100.
    expect(typeof proj.potHealthPct).toBe("number");
    expect(proj.potHealthPct).toBeGreaterThanOrEqual(0);
    expect(proj.potHealthPct).toBeLessThanOrEqual(100);
  });
});

describe("potHealthPct", () => {
  it("starts at 100 and drops 10% per misvote round", () => {
    expect(potHealthPct(100n, 100n)).toBe(100);
    expect(potHealthPct(100n, 90n)).toBe(90);
    expect(potHealthPct(100n, 81n)).toBe(81);
    expect(potHealthPct(100n, 0n)).toBe(0);
  });
  it("is identical regardless of human/AI split (leaks nothing)", () => {
    // 6 humans * B and 9 humans * B both at 90% read the same percent.
    const B = 1_000_000_000_000_000_000n;
    const six = 6n * B;
    const nine = 9n * B;
    expect(potHealthPct(six, (six * 90n) / 100n)).toBe(
      potHealthPct(nine, (nine * 90n) / 100n),
    );
    expect(potHealthPct(six, (six * 90n) / 100n)).toBe(90);
  });
  it("clamps and handles zero start pool", () => {
    expect(potHealthPct(0n, 0n)).toBe(100);
  });
});
