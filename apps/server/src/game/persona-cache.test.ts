import { describe, expect, it } from "vitest";
import { Game, BUY_IN_WEI, type GameEmitter, type SeatSpec } from "./Game.js";
import { ManualScheduler } from "../ai/AgentRunner.js";
import { FakeLlmClient } from "../ai/llm.js";
import { createInMemoryRepositories } from "../persistence/memory.js";
import { DEMO_PERSONAS } from "../ai/persona.js";

/**
 * Regression: in guest-demo mode every AI seat is assigned a key from
 * DEMO_PERSONAS (e.g. `demo-foodie`). The systemPrefixFor() prefix cache was
 * built from PERSONAS only, so the demo keys silently fell back to a single
 * generic style ("Blend in naturally."), collapsing every AI agent to the same
 * voice. Symptom in production: every AI seat posted near-identical chat lines.
 *
 * This test pins the fix: in demo mode the cached system prefixes of distinct
 * AI seats MUST contain their distinct persona styles, not the fallback.
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

function makeDemoGame() {
  const emitter: GameEmitter = {
    broadcast: () => {},
    toSeat: () => {},
  };
  const scheduler = new ManualScheduler();
  return new Game(
    "g-demo-personas",
    1n,
    buildSeats(2, 4),
    {
      repos: createInMemoryRepositories(),
      llm: new FakeLlmClient(),
      emitter,
      scheduler,
      seed: 1,
      buyInWei: BUY_IN_WEI,
      demo: true,
    },
  );
}

describe("demo persona style cache (regression)", () => {
  it("includes every DEMO_PERSONAS style in AI system prefixes", () => {
    const game = makeDemoGame();
    const aiSeatIds = [...game.state.seats.values()]
      .filter((s) => s.isAI)
      .map((s) => s.seatId);
    expect(aiSeatIds.length).toBe(4);

    const prefixes = aiSeatIds.map((id) => game.systemPrefixFor(id));

    // The fallback string MUST NOT appear when a persona key was assigned.
    for (const p of prefixes) {
      expect(p).not.toContain("Your persona: Blend in naturally.");
    }

    // Each AI seat's prefix must contain its assigned DEMO_PERSONAS style — the
    // styles are intentionally distinct so the LLM produces distinct voices.
    for (const id of aiSeatIds) {
      const personaKey = game.state.seats.get(id)!.personaKey;
      expect(personaKey).toBeTruthy();
      const persona = DEMO_PERSONAS.find((p) => p.key === personaKey)!;
      expect(persona).toBeTruthy();
      expect(game.systemPrefixFor(id)).toContain(persona.style);
    }

    // And at least two distinct persona styles end up assigned across the 4
    // AI seats (sanity: assignment isn't accidentally collapsing).
    const distinctStyles = new Set(
      aiSeatIds.map((id) => {
        const key = game.state.seats.get(id)!.personaKey!;
        return DEMO_PERSONAS.find((p) => p.key === key)!.style;
      }),
    );
    expect(distinctStyles.size).toBeGreaterThanOrEqual(2);
  });
});
