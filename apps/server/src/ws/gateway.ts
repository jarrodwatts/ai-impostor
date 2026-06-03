import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import {
  ClientEvent,
  type ServerEvent,
  GameConfig,
} from "@ai-impostor/shared";
import { config } from "../config.js";
import { Game, BUY_IN_WEI, type GameEmitter, type SeatSpec } from "../game/Game.js";
import type { LlmClient } from "../ai/llm.js";
import type { Repositories } from "../persistence/types.js";
import { MatchmakingQueue } from "../matchmaking/queue.js";
import { DemoLobby, type LobbyHost } from "../matchmaking/demoLobby.js";
import type { ChainService } from "../chain/ChainService.js";
import { signSettlement } from "../settlement/settle.js";
import type { BuiltSettlement } from "../settlement/settle.js";
import {
  projectStateForRecipient,
  type RecipientRole,
} from "./broadcast.js";
import type { Scheduler } from "../ai/AgentRunner.js";

/**
 * WebSocket gateway: connection auth (stub token), heartbeat/ping-pong, inbound
 * routing to the owning game, and per-recipient fan-out via the anti-leak
 * projection. The gateway never invents protocol — every inbound frame is
 * validated with the shared zod ClientEvent, every outbound frame is a shared
 * ServerEvent.
 *
 * Anti-leak: when a Game broadcasts a `game_started`/`resync`, the gateway
 * personalizes it per recipient through projectStateForRecipient (the choke
 * point). Other ServerEvents (chat, typing, phase, resolved, settlement) are
 * already leak-free by protocol design and forwarded as-is.
 */

interface ConnContext {
  connId: string;
  ws: WebSocket;
  alive: boolean;
  /** Set once the connection is seated in a game. */
  gameId?: string;
  seatId?: string;
  /** Wallet address (demo flow). */
  address?: string;
}

/** Per-game routing record. */
interface GameRoom {
  game: Game;
  /** seatId → connId for human seats. */
  seatConns: Map<string, string>;
}

export interface GatewayOptions {
  port?: number;
  repos: Repositories;
  llm: LlmClient;
  scheduler?: Scheduler;
  /** Optional auth hook; default accepts any non-empty token. */
  authenticate?: (token: string) => { userId: string } | null;
  /**
   * On-chain demo deps. When provided, the gateway runs the single-shared-open-
   * game demo flow (request_join / confirm_payment) instead of the queue-only
   * path, and wires real settlement submission. The serverSignerKey EIP712-signs
   * settlements; it is never logged.
   */
  chain?: ChainService;
  serverSignerKey?: `0x${string}`;
  /**
   * Existing HTTP server to attach the WS upgrade handler to (so the faucet +
   * /healthz share the port). When omitted the gateway opens its own ws server
   * on `port` (used by tests).
   */
  httpServer?: import("node:http").Server;
}

export class Gateway implements LobbyHost {
  private wss: WebSocketServer | null = null;
  private conns = new Map<string, ConnContext>();
  private rooms = new Map<string, GameRoom>();
  private queue: MatchmakingQueue;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private opts: GatewayOptions;
  private demoLobby: DemoLobby | null = null;

  constructor(opts: GatewayOptions) {
    this.opts = opts;
    this.queue = new MatchmakingQueue();
    if (opts.chain) {
      this.demoLobby = new DemoLobby(opts.chain, this, opts.scheduler);
    }
  }

  /** True when running the on-chain demo flow (request_join/confirm_payment). */
  get demoMode(): boolean {
    return this.demoLobby !== null;
  }

  listen(): void {
    if (this.opts.httpServer) {
      this.wss = new WebSocketServer({ server: this.opts.httpServer });
    } else {
      const port = this.opts.port ?? 8080;
      this.wss = new WebSocketServer({ port });
    }
    this.wss.on("connection", (ws, req) => this.onConnection(ws, req?.url));
    this.heartbeat = setInterval(() => this.pingAll(), config.HEARTBEAT_MS);
    if (this.demoLobby) void this.demoLobby.init();
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.wss?.close();
  }

  // ── connection lifecycle ────────────────────────────────────────────
  private onConnection(ws: WebSocket, url?: string): void {
    // Stub auth: token from `?token=` query. Default accepts any non-empty.
    const token = url ? new URLSearchParams(url.split("?")[1] ?? "").get("token") : null;
    const auth = this.opts.authenticate
      ? this.opts.authenticate(token ?? "")
      : token
        ? { userId: token }
        : { userId: `anon-${randomUUID()}` };
    if (!auth) {
      ws.close(4001, "unauthorized");
      return;
    }

    const connId = randomUUID();
    const ctx: ConnContext = { connId, ws, alive: true };
    this.conns.set(connId, ctx);

    ws.on("pong", () => {
      ctx.alive = true;
    });
    ws.on("message", (data) => this.onMessage(ctx, data.toString()));
    ws.on("close", () => this.onClose(ctx));

    this.sendQueueState(ctx);
  }

