import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { ServerEvent, SettlementReveal } from "@ai-impostor/shared";
import { Gateway } from "../ws/gateway.js";
import { ManualScheduler } from "../ai/AgentRunner.js";
import { FakeLlmClient } from "../ai/llm.js";
import { createInMemoryRepositories } from "../persistence/memory.js";

/**
 * GUEST DEMO end-to-end: two real WS guest clients connect, both are seated
 * IMMEDIATELY (no chain), the rolling countdown launches an AI-backfilled
 * single-round game, and the round runs to a `settlement` reveal carrying the
 * who-was-who payload (no money). Timers are driven by a ManualScheduler so the
 * 10s/90s/18s phases fire on demand — no real wall-clock wait.
 */

const PORT = 8123;

function connect(): Promise<{ ws: WebSocket; events: ServerEvent[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const events: ServerEvent[] = [];
    ws.on("message", (d) => {
      try {
        events.push(JSON.parse(d.toString()) as ServerEvent);
      } catch {
        // ignore
      }
    });
    ws.on("open", () => resolve({ ws, events }));
    ws.on("error", reject);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("guest demo e2e", () => {
  let gateway: Gateway | null = null;

  afterEach(() => {
    gateway?.close();
    gateway = null;
  });

  it("seats two guests, backfills AI, runs one round to a money-free reveal", async () => {
    const scheduler = new ManualScheduler();
    gateway = new Gateway({
      port: PORT,
      repos: createInMemoryRepositories(),
      llm: new FakeLlmClient(),
      demo: true,
      scheduler,
    });
    gateway.listen();

    const a = await connect();
    const b = await connect();

    // Both guests request to join — seated immediately (no chain handshake).
    a.ws.send(JSON.stringify({ t: "request_join", address: "guest" }));
    b.ws.send(JSON.stringify({ t: "request_join", address: "guest" }));

    // Let the inbound frames + lobby callbacks flush.
    await sleep(50);

    // Both received a lobby_open with a rolling countdown set.
    const aLobby = a.events.find((e) => e.t === "lobby_open");
    const bLobby = b.events.find((e) => e.t === "lobby_open");
    expect(aLobby?.t).toBe("lobby_open");
    expect(bLobby?.t).toBe("lobby_open");
    if (aLobby?.t === "lobby_open") {
      expect(aLobby.escrowAddress).toBe(""); // no chain
      expect(aLobby.buyInWei).toBe("0"); // no money
      expect(aLobby.countdownEndsAt).toBeTruthy(); // rolling countdown started
    }

    // Drive every scheduled timer (countdown → launch → 90s round → 18s vote →
    // resolve → reveal) to completion in virtual time. The launch + game.start()
    // chain is async (awaits repo writes before scheduling the next phase), so
    // re-drain after letting those promises flush until the reveal lands.
    for (let i = 0; i < 10; i++) {
      await scheduler.advanceAll();
      await sleep(20);
      if (a.events.some((e) => e.t === "settlement")) break;
    }
    await sleep(20);

    // game_started reached both humans.
    const aStarted = a.events.find((e) => e.t === "game_started");
    expect(aStarted?.t).toBe("game_started");
    if (aStarted?.t === "game_started") {
      expect(aStarted.roster.length).toBe(10); // backfilled to a full 10 seats
    }

    // A money-free settlement reveal was broadcast.
    const settle = a.events.find((e) => e.t === "settlement");
    expect(settle?.t).toBe("settlement");
    if (settle?.t === "settlement") {
      const payload = settle.payload as SettlementReveal & {
        eliminatedSeatIds: string[];
      };
      expect(payload.roster.length).toBe(10);
      // Who-was-who: every seat carries wasAI + survived.
      expect(payload.roster.every((s) => typeof s.wasAI === "boolean")).toBe(true);
      expect(payload.roster.every((s) => typeof s.survived === "boolean")).toBe(true);
      // 8 AI backfilled 10 - 2 humans.
      expect(payload.aiReveal.length).toBe(8);
      // No money anywhere.
      expect(payload.pool).toEqual({
        buyIn: "0",
        startPool: "0",
        houseTake: "0",
        finalPool: "0",
      });
      expect(payload.myPayout).toBeNull();
      expect(payload.txHash).toBeNull();
      expect(Array.isArray(payload.eliminatedSeatIds)).toBe(true);
    }

    a.ws.close();
    b.ws.close();
  });
});
