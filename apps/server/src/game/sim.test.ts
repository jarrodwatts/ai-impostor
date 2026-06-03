import { describe, expect, it } from "vitest";
import { conservationHolds, type SettlementReveal } from "@ai-impostor/shared";
import { Game, BUY_IN_WEI, type GameEmitter, type SeatSpec } from "./Game.js";
import type { BuiltSettlement } from "../settlement/settle.js";
import { ManualScheduler } from "../ai/AgentRunner.js";
import { FakeLlmClient } from "../ai/llm.js";
import { createInMemoryRepositories } from "../persistence/memory.js";
import type { ServerEvent } from "@ai-impostor/shared";

/**
 * Headless full-game simulation (plans.md M3 acceptance). Runs a 10-seat game
 * to completion with the deterministic FakeLlmClient + in-memory deps + a
 * virtual-clock ManualScheduler, asserting it produces a valid OnchainSettlement
 * whose conservation holds (payouts + house == startPool).
 *
 * The ManualScheduler fires timers in virtual-time order so votes land before
 * resolve, and `advanceAll` is bounded so a stuck game fails loudly rather than
 * hanging.
 */

function buildSeats(humans: number, ai: number): SeatSpec[] {
  const seats: SeatSpec[] = [];
  for (let i = 0; i < humans; i++) {
    seats.push({
      seatId: `seat-h${i}`,
      isAI: false,
      funderAddress: `0x${(i + 1).toString(16).padStart(40, "0")}`,
    });
  }
  for (let i = 0; i < ai; i++) {
    seats.push({ seatId: `seat-ai${i}`, isAI: true, funderAddress: null });
  }
  return seats;
}

interface Capture {
  events: ServerEvent[];
  settlement: BuiltSettlement | null;
}

function makeGame(humans: number, ai: number, seed: number) {
  const capture: Capture = { events: [], settlement: null };
  const emitter: GameEmitter = {
    broadcast: (ev) => capture.events.push(ev),
    toSeat: (_seatId, ev) => capture.events.push(ev),
    onSettlement: (built) => {
      capture.settlement = built;
    },
  };
  const scheduler = new ManualScheduler();
  const game = new Game(
    `g-sim-${seed}`,
    BigInt(seed),
    buildSeats(humans, ai),
    {
      repos: createInMemoryRepositories(),
      llm: new FakeLlmClient(),
      emitter,
      scheduler,
      seed,
    },
  );
  return { game, capture, scheduler };
}

/** Run a game to COMPLETE/ABORTED by draining the virtual clock. */
async function runToCompletion(
  game: Game,
  scheduler: ManualScheduler,
): Promise<void> {
  await game.start();
  await scheduler.advanceAll();
}

describe("headless full-game simulation", () => {
  it("runs a 6h/4ai game to completion with a conserving settlement", async () => {
    const { game, capture, scheduler } = makeGame(6, 4, 7);
    await runToCompletion(game, scheduler);

    expect(["COMPLETE"]).toContain(game.state.phase);
    expect(game.state.outcome === "HUMAN_WIN" || game.state.outcome === "AI_WIN").toBe(true);

    const built = capture.settlement;
    expect(built).not.toBeNull();
    const onchain = built!.onchain;

    // Conservation: payouts + house == startPool (the escrowed amount).
    expect(conservationHolds(onchain, game.state.startPool)).toBe(true);
    const paid = onchain.payouts.reduce((a, b) => a + b, 0n);
    expect(paid + onchain.houseAmount).toBe(game.state.startPool);

    // startPool = humans * buyIn.
    expect(game.state.startPool).toBe(6n * BUY_IN_WEI);

    // survivors/payouts are parallel arrays.
    expect(onchain.survivors.length).toBe(onchain.payouts.length);

    // A settlement event was broadcast with a reveal payload.
    const settleEv = capture.events.find((e) => e.t === "settlement");
    expect(settleEv).toBeTruthy();
    const reveal = (settleEv as Extract<ServerEvent, { t: "settlement" }>).payload as SettlementReveal;
    expect(reveal.aiReveal.length).toBe(4); // 4 AI revealed at settlement
    expect(reveal.roster.length).toBe(10);
  });

  it("AI_WIN sends 100% of the pool to the house (no payouts)", async () => {
    // With the deterministic fake the bloc converges; many seeds resolve as
    // AI_WIN. Search a few seeds for one.
    let found = false;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { game, capture, scheduler } = makeGame(6, 4, seed);
      await runToCompletion(game, scheduler);
      if (game.state.outcome === "AI_WIN") {
        found = true;
        const onchain = capture.settlement!.onchain;
        expect(onchain.survivors.length).toBe(0);
        expect(onchain.payouts.length).toBe(0);
        // House holds the entire escrowed pool (conservation).
        expect(onchain.houseAmount).toBe(game.state.startPool);
        expect(conservationHolds(onchain, game.state.startPool)).toBe(true);
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("never broadcasts vote tallies or absolute MON mid-game", async () => {
    const { game, capture, scheduler } = makeGame(7, 3, 11);
    await runToCompletion(game, scheduler);
    // The only event that may carry absolute MON / AI reveal is `settlement`.
    for (const ev of capture.events) {
      if (ev.t === "settlement") continue;
      const json = JSON.stringify(ev);
      expect(json).not.toMatch(/aiCount|humanCount|tally|"isAI"/);
      // round_resolved carries potHealthPct (a %), never a wei pool.
      if (ev.t === "round_resolved") {
        expect(ev.potHealthPct).toBeGreaterThanOrEqual(0);
        expect(ev.potHealthPct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("a 9h/1ai game also completes and conserves", async () => {
    const { game, capture, scheduler } = makeGame(9, 1, 21);
    await runToCompletion(game, scheduler);
    expect(game.state.phase).toBe("COMPLETE");
    expect(game.state.startPool).toBe(9n * BUY_IN_WEI);
    expect(conservationHolds(capture.settlement!.onchain, game.state.startPool)).toBe(true);
  });
});
