import { randomUUID } from "node:crypto";
import type { ServerEvent } from "@ai-impostor/shared";
import { config } from "../config.js";
import type { ChainService } from "../chain/ChainService.js";
import type { SeatSpec } from "../game/Game.js";
import type { Scheduler } from "../ai/AgentRunner.js";
import { RealScheduler } from "../ai/AgentRunner.js";

/**
 * On-chain demo lobby (single shared open game).
 *
 * One open game at a time, keyed by a numeric on-chain gameId. The audience
 * flow is: connect → request_join → (server replies lobby_open) → pay join() on
 * chain → confirm_payment → server verifies the escrow deposit and seats the
 * human. Once MIN_HUMANS are seated a countdown starts; at countdown end the
 * game is locked on-chain, the remaining seats are filled with AI, and the
 * real round loop runs. At settlement the next game opens so the app loops.
 *
 * Money: startPool = humansSeated * buyInWei; AI never fund (SPEC §4 / house
 * EV ≥ 0). On-chain deposit verification (chain.getDeposit ≥ buyInWei) is the
 * gate that lets a human take a seat — the server never trusts a client's claim
 * of payment.
 */

/** A seated human awaiting game start. */
interface SeatedHuman {
  connId: string;
  address: string;
  seatId: string;
}

/** The current open game. */
interface OpenGame {
  gameId: bigint;
  humans: SeatedHuman[];
  /** addresses already seated (lowercased) — dedupe. */
  seatedAddresses: Set<string>;
  countdownEndsAt: number | null;
  countdownTimer: { cancel(): void } | null;
  started: boolean;
}

/**
 * What the lobby needs from the gateway to actually run a game. The gateway
 * owns sockets/rooms/Game wiring; the lobby owns seating/countdown/chain
 * lifecycle and calls back here to start the locked game.
 */
export interface LobbyHost {
  /** Send a ServerEvent to one connection. */
  sendToConn(connId: string, ev: ServerEvent): void;
  /**
   * True when the gateway is already running config.MAX_CONCURRENT_GAMES rooms.
   * Lobbies must refuse new joins (with `server_busy`) instead of opening yet
   * another concurrent room. Checked at requestJoin/confirmPayment time so the
   * cap is enforced as back-pressure on the audience rather than as a hard cap
   * that breaks already-seated players.
   */
  atCapacity(): boolean;
  /**
   * Start a fully-specified game: create the room, bind the given human seats to
   * their connections, construct the Game with the configured buy-in + an
   * on-chain settle hook, and run it. Called once the roster is frozen.
   */
  startGame(
    gameId: string,
    gameIdNum: bigint,
    seatSpecs: SeatSpec[],
    humanConnBySeat: Map<string, string>,
  ): Promise<void>;
}

export class DemoLobby {
  private chain: ChainService;
  private host: LobbyHost;
  private scheduler: Scheduler;
  private seq = 0;
  private current: OpenGame | null = null;
  /** connId → which game+address they're seated in (for disconnect cleanup). */
  private connSeat = new Map<string, { gameId: bigint; address: string }>();
  private opening = false;

  constructor(chain: ChainService, host: LobbyHost, scheduler?: Scheduler) {
    this.chain = chain;
    this.host = host;
    this.scheduler = scheduler ?? new RealScheduler();
  }

