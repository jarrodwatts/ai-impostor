import { describe, expect, it, beforeEach } from "vitest";
import type { ServerEvent } from "@ai-impostor/shared";
import { DemoLobby, type LobbyHost } from "./demoLobby.js";
import { FakeChainService } from "../chain/ChainService.js";
import { config } from "../config.js";
import type { SeatSpec } from "../game/Game.js";
import type { Scheduler } from "../ai/AgentRunner.js";

/**
 * Unit tests for the on-chain demo lobby. Uses the FakeChainService (seeded
 * deposits) + a recording LobbyHost + an immediate scheduler so the countdown
 * fires synchronously. Asserts the core gate: a human is only seated once their
 * escrow deposit covers the buy-in, and the game launches with humans funding
 * the pool while AI fill the remaining seats.
 */

/** Scheduler that runs timeouts immediately and resolves sleeps at once. */
class ImmediateScheduler implements Scheduler {
  setTimeout(fn: () => void, _ms: number): { cancel(): void } {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fn();
    });
    return { cancel: () => (cancelled = true) };
  }
  sleep(_ms: number): Promise<void> {
    return Promise.resolve();
  }
}

interface Launch {
  gameId: string;
  gameIdNum: bigint;
  seatSpecs: SeatSpec[];
  humanConnBySeat: Map<string, string>;
}

class RecordingHost implements LobbyHost {
  events = new Map<string, ServerEvent[]>();
  launches: Launch[] = [];
  busy = false;
  atCapacity(): boolean { return this.busy; }
  sendToConn(connId: string, ev: ServerEvent): void {
    const list = this.events.get(connId) ?? [];
    list.push(ev);
    this.events.set(connId, list);
  }
  async startGame(
    gameId: string,
    gameIdNum: bigint,
    seatSpecs: SeatSpec[],
    humanConnBySeat: Map<string, string>,
  ): Promise<void> {
    this.launches.push({ gameId, gameIdNum, seatSpecs, humanConnBySeat });
  }
  last(connId: string): ServerEvent | undefined {
    const list = this.events.get(connId);
    return list?.[list.length - 1];
  }
}

const A1 = "0x1111111111111111111111111111111111111111";
const A2 = "0x2222222222222222222222222222222222222222";

describe("DemoLobby", () => {
  let chain: FakeChainService;
  let host: RecordingHost;
  let lobby: DemoLobby;

  beforeEach(async () => {
    chain = new FakeChainService("0x25c4966C497F5E633a110314Dc284942C284ebc1");
    host = new RecordingHost();
    lobby = new DemoLobby(chain, host, new ImmediateScheduler());
    await lobby.init();
  });

  it("replies lobby_open on request_join with escrow + buy-in", async () => {
    await lobby.requestJoin("c1", A1);
    const ev = host.last("c1");
    expect(ev?.t).toBe("lobby_open");
    if (ev?.t === "lobby_open") {
      expect(ev.escrowAddress).toBe("0x25c4966C497F5E633a110314Dc284942C284ebc1");
      expect(ev.buyInWei).toBe(config.BUY_IN_WEI.toString());
      expect(ev.minHumans).toBe(config.MIN_HUMANS);
      expect(ev.humansSeated).toBe(0);
      expect(ev.gameId).toBe(lobby.currentGameId()!.toString());
    }
  });

  it("rejects confirm_payment when no deposit is found", async () => {
    const gid = lobby.currentGameId()!.toString();
    await lobby.confirmPayment("c1", gid, A1, "0xtx");
    const ev = host.last("c1");
    expect(ev?.t).toBe("join_rejected");
    if (ev?.t === "join_rejected") expect(ev.reason).toBe("payment_not_found");
  });

  it("seats a human once their escrow deposit covers the buy-in", async () => {
    const gameId = lobby.currentGameId()!;
    chain.seedDeposit(gameId, A1, config.BUY_IN_WEI);
    await lobby.confirmPayment("c1", gameId.toString(), A1, "0xtx");
    const ev = host.last("c1");
    expect(ev?.t).toBe("lobby_open");
    if (ev?.t === "lobby_open") expect(ev.humansSeated).toBe(1);
  });

  it("rejects a stale gameId and a duplicate address", async () => {
    const gameId = lobby.currentGameId()!;
    chain.seedDeposit(gameId, A1, config.BUY_IN_WEI);
    await lobby.confirmPayment("c1", "999", A1, "0xtx");
    expect(host.last("c1")?.t).toBe("join_rejected");

    await lobby.confirmPayment("c1", gameId.toString(), A1, "0xtx"); // seats
    await lobby.confirmPayment("c2", gameId.toString(), A1, "0xtx"); // dup addr
    const ev = host.last("c2");
    expect(ev?.t).toBe("join_rejected");
    if (ev?.t === "join_rejected") expect(ev.reason).toBe("already_seated");
  });

  it("launches the game at MIN_HUMANS: humans fund, AI fill remaining seats", async () => {
    const gameId = lobby.currentGameId()!;
    chain.seedDeposit(gameId, A1, config.BUY_IN_WEI);
    chain.seedDeposit(gameId, A2, config.BUY_IN_WEI);
    await lobby.confirmPayment("c1", gameId.toString(), A1, "0xtx");
    await lobby.confirmPayment("c2", gameId.toString(), A2, "0xtx");
    // Countdown timer fires via the immediate scheduler microtask.
    await new Promise((r) => setTimeout(r, 0));

    expect(host.launches.length).toBe(1);
    const l = host.launches[0]!;
    expect(l.gameIdNum).toBe(gameId);
    const humans = l.seatSpecs.filter((s) => !s.isAI);
    const ai = l.seatSpecs.filter((s) => s.isAI);
    expect(humans.length).toBe(2);
    expect(ai.length).toBe(config.SEATS - 2);
    expect(humans.every((s) => s.funderAddress !== null)).toBe(true);
    expect(ai.every((s) => s.funderAddress === null)).toBe(true);
    // A fresh lobby opened for the next round.
    expect(lobby.currentGameId()).not.toBe(gameId);
  });
});
