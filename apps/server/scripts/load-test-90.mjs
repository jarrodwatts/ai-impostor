#!/usr/bin/env node
// 90-client load test for ai-impostor guest demo mode.
// Spawns N WS guests in waves, measures join → seated → game_started → settlement
// latencies, prints percentiles + a tally of completed games.
//
// Usage: PORT=8090 N=90 node scripts/load-test-90.mjs
import { WebSocket } from "ws";

const PORT = Number(process.env.PORT || 8090);
const N = Number(process.env.N || 90);
const WAVE = Number(process.env.WAVE || 10);     // clients per wave
const WAVE_GAP_MS = Number(process.env.WAVE_GAP_MS || 1500);
const OVERALL_TIMEOUT_MS = Number(process.env.OVERALL_TIMEOUT_MS || 240_000);

const url = `ws://127.0.0.1:${PORT}`;

const clients = [];
let connectFails = 0;

function spawn(i) {
  const t0 = Date.now();
  const ws = new WebSocket(url);
  const c = {
    i,
    ws,
    tConnect: null,
    tLobby: null,
    tGameStarted: null,
    tSettlement: null,
    gameId: null,
    seatCount: null,
    error: null,
    closed: false,
  };
  clients.push(c);

  ws.on("open", () => {
    c.tConnect = Date.now() - t0;
    ws.send(JSON.stringify({ t: "request_join", address: `guest-${i}` }));
  });
  ws.on("message", (raw) => {
    let ev;
    try { ev = JSON.parse(raw.toString()); } catch { return; }
    if (ev.t === "lobby_open" && c.tLobby == null) {
      c.tLobby = Date.now() - t0;
      c.gameId = ev.gameId;
    }
    if (ev.t === "game_started" && c.tGameStarted == null) {
      c.tGameStarted = Date.now() - t0;
      c.seatCount = ev.roster?.length ?? null;
    }
    if (ev.t === "settlement" && c.tSettlement == null) {
      c.tSettlement = Date.now() - t0;
    }
  });
  ws.on("error", (e) => { c.error = e.message; });
  ws.on("close", () => { c.closed = true; });
  ws.on("unexpected-response", () => { connectFails++; });
}

function pct(arr, p) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.floor(p * a.length));
  return a[idx];
}

function summarize(field) {
  const vals = clients.map((c) => c[field]).filter((v) => v != null);
  return {
    n: vals.length,
    p50: pct(vals, 0.5),
    p95: pct(vals, 0.95),
    p99: pct(vals, 0.99),
    max: vals.length ? Math.max(...vals) : null,
  };
}

async function main() {
  const start = Date.now();
  for (let i = 0; i < N; i += WAVE) {
    for (let j = 0; j < WAVE && i + j < N; j++) spawn(i + j);
    if (i + WAVE < N) await new Promise((r) => setTimeout(r, WAVE_GAP_MS));
  }

  // Wait until everyone has a settlement OR overall timeout.
  while (Date.now() - start < OVERALL_TIMEOUT_MS) {
    const done = clients.filter((c) => c.tSettlement != null).length;
    if (done >= N) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const games = new Map();
  for (const c of clients) {
    if (!c.gameId) continue;
    const g = games.get(c.gameId) ?? { humans: 0, started: false, settled: false, seats: null };
    g.humans++;
    if (c.tGameStarted != null) g.started = true;
    if (c.tSettlement != null) g.settled = true;
    if (c.seatCount) g.seats = c.seatCount;
    games.set(c.gameId, g);
  }

  console.log("\n=== load test summary ===");
  console.log(`N=${N}  wave=${WAVE}  gap=${WAVE_GAP_MS}ms  port=${PORT}`);
  console.log(`connect_fails=${connectFails}`);
  console.log(`connected: ${clients.filter((c) => c.tConnect != null).length}/${N}`);
  console.log(`lobby_open: ${clients.filter((c) => c.tLobby != null).length}/${N}`);
  console.log(`game_started: ${clients.filter((c) => c.tGameStarted != null).length}/${N}`);
  console.log(`settlement: ${clients.filter((c) => c.tSettlement != null).length}/${N}`);

  console.log("\nlatencies (ms from socket open):");
  for (const f of ["tConnect", "tLobby", "tGameStarted", "tSettlement"]) {
    console.log(`  ${f.padEnd(14)} ${JSON.stringify(summarize(f))}`);
  }

  console.log(`\ngames seen: ${games.size}`);
  let i = 0;
  for (const [gid, g] of games) {
    console.log(`  game ${++i} (${gid}): humans=${g.humans} seats=${g.seats} started=${g.started} settled=${g.settled}`);
  }

  const incomplete = clients.filter((c) => c.tSettlement == null);
  if (incomplete.length) {
    console.log(`\n${incomplete.length} clients never settled. Sample:`);
    for (const c of incomplete.slice(0, 5)) {
      console.log(`  i=${c.i} connect=${c.tConnect} lobby=${c.tLobby} started=${c.tGameStarted} err=${c.error} closed=${c.closed}`);
    }
  }

  for (const c of clients) try { c.ws.close(); } catch {}
  setTimeout(() => process.exit(incomplete.length ? 1 : 0), 200);
}

main();
