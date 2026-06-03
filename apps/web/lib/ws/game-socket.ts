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
      this.emitter.emitConnection(true);
    });

    ws.addEventListener("message", (e: MessageEvent) => {
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
      this.emitter.emitConnection(false);
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.addEventListener("close", onDown);
    ws.addEventListener("error", () => ws.close());
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