  private onClose(ctx: ConnContext): void {
    this.conns.delete(ctx.connId);
    // Pre-start: drop them from the open demo lobby (re-indexes remaining seats).
    this.demoLobby?.onDisconnect(ctx.connId);
    // Grace window / auto-eliminate is wired in M5/M6; here we just drop the
    // routing entry so broadcasts stop targeting a dead socket.
    if (ctx.gameId) {
      const room = this.rooms.get(ctx.gameId);
      if (room && ctx.seatId) room.seatConns.delete(ctx.seatId);
    }
  }

  private pingAll(): void {
    for (const ctx of this.conns.values()) {
      if (!ctx.alive) {
        ctx.ws.terminate();
        continue;
      }
      ctx.alive = false;
      try {
        ctx.ws.ping();
      } catch {
        // ignore
      }
    }
  }

  // ── inbound routing (zod-validated) ─────────────────────────────────
  private onMessage(ctx: ConnContext, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendError(ctx, "bad_json", "invalid JSON");
      return;
    }
    const result = ClientEvent.safeParse(parsed);
    if (!result.success) {
      this.sendError(ctx, "bad_event", "failed schema validation");
      return;
    }
    const ev = result.data;
    switch (ev.t) {
      case "heartbeat":
        ctx.alive = true;
        break;
      case "join_queue":
        void this.onJoinQueue(ctx, ev.buyInTxRef);
        break;
      case "leave_queue":
        void this.queue.leave(ctx.connId);
        break;
      case "request_join":
        ctx.address = ev.address;
        if (this.demoLobby) void this.demoLobby.requestJoin(ctx.connId, ev.address);
        break;
      case "confirm_payment":
        ctx.address = ev.address;
        if (this.demoLobby)
          void this.demoLobby.confirmPayment(
            ctx.connId,
            ev.gameId,
            ev.address,
            ev.txHash,
          );
        break;
      case "send_message":
        this.routeChat(ctx, ev.clientMsgId, ev.text);
        break;
      case "set_typing":
        this.routeTyping(ctx, ev.isTyping);
        break;
      case "cast_vote":
        this.routeVote(ctx, ev.round, ev.targetSeatId);
        break;
      case "resync_request":
        this.sendResync(ctx);
        break;
    }
  }

  private async onJoinQueue(ctx: ConnContext, _buyInTxRef: string): Promise<void> {
    await this.queue.join(ctx.connId);
    this.sendQueueState(ctx);
    // Try to form a lobby (simplified: form immediately when enough are queued;
    // the countdown clock is driven by the matchmaking service in M5).
    if (await this.queue.shouldStartCountdown()) {
      await this.tryFormGame();
    }
  }

  private async tryFormGame(): Promise<void> {
    const lobby = await this.queue.formLobby();
    if (!lobby) return;

    const gameId = `g-${randomUUID().slice(0, 8)}`;
    const gameIdNum = BigInt(`0x${randomUUID().replace(/-/g, "")}`) & ((1n << 200n) - 1n);

    const seatSpecs: SeatSpec[] = [];
    lobby.members.forEach((connId, i) => {
      seatSpecs.push({
        seatId: `seat-h${i}`,
        isAI: false,
        funderAddress: `0x${"0".repeat(39)}${(i + 1).toString(16)}`,
        connId,
      });
    });
    for (let i = 0; i < lobby.aiCount; i++) {
      seatSpecs.push({ seatId: `seat-ai${i}`, isAI: true, funderAddress: null });
    }

    const room: GameRoom = { game: undefined as unknown as Game, seatConns: new Map() };
    const emitter: GameEmitter = {
      broadcast: (ev) => this.broadcastToRoom(gameId, ev),
      toSeat: (seatId, ev) => this.sendToSeat(gameId, seatId, ev),
    };
    const game = new Game(gameId, gameIdNum, seatSpecs, {
      repos: this.opts.repos,
      llm: this.opts.llm,
      emitter,
      ...(this.opts.scheduler ? { scheduler: this.opts.scheduler } : {}),
    });
    room.game = game;
    this.rooms.set(gameId, room);

    // Bind human seats to their connections.
    for (const spec of seatSpecs) {
      if (!spec.isAI && spec.connId) {
        room.seatConns.set(spec.seatId, spec.connId);
        const c = this.conns.get(spec.connId);
        if (c) {
          c.gameId = gameId;
          c.seatId = spec.seatId;
        }
      }
    }

    await game.start();
  }

  // ── LobbyHost impl (on-chain demo flow) ─────────────────────────────
  sendToConn(connId: string, ev: ServerEvent): void {
    const ctx = this.conns.get(connId);
    if (ctx) this.send(ctx, ev);
  }

  /**
   * Start a locked demo game: build the room, bind human seats, construct the
   * Game with the configured buy-in + an on-chain settle hook (sign EIP712 +
   * submit settle()), and run the round loop. The settle hook's tx hash is woven
   * into the broadcast settlement reveal by the Game.
   */
  async startGame(
    gameId: string,
    gameIdNum: bigint,
    seatSpecs: SeatSpec[],
    humanConnBySeat: Map<string, string>,
  ): Promise<void> {
    const room: GameRoom = { game: undefined as unknown as Game, seatConns: new Map() };
    const emitter: GameEmitter = {
      broadcast: (ev) => this.broadcastToRoom(gameId, ev),
      toSeat: (seatId, ev) => this.sendToSeat(gameId, seatId, ev),
    };

    const chain = this.opts.chain;
    const signerKey = this.opts.serverSignerKey;
    const settle = chain && signerKey
      ? async (built: BuiltSettlement) => {
          const sig = await signSettlement(
            built.onchain,
            signerKey,
            chain.escrowAddress as `0x${string}`,
          );
          return chain.submitSettlement(built.onchain, sig);
        }
      : undefined;

    const game = new Game(gameId, gameIdNum, seatSpecs, {
      repos: this.opts.repos,
      llm: this.opts.llm,
      emitter,
      buyInWei: config.BUY_IN_WEI,
      ...(settle ? { settle } : {}),
      ...(this.opts.scheduler ? { scheduler: this.opts.scheduler } : {}),
    });
    room.game = game;
    this.rooms.set(gameId, room);

    for (const [seatId, connId] of humanConnBySeat) {
      room.seatConns.set(seatId, connId);
      const c = this.conns.get(connId);
      if (c) {
        c.gameId = gameId;
        c.seatId = seatId;
      }
    }

    await game.start();
  }

  // ── routing helpers ─────────────────────────────────────────────────
  private routeChat(ctx: ConnContext, clientMsgId: string, text: string): void {
    if (!ctx.gameId || !ctx.seatId) return;
    const room = this.rooms.get(ctx.gameId);
    room?.game.handleChatMessage(ctx.seatId, clientMsgId, text);
  }

  private routeTyping(ctx: ConnContext, isTyping: boolean): void {
    if (!ctx.gameId || !ctx.seatId) return;
    const room = this.rooms.get(ctx.gameId);
    room?.game.setTyping(ctx.seatId, isTyping);
  }

  private routeVote(ctx: ConnContext, round: number, targetSeatId: string): void {
    if (!ctx.gameId || !ctx.seatId) return;
    const room = this.rooms.get(ctx.gameId);
    room?.game.handleVote(ctx.seatId, round, targetSeatId);
  }

  // ── outbound fan-out ────────────────────────────────────────────────
  private send(ctx: ConnContext, ev: ServerEvent): void {
    try {
      ctx.ws.send(JSON.stringify(ev));
    } catch {
      // ignore broken pipe
    }
  }

  private sendError(ctx: ConnContext, code: string, message: string): void {
    this.send(ctx, { t: "error", seq: 0, code, message });
  }

  private gameConfigDTO(): GameConfig {
    return GameConfig.parse({
      buyInWei: BUY_IN_WEI.toString(),
      minPlayers: config.MIN_HUMANS,
      maxSeats: config.SEATS,
      countdownMs: config.COUNTDOWN_MS,
      discussionMs: config.DISCUSSION_MS,
      voteWindowMs: config.VOTE_MS,
    });
  }

  private sendQueueState(ctx: ConnContext): void {
    void this.queue.position(ctx.connId).then((position) =>
      this.queue.waiting().then((waiting) =>
        this.send(ctx, {
          t: "queue_state",
          seq: 0,
          position: position < 0 ? 0 : position,
          waiting,
          config: this.gameConfigDTO(),
        }),
      ),
    );
  }

  /**
   * Broadcast a ServerEvent to every connection in a room. For state-bearing
   * events (game_started / resync) the payload is re-projected per recipient
   * via the anti-leak choke point so no socket gets a foreign seat's secrets.
   */
  private broadcastToRoom(gameId: string, ev: ServerEvent): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    for (const [seatId, connId] of room.seatConns) {
      const ctx = this.conns.get(connId);
      if (!ctx) continue;
      this.send(ctx, this.personalize(room, seatId, ev));
    }
  }

  private sendToSeat(gameId: string, seatId: string, ev: ServerEvent): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    const connId = room.seatConns.get(seatId);
    if (!connId) return;
    const ctx = this.conns.get(connId);
    if (ctx) this.send(ctx, ev);
  }

  /** Personalize a state-bearing event for one seat via the projection. */
  private personalize(
    room: GameRoom,
    seatId: string,
    ev: ServerEvent,
  ): ServerEvent {
    if (ev.t === "game_started") {
      const seat = room.game.state.seats.get(seatId);
      const role: RecipientRole = seat?.alive ? "ALIVE_HUMAN" : "SPECTATOR";
      const proj = projectStateForRecipient(room.game.state, role, seatId);
      return {
        ...ev,
        roster: proj.roster,
        mySeatId: proj.mySeatId,
        viewerStatus: proj.viewerStatus,
        potHealthPct: 100,
      };
    }
    return ev;
  }

  private sendResync(ctx: ConnContext): void {
    if (!ctx.gameId || !ctx.seatId) return;
    const room = this.rooms.get(ctx.gameId);
    if (!room) return;
    const seat = room.game.state.seats.get(ctx.seatId);
    const role: RecipientRole = seat?.alive ? "ALIVE_HUMAN" : "SPECTATOR";
    const snapshot = projectStateForRecipient(room.game.state, role, ctx.seatId);
    this.send(ctx, { t: "resync", seq: 0, snapshot });
  }
}
