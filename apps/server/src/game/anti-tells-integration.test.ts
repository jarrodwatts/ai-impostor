import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@ai-impostor/shared";
import { Game, BUY_IN_WEI, type GameEmitter, type SeatSpec } from "./Game.js";
import { ManualScheduler } from "../ai/AgentRunner.js";
import { FakeLlmClient } from "../ai/llm.js";
import { createInMemoryRepositories } from "../persistence/memory.js";

/**
 * Integration test: an AI message containing em dashes, semicolons, smart
 * quotes, and an "However," opener must be sanitized BEFORE it hits the wire.
 * Pins the postAiMessage → stripAiTells → filterMessage → emitChat pipeline.
 *
 * Also asserts that humans are NOT sanitized (the sanitizer is AI-only).
 */

function seats(humans: number, ai: number): SeatSpec[] {
  const out: SeatSpec[] = [];
  for (let i = 0; i < humans; i++) {
    out.push({
      seatId: `seat-h${i}`,
      isAI: false,
      funderAddress: `0x${(i + 1).toString(16).padStart(40, "0")}`,
    });
  }
  for (let i = 0; i < ai; i++) {
    out.push({ seatId: `seat-ai${i}`, isAI: true, funderAddress: null });
  }
  return out;
}

function makeGame() {
  const events: ServerEvent[] = [];
  const emitter: GameEmitter = {
    broadcast: (ev) => events.push(ev),
    toSeat: () => {},
  };
  const game = new Game("g-tells", 1n, seats(2, 1), {
    repos: createInMemoryRepositories(),
    llm: new FakeLlmClient(),
    emitter,
    scheduler: new ManualScheduler(),
    seed: 1,
    buyInWei: BUY_IN_WEI,
  });
  // Force the game into ROUND_DISCUSSION without scheduling timers (the
  // ManualScheduler would have to be drained otherwise).
  game.state.phase = "ROUND_DISCUSSION";
  game.state.round = 1;
  return { game, events };
}

function chatEvents(events: ServerEvent[]) {
  return events.filter(
    (e): e is Extract<ServerEvent, { t: "chat_message" }> =>
      e.t === "chat_message",
  );
}

describe("postAiMessage anti-tell sanitization", () => {
  it("strips em dashes, semicolons, smart quotes, and essay openers before broadcast", () => {
    const { game, events } = makeGame();
    game.postAiMessage(
      "seat-ai0",
      "However, that\u2019s mid\u2014cope; ngmi",
    );
    const chats = chatEvents(events);
    expect(chats.length).toBe(1);
    const text = chats[0]!.text;
    // No em dash, no semicolon, no smart quote, no "However," opener.
    expect(text).not.toMatch(/\u2014/);
    expect(text).not.toMatch(/\u2019/);
    expect(text).not.toMatch(/;/);
    expect(text.toLowerCase()).not.toMatch(/^however[,.\s]/);
    // The substantive content survives.
    expect(text.toLowerCase()).toContain("mid");
    expect(text.toLowerCase()).toContain("cope");
    expect(text.toLowerCase()).toContain("ngmi");
  });

  it("does NOT sanitize human chat (filterMessage only — humans keep their punctuation)", () => {
    const { game, events } = makeGame();
    // handleChatMessage is the human path; postAiMessage is the AI path.
    game.handleChatMessage("seat-h0", "msg-1", "lol — fair point; ngl");
    const chats = chatEvents(events);
    expect(chats.length).toBe(1);
    // Human path runs filterMessage only — punctuation survives intact.
    expect(chats[0]!.text).toBe("lol — fair point; ngl");
  });

  it("an all-em-dash AI message is dropped after sanitization", () => {
    const { game, events } = makeGame();
    game.postAiMessage("seat-ai0", "\u2014\u2014\u2014");
    // After stripping em dashes the message collapses to whitespace and is
    // dropped by the empty-trim guard in postAiMessage. No chat emitted.
    expect(chatEvents(events).length).toBe(0);
  });
});
