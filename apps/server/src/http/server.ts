import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { config, allowedOrigins } from "../config.js";
import type { ChainService } from "../chain/ChainService.js";

/**
 * HTTP front-door for the realtime server. Wraps the WS server (the gateway
 * attaches its upgrade handler to the returned http.Server) and exposes:
 *
 *   GET  /healthz  → 200 { ok: true }
 *   POST /faucet   → { address } → drips FAUCET_DRIP_WEI MON from the demo wallet
 *
 * Faucet safety (SPEC §8.9 fast-follow): rate-limited to one drip per address
 * per FAUCET_COOLDOWN_MS (in-memory), and skipped if the address already holds
 * more than buyIn*2 — so the funded demo wallet isn't drained by users who don't
 * actually need MON. CORS allows WS_ALLOWED_ORIGINS (or `*`).
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = allowedOrigins();
  const allowAll = allowed.includes("*");
  const allow = allowAll ? "*" : origin && allowed.includes(origin) ? origin : allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  cors: Record<string, string>,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", ...cors });
  res.end(payload);
}

function readBody(req: IncomingMessage, limit = 4096): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export interface HttpServerDeps {
  chain: ChainService;
  /**
   * Optional metrics provider: returns Prometheus text body. Wired by the
   * bootstrap to point at `gateway.metricsSnapshot()`. Absent → /metrics 404s.
   */
  metricsSource?: () => string;
}

export function createHttpServer(deps: HttpServerDeps): Server {
  // address (lowercase) → last drip epoch ms.
  const lastDrip = new Map<string, number>();

  const server = createServer((req, res) => {
    const cors = corsHeaders(req.headers.origin);
    const method = req.method ?? "GET";
    const url = req.url ?? "/";
    const path = url.split("?")[0];

    if (method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    if (method === "GET" && path === "/healthz") {
      sendJson(res, 200, { ok: true }, cors);
      return;
    }

    if (method === "GET" && path === "/metrics") {
      if (!deps.metricsSource) {
        sendJson(res, 404, { error: "metrics_disabled" }, cors);
        return;
      }
      const body = deps.metricsSource();
      res.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        ...cors,
      });
      res.end(body);
      return;
    }

    if (method === "POST" && path === "/faucet") {
      void handleFaucet(req, res, cors, deps.chain, lastDrip);
      return;
    }

    sendJson(res, 404, { error: "not_found" }, cors);
  });

  return server;
}

async function handleFaucet(
  req: IncomingMessage,
  res: ServerResponse,
  cors: Record<string, string>,
  chain: ChainService,
  lastDrip: Map<string, number>,
): Promise<void> {
  let address: string;
  try {
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as { address?: unknown }) : {};
    if (typeof body.address !== "string" || !ADDRESS_RE.test(body.address)) {
      sendJson(res, 400, { error: "invalid_address" }, cors);
      return;
    }
    address = body.address;
  } catch (err) {
    sendJson(
      res,
      400,
      { error: err instanceof Error ? err.message : "bad_request" },
      cors,
    );
    return;
  }

  const key = address.toLowerCase();
  const now = Date.now();
  const prev = lastDrip.get(key);
  if (prev !== undefined && now - prev < config.FAUCET_COOLDOWN_MS) {
    const retryMs = config.FAUCET_COOLDOWN_MS - (now - prev);
    sendJson(res, 429, { error: "rate_limited", retryAfterMs: retryMs }, cors);
    return;
  }

  // Safety cap: don't drip to an address that already holds plenty (avoid
  // draining the demo wallet for users who don't need MON).
  try {
    const balance = await chain.getBalance(address);
    if (balance > config.BUY_IN_WEI * 2n) {
      sendJson(res, 200, { skipped: "already_funded", txHash: null }, cors);
      lastDrip.set(key, now);
      return;
    }
  } catch (err) {
    // A balance read failure shouldn't block the drip in the demo; log + proceed.
    // eslint-disable-next-line no-console
    console.error("[faucet] balance read failed:", err instanceof Error ? err.message : err);
  }

  try {
    // Reserve the slot before the (async) send so concurrent requests can't
    // double-drip the same address.
    lastDrip.set(key, now);
    const { txHash } = await chain.faucetSend(address, config.FAUCET_DRIP_WEI);
    sendJson(res, 200, { txHash }, cors);
  } catch (err) {
    lastDrip.delete(key); // let them retry on a genuine send failure
    // eslint-disable-next-line no-console
    console.error("[faucet] send failed:", err instanceof Error ? err.message : err);
    sendJson(res, 502, { error: "faucet_send_failed" }, cors);
  }
}
