import type { ServerEvent } from "@ai-impostor/shared";
import { config } from "../config.js";
import type { SeatSpec } from "../game/Game.js";
import type { Scheduler } from "../ai/AgentRunner.js";
import { RealScheduler } from "../ai/AgentRunner.js";
import type { LobbyHost } from "./demoLobby.js";

/**
 * GUEST DEMO lobby — NO chain, NO money, NO wallet.
 *
 * Flow: a guest connects and sends `request_join {address}` (address may be
 * "guest" or anything). They are seated IMMEDIATELY into the current open lobby
 * (no deposit/createGame/lockGame — the ChainService is never involved). When
 * the FIRST human joins a lobby a rolling ~10s countdown starts (we do NOT wait
 * for a min-human count). At countdown end ALL empty seats are filled with AI
 * so the lobby launches FULL at 10 with however many humans showed up; the game
 * starts as a single 90s round. A fresh lobby is opened the instant the current
 * one launches, so a 30–40 person scan-burst round-robins into lobby after
 * lobby and never hangs.
 *
 * It reuses the existing `lobby_open` protocol event for fill progress and the
 * gateway's `startGame` hook (with `demo: true`) to run the round.
 */

interface SeatedGuest {
  connId: string;
  address: string;
  seatId: string;
}

interface OpenLobby {
  id: number;
  gameIdNum: bigint;
  guests: SeatedGuest[];
  countdownEndsAt: number | null;
  countdownTimer: { cancel(): void } | null;
  started: boolean;
}

export class GuestLobby {
  private host: LobbyHost;
  private scheduler: Scheduler;
  private seq = 0;
  private lobbyCounter = 0;
  private current: OpenLobby | null = null;
  /** connId → the lobby they're seated in (for disconnect cleanup pre-start). */
  private connLobby = new Map<string, OpenLobby>();

  constructor(host: LobbyHost, scheduler?: Scheduler) {
    this.host = host;
    this.scheduler = scheduler ?? new RealScheduler();
  }

  /** Open the first lobby. Safe to call once at startup. */
  async init(): Promise<void> {
    if (!this.current) this.openNextLobby();
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  private freshGameId(): bigint {
    const rand = BigInt(Math.floor(Math.random() * 0xffff));
    return (BigInt(Date.now()) << 16n) | rand;
  }

  private openNextLobby(): void {
    this.lobbyCounter += 1;
    this.current = {
      id: this.lobbyCounter,
      gameIdNum: this.freshGameId(),
      guests: [],
      countdownEndsAt: null,
      countdownTimer: null,
      started: false,
    };
    // eslint-disable-next-line no-console
    console.log(`[guest-lobby] opened lobby #${this.lobbyCounter}`);
  }

  /** Ensure there is an open (not-yet-started, not-full) lobby to seat into. */
  private ensureOpenLobby(): OpenLobby {
    if (
      !this.current ||
      this.current.started ||
      // Cap humans at MAX_HUMANS (< SEATS) so every lobby keeps at least one AI
      // seat — a 10-human burst must never produce a lobby with zero agents.
      this.current.guests.length >= config.MAX_HUMANS
    ) {
      this.openNextLobby();
    }
    return this.current!;
  }

  private lobbyOpenEvent(l: OpenLobby): Extract<ServerEvent, { t: "lobby_open" }> {
    return {
      t: "lobby_open",
      seq: this.nextSeq(),
      gameId: l.gameIdNum.toString(),
      escrowAddress: "", // no chain in demo
      buyInWei: "0", // no money in demo
      minHumans: 1, // demo starts on the first human
      humansSeated: l.guests.length,
      seats: config.SEATS, // total table size — the fill denominator (humans + AI)
      ...(l.countdownEndsAt ? { countdownEndsAt: l.countdownEndsAt } : {}),
    };
  }

  /** Broadcast current lobby fill progress to everyone seated in it. */
  private broadcastLobbyState(l: OpenLobby): void {
    for (const g of l.guests) {
      this.host.sendToConn(g.connId, this.lobbyOpenEvent(l));
    }
  }

  /**
   * Guest asked to join — seat them IMMEDIATELY (no chain). New scanners after a
   * lobby has started/filled go into a fresh lobby (round-robin).
   */
  async requestJoin(connId: string, address: string): Promise<void> {
    // Idempotent: if already seated in a live (not-started) lobby, just resend.
    const existing = this.connLobby.get(connId);
    if (existing && !existing.started) {
      this.host.sendToConn(connId, this.lobbyOpenEvent(existing));
      return;
    }

    const l = this.ensureOpenLobby();
    const seatId = `seat-h${l.guests.length}`;
    l.guests.push({ connId, address: address || "guest", seatId });
    this.connLobby.set(connId, l);

    // Rolling countdown starts on the FIRST human — never waits for a min count.
    if (!l.countdownTimer) {
      l.countdownEndsAt = Date.now() + config.DEMO_COUNTDOWN_MS;
      l.countdownTimer = this.scheduler.setTimeout(
        () => void this.launch(l),
        config.DEMO_COUNTDOWN_MS,
      );
    }

    this.broadcastLobbyState(l);

    // If the lobby hit the human cap, launch now (AI backfill the rest).
    if (l.guests.length >= config.MAX_HUMANS) void this.launch(l);
  }

  /** Fill empty seats with AI and start the single-round demo game. */
  private async launch(l: OpenLobby): Promise<void> {
    if (l.started) return;
    if (l.guests.length === 0) {
      // Nobody left (all disconnected during countdown) — drop the timer.
      l.countdownTimer = null;
      l.countdownEndsAt = null;
      return;
    }
    l.started = true;
    if (l.countdownTimer) {
      l.countdownTimer.cancel();
      l.countdownTimer = null;
    }
    // This lobby is closing; clear its routing so newcomers open a fresh one.
    if (this.current === l) this.openNextLobby();

    const humansSeated = l.guests.length;
    const aiCount = Math.max(0, config.SEATS - humansSeated);
    const seatSpecs: SeatSpec[] = [];
    const humanConnBySeat = new Map<string, string>();
    for (const g of l.guests) {
      seatSpecs.push({
        seatId: g.seatId,
        isAI: false,
        funderAddress: null, // no money in demo
        connId: g.connId,
      });
      humanConnBySeat.set(g.seatId, g.connId);
    }
    for (let i = 0; i < aiCount; i++) {
      seatSpecs.push({ seatId: `seat-ai${i}`, isAI: true, funderAddress: null });
    }

    const gameIdStr = `g-${l.gameIdNum.toString()}`;
    // eslint-disable-next-line no-console
    console.log(
      `[guest-lobby] launching lobby #${l.id} game ${l.gameIdNum.toString()} — ` +
        `${humansSeated} humans, ${aiCount} AI`,
    );

    try {
      await this.host.startGame(gameIdStr, l.gameIdNum, seatSpecs, humanConnBySeat);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[guest-lobby] startGame failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Drop a connection from its open lobby (disconnect before game start). */
  onDisconnect(connId: string): void {
    const l = this.connLobby.get(connId);
    this.connLobby.delete(connId);
    if (!l || l.started) return;
    const idx = l.guests.findIndex((g) => g.connId === connId);
    if (idx < 0) return;
    l.guests.splice(idx, 1);
    // Re-index remaining seat ids so they stay seat-h0..N-1 contiguous.
    l.guests.forEach((g, i) => (g.seatId = `seat-h${i}`));
    this.broadcastLobbyState(l);
  }

  /** Numeric gameId of the current open lobby (for tests/inspection). */
  currentGameId(): bigint | null {
    return this.current?.gameIdNum ?? null;
  }
}
