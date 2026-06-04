import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@ai-impostor/shared";
import { Game, BUY_IN_WEI, type GameEmitter, type SeatSpec } from "./Game.js";
import { ManualScheduler } from "../ai/AgentRunner.js";
import { FakeLlmClient } from "../ai/llm.js";
import { createInMemoryRepositories } from "../persistence/memory.js";

/**
 * Regression suite for the "AI seat stuck on `typing…`" bug.
 *
 * Confirmed root causes (see Issue #2 / Claude Code systematic review):
 *   H1  Game.setTyping was gated by `!seat.alive` for both ON and OFF —
 *       eliminated-mid-typing OFFs were silently dropped.
 *   H2  No per-phase invariant: discussion → vote left mid-typing seats hot.
 *   H3  runChatTurn had no try/finally between setTyping(true) and (false).
 *
 * These tests pin the invariants the fixes establish:
 *   1. setTyping(seatId, false) on a !alive seat MUST still broadcast OFF.
 *   2. setTyping(seatId, true)  on a !alive seat MUST still be suppressed.
 *   3. Leaving the discussion phase emits typing:false for every seat (the
 *      "no seat is typing past CHAT_LOCKED" invariant).
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

function captureGame() {
  const events: ServerEvent[] = [];
  const emitter: GameEmitter = {
    broadcast: (ev) => events.push(ev),
    toSeat: () => {},
  };
  const game = new Game("g-typing", 1n, buildSeats(2, 4), {
    repos: createInMemoryRepositories(),
    llm: new FakeLlmClient(),
    emitter,
    scheduler: new ManualScheduler(),
    seed: 1,
    buyInWei: BUY_IN_WEI,
  });
  return { game, events };
}

function typingEventsFor(events: ServerEvent[], seatId: string) {
  return events.filter(
    (e): e is Extract<ServerEvent, { t: "typing" }> =>
      e.t === "typing" && e.seatId === seatId,
  );
}

describe("typing-stuck regressions", () => {
  it("setTyping(false) ALWAYS broadcasts OFF, even for a !alive seat", () => {
    const { game, events } = captureGame();
    const aiId = "seat-ai0";

    // Simulate: AI is typing (ON broadcast goes out, alive).
    game.setTyping(aiId, true);
    expect(typingEventsFor(events, aiId).map((e) => e.isTyping)).toEqual([true]);

    // Seat is eliminated (mirrors what resolution.ts does — flip alive).
    game.state.seats.get(aiId)!.alive = false;

    // Now the AgentRunner's `finally` calls setTyping(false) for the eliminated
    // seat. The OFF MUST still broadcast — otherwise clients are stuck on
    // "typing…" forever.
    game.setTyping(aiId, false);
    expect(typingEventsFor(events, aiId).map((e) => e.isTyping)).toEqual([
      true,
      false,
    ]);
  });

  it("setTyping(true) on a !alive seat is suppressed", () => {
    const { game, events } = captureGame();
    const aiId = "seat-ai0";
    game.state.seats.get(aiId)!.alive = false;

    game.setTyping(aiId, true);
    expect(typingEventsFor(events, aiId)).toEqual([]);
  });

  it("setTyping for an unknown seatId is a no-op (no crash, no broadcast)", () => {
    const { game, events } = captureGame();
    game.setTyping("ghost", false);
    game.setTyping("ghost", true);
    expect(typingEventsFor(events, "ghost")).toEqual([]);
  });

  it("phase exit clears typing for every seat (no seat is typing past CHAT_LOCKED)", async () => {
    const { game, events } = captureGame();

    // Drive the game into discussion so lockChat() will be the next transition.
    await game.start();
    // Force phase to ROUND_DISCUSSION explicitly + flag a seat as typing on the
    // wire (we don't need the AgentRunner to actually fire — we're testing the
    // invariant that lockChat broadcasts OFF for every seat regardless).
    game.state.phase = "ROUND_DISCUSSION";
    const aiId = "seat-ai0";
    game.setTyping(aiId, true); // ON

    // Snapshot the event count, then run lockChat (private; access via cast).
    const before = events.length;
    (game as unknown as { lockChat(round: number): void }).lockChat(
      game.state.round,
    );

    // After lockChat: every seat should have had typing:false broadcast at
    // least once (the safety-net "all typing off" sweep) BEFORE phase_changed.
    const sweep = events.slice(before);
    const phaseChangedIdx = sweep.findIndex((e) => e.t === "phase_changed");
    expect(phaseChangedIdx).toBeGreaterThan(0); // sweep happened before phase change

    const offsBeforePhaseChange = sweep
      .slice(0, phaseChangedIdx)
      .filter((e): e is Extract<ServerEvent, { t: "typing" }> => e.t === "typing");

    const seatsCleared = new Set(offsBeforePhaseChange.map((e) => e.seatId));
    for (const id of game.state.seatOrder) {
      expect(seatsCleared.has(id)).toBe(true);
    }
    expect(offsBeforePhaseChange.every((e) => e.isTyping === false)).toBe(true);
  });
});
