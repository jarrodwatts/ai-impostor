/**
 * Typed game-socket client — interface-driven so the mock emitter and the real
 * WebSocket (M5) are interchangeable. A consumer (the /play socket provider)
 * subscribes to validated `ServerEvent`s and sends validated `ClientEvent`s.
 *
 * The real implementation (`WebSocketGameSocket`) speaks the wire protocol with
 * reconnect + exponential backoff and zod-validates every inbound frame. The
 * mock (`MockGameSocket`, see mock-server.ts) implements the SAME interface so
 * screens are demoable without a server.
 */
import { ClientEvent, ServerEvent } from "@ai-impostor/shared";

export type ServerEventHandler = (ev: ServerEvent) => void;
export type ConnectionHandler = (connected: boolean) => void;

export interface GameSocket {
  /** Open the transport and begin emitting events. Idempotent. */
  connect(): void;
  /** Close the transport; stop emitting. Idempotent. */
  disconnect(): void;
  /** Send a client→server event (validated before transmit). */
  send(ev: ClientEvent): void;
  /** Subscribe to validated server→client events. Returns an unsubscribe fn. */
  onEvent(handler: ServerEventHandler): () => void;
  /** Subscribe to connection state changes. Returns an unsubscribe fn. */
  onConnection(handler: ConnectionHandler): () => void;
}

/** Small pub/sub helper shared by both socket implementations. */
export class Emitter {
  private eventHandlers = new Set<ServerEventHandler>();
  private connHandlers = new Set<ConnectionHandler>();

  onEvent(handler: ServerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connHandlers.add(handler);
    return () => this.connHandlers.delete(handler);
  }

  emitEvent(ev: ServerEvent): void {
    for (const h of this.eventHandlers) h(ev);
  }

  emitConnection(connected: boolean): void {
    for (const h of this.connHandlers) h(connected);
  }
}

export type WebSocketGameSocketOptions = {
  url: string;
  /** initial reconnect delay (ms); doubles up to maxBackoffMs */
  baseBackoffMs?: number;
  maxBackoffMs?: number;
};

/**
 * Real WebSocket transport with reconnect + exponential backoff. Wired for M5;
 * not exercised against a live server in M4 (the mock drives the screens).
 * Every inbound frame is zod-validated; malformed frames are dropped.
 */
export class WebSocketGameSocket implements GameSocket {
  private ws: WebSocket | null = null;
  private readonly emitter = new Emitter();
  private readonly url: string;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private backoffMs: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  // Keepalive: a client→server heartbeat keeps the connection's traffic flowing
  // so an idle proxy (Railway edge) never silently drops a quiet WebSocket — the
  // root cause of issue #2 (frozen game at 0:00, stuck typing, lost messages).
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  // Watchdog: if NOTHING is received for a long stretch the socket is likely a
  // zombie (dropped underneath without firing `close`) — force a reconnect.
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private lastInboundAt = 0;
  private static readonly HEARTBEAT_MS = 12_000;
  private static readonly SILENCE_MS = 45_000;

  constructor(opts: WebSocketGameSocketOptions) {
    this.url = opts.url;
    this.baseBackoffMs = opts.baseBackoffMs ?? 500;
    this.maxBackoffMs = opts.maxBackoffMs ?? 10_000;
    this.backoffMs = this.baseBackoffMs;
  }

  connect(): void {
    if (this.ws || typeof WebSocket === "undefined") return;
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.backoffMs = this.baseBackoffMs;
      this.lastInboundAt = Date.now();
      this.startKeepalive();
      this.emitter.emitConnection(true);
    });

    ws.addEventListener("message", (e: MessageEvent) => {
      this.lastInboundAt = Date.now();
      let raw: unknown;
      try {
        raw = JSON.parse(typeof e.data === "string" ? e.data : "");
      } catch {
        return; // drop unparseable frame
      }
      const parsed = ServerEvent.safeParse(raw);
      if (parsed.success) this.emitter.emitEvent(parsed.data);
    });

    const onDown = () => {
      this.stopKeepalive();
      this.emitter.emitConnection(false);
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.addEventListener("close", onDown);
    ws.addEventListener("error", () => ws.close());
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ t: "heartbeat" }));
      }
    }, WebSocketGameSocket.HEARTBEAT_MS);
    this.watchdogTimer = setInterval(() => {
      if (this.ws && Date.now() - this.lastInboundAt > WebSocketGameSocket.SILENCE_MS) {
        this.ws.close(); // → onDown → scheduleReconnect
      }
    }, 5_000);
  }

  private stopKeepalive(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  disconnect(): void {
    this.closedByUser = true;
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(ev: ClientEvent): void {
    const parsed = ClientEvent.safeParse(ev);
    if (!parsed.success) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(parsed.data));
    }
  }

  onEvent(handler: ServerEventHandler): () => void {
    return this.emitter.onEvent(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    return this.emitter.onConnection(handler);
  }
}