  /** Open the first game. Safe to call once at startup. */
  async init(): Promise<void> {
    if (!this.current) await this.openNextGame();
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  /** Mint a fresh numeric gameId (timestamp-seeded, incrementing). */
  private freshGameId(): bigint {
    // ms timestamp << 16 | random, kept well within uint256.
    const rand = BigInt(Math.floor(Math.random() * 0xffff));
    return (BigInt(Date.now()) << 16n) | rand;
  }

  private async openNextGame(): Promise<void> {
    if (this.opening) return;
    this.opening = true;
    try {
      const gameId = this.freshGameId();
      try {
        await this.chain.createGame(gameId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[demo-lobby] createGame failed (opening lobby anyway):",
          err instanceof Error ? err.message : err,
        );
      }
      this.current = {
        gameId,
        humans: [],
        seatedAddresses: new Set(),
        countdownEndsAt: null,
        countdownTimer: null,
        started: false,
      };
      // eslint-disable-next-line no-console
      console.log(`[demo-lobby] opened game ${gameId.toString()}`);
    } finally {
      this.opening = false;
    }
  }

  /** Build the lobby_open event for the current open game. */
  private lobbyOpenEvent(): Extract<ServerEvent, { t: "lobby_open" }> {
    const g = this.current!;
    return {
      t: "lobby_open",
      seq: this.nextSeq(),
      gameId: g.gameId.toString(),
      escrowAddress: this.chain.escrowAddress,
      buyInWei: config.BUY_IN_WEI.toString(),
      minHumans: config.MIN_HUMANS,
      humansSeated: g.humans.length,
      seats: config.SEATS, // total table size — the fill denominator (humans + AI)
      ...(g.countdownEndsAt ? { countdownEndsAt: g.countdownEndsAt } : {}),
    };
  }

  /** Broadcast the current lobby_open to all seated humans (fill progress). */
  private broadcastLobbyState(): void {
    if (!this.current) return;
    for (const h of this.current.humans) {
      this.host.sendToConn(h.connId, this.lobbyOpenEvent());
    }
  }

  /** Client asked to join the current open game. */
  async requestJoin(connId: string, _address: string): Promise<void> {
    if (this.host.atCapacity()) {
      this.host.sendToConn(connId, {
        t: "join_rejected",
        seq: this.nextSeq(),
        reason: "server_busy",
      });
      return;
    }
    if (!this.current || this.current.started) {
      // Mid-game: no open lobby right now. Open one if none exists.
      if (!this.current) await this.openNextGame();
    }
    if (!this.current) return;
    this.host.sendToConn(connId, this.lobbyOpenEvent());
  }

  /** Client claims they paid join() on-chain — verify and seat. */
  async confirmPayment(
    connId: string,
    gameId: string,
    address: string,
    _txHash: string,
  ): Promise<void> {
    const reject = (reason: string) =>
      this.host.sendToConn(connId, { t: "join_rejected", seq: this.nextSeq(), reason });

    const g = this.current;
    if (!g) return reject("no_open_game");
    if (g.gameId.toString() !== gameId) return reject("stale_game");
    if (g.started) return reject("game_already_started");
    if (g.humans.length >= config.MAX_HUMANS) return reject("lobby_full");
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return reject("bad_address");
    const addrKey = address.toLowerCase();
    if (g.seatedAddresses.has(addrKey)) return reject("already_seated");

    // Verify the on-chain deposit covers the buy-in. Block inclusion is
    // ~sub-second on Monad, so a few short retries cover the confirm latency.
    const ok = await this.verifyDeposit(g.gameId, address);
    if (!ok) return reject("payment_not_found");

    // Re-check after the await — the lobby may have rolled while we polled.
    if (this.current !== g || g.started) return reject("game_already_started");
    if (g.seatedAddresses.has(addrKey)) return reject("already_seated");

    const seatId = `seat-h${g.humans.length}`;
    g.humans.push({ connId, address, seatId });
    g.seatedAddresses.add(addrKey);
    this.connSeat.set(connId, { gameId: g.gameId, address });

    this.broadcastLobbyState();
    this.maybeStartCountdown();
  }

  private async verifyDeposit(gameId: bigint, address: string): Promise<boolean> {
    const need = config.BUY_IN_WEI;
    for (let i = 0; i < Math.max(1, config.DEPOSIT_CONFIRM_RETRIES); i++) {
      try {
        const dep = await this.chain.getDeposit(gameId, address);
        if (dep >= need) return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[demo-lobby] getDeposit failed:",
          err instanceof Error ? err.message : err,
        );
      }
      if (i < config.DEPOSIT_CONFIRM_RETRIES - 1) {
        await this.scheduler.sleep(config.DEPOSIT_CONFIRM_DELAY_MS);
      }
    }
    return false;
  }

  private maybeStartCountdown(): void {
    const g = this.current;
    if (!g || g.started || g.countdownTimer) return;
    if (g.humans.length < config.MIN_HUMANS) return;
    g.countdownEndsAt = Date.now() + config.COUNTDOWN_MS;
    this.broadcastLobbyState();
    g.countdownTimer = this.scheduler.setTimeout(
      () => void this.launch(g),
      config.COUNTDOWN_MS,
    );
  }

  /** Lock the game on-chain, fill AI seats, and start the round loop. */
  private async launch(g: OpenGame): Promise<void> {
    if (g !== this.current || g.started) return;
    if (g.humans.length < config.MIN_HUMANS) {
      // Lost humans below the threshold during the countdown — cancel + reopen.
      g.countdownTimer = null;
      g.countdownEndsAt = null;
      return;
    }
    g.started = true;

    try {
      await this.chain.lockGame(g.gameId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[demo-lobby] lockGame failed (continuing):",
        err instanceof Error ? err.message : err,
      );
    }

    const humansSeated = g.humans.length;
    const aiCount = Math.max(0, config.SEATS - humansSeated);
    const seatSpecs: SeatSpec[] = [];
    const humanConnBySeat = new Map<string, string>();
    for (const h of g.humans) {
      seatSpecs.push({
        seatId: h.seatId,
        isAI: false,
        funderAddress: h.address,
        connId: h.connId,
      });
      humanConnBySeat.set(h.seatId, h.connId);
    }
    for (let i = 0; i < aiCount; i++) {
      seatSpecs.push({ seatId: `seat-ai${i}`, isAI: true, funderAddress: null });
    }

    const gameIdStr = `g-${g.gameId.toString()}`;
    // eslint-disable-next-line no-console
    console.log(
      `[demo-lobby] launching game ${g.gameId.toString()} — ${humansSeated} humans, ${aiCount} AI`,
    );

    // Open the next lobby BEFORE running the (long-lived) game so newcomers can
    // start paying into the next round immediately.
    void this.openNextGame();

    try {
      await this.host.startGame(gameIdStr, g.gameId, seatSpecs, humanConnBySeat);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[demo-lobby] startGame failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Drop a connection from the open lobby (disconnect before game start). */
  onDisconnect(connId: string): void {
    this.connSeat.delete(connId);
    const g = this.current;
    if (!g || g.started) return;
    const idx = g.humans.findIndex((h) => h.connId === connId);
    if (idx < 0) return;
    const [removed] = g.humans.splice(idx, 1);
    if (removed) g.seatedAddresses.delete(removed.address.toLowerCase());
    // Re-index remaining seat ids so they stay seat-h0..N-1 contiguous.
    g.humans.forEach((h, i) => (h.seatId = `seat-h${i}`));
    if (g.humans.length < config.MIN_HUMANS && g.countdownTimer) {
      g.countdownTimer.cancel();
      g.countdownTimer = null;
      g.countdownEndsAt = null;
    }
    this.broadcastLobbyState();
  }

  /** Numeric gameId of the current open game (for tests/inspection). */
  currentGameId(): bigint | null {
    return this.current?.gameId ?? null;
  }
}
