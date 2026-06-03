/**
 * GameSocket factory — selects the transport for a /play session.
 *
 * Live path: when `NEXT_PUBLIC_WS_URL` is set (a real server URL), connect over
 * a real WebSocket via {@link WebSocketGameSocket}, which zod-validates every
 * inbound `ServerEvent` (anti-leak shape enforced by the shared schema) and
 * reconnects with exponential backoff.
 *
 * Fallback: when no URL is configured (local/demo, the M4 default), fall back to
 * the scripted {@link createMockGameSocket} so every screen stays demoable with
 * no server running.
 *
 * `NEXT_PUBLIC_WS_URL` is inlined at build time by Next; both branches are
 * statically present so typecheck/build stay green regardless of the env value.
 */
import type { GameSocket } from "./game-socket";
import { WebSocketGameSocket } from "./game-socket";
import { createMockGameSocket } from "./mock-server";

/** The configured live-server WebSocket URL, or undefined for mock/demo. */
export function liveWsUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_WS_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

/** True when a live server WS URL is configured (otherwise the mock is used). */
export function isLiveSocket(): boolean {
  return liveWsUrl() !== undefined;
}

/**
 * HTTP(S) base for the server's REST endpoints (faucet, healthz). The server
 * serves HTTP on the SAME host as the WebSocket, so we derive it from
 * NEXT_PUBLIC_WS_URL: `wss://host` → `https://host`, `ws://host` → `http://host`
 * (any path/query is stripped). Falls back to same-origin in the browser when
 * no WS URL is configured (mock/demo).
 */
export function httpBase(): string | undefined {
  const ws = liveWsUrl();
  if (ws) {
    try {
      const u = new URL(ws);
      u.protocol = u.protocol === "wss:" ? "https:" : "http:";
      return `${u.protocol}//${u.host}`;
    } catch {
      // fall through to same-origin
    }
  }
  if (typeof window !== "undefined") return window.location.origin;
  return undefined;
}

/**
 * Build the GameSocket for a /play session. Optionally pass a per-game suffix
 * (e.g. `?gameId=...`) appended to the configured base URL for the live path;
 * the mock ignores it (it scripts its own demo game).
 */
export function createGameSocket(pathOrQuery?: string): GameSocket {
  const base = liveWsUrl();
  if (!base) return createMockGameSocket();
  const url = pathOrQuery ? base + pathOrQuery : base;
  return new WebSocketGameSocket({ url });
}
