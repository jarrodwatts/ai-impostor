/**
 * Central game + service tunables. All durations in milliseconds unless noted.
 * These are the knobs called out in SPEC.md and the build plan (.agent/plans.md).
 *
 * Several values are env-overridable for the live on-chain demo (see the env
 * helpers below + .env.example). Defaults keep the headless sim/tests stable.
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envBigint(name: string, fallback: bigint): bigint {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  try {
    return BigInt(raw.trim());
  } catch {
    return fallback;
  }
}

export const config = {
  // ── Lobby / matchmaking ──────────────────────────────────────────
  SEATS: envInt("SEATS", 10),
  // Demo-friendly default: 2 humans is enough to start a live game (SPEC's 6 is
  // the full-game target; the on-chain demo lowers it so a small audience can play).
  MIN_HUMANS: envInt("MIN_HUMANS", 2),
  MAX_HUMANS: 9, // ensures aiCount = clamp(10 - humans, 1, 4) is never 0
  COUNTDOWN_MS: 25_000, // start countdown once MIN_HUMANS seated

  // ── Round phases ─────────────────────────────────────────────────
  DISCUSSION_MS: 120_000,
  VOTE_MS: 18_000,
  PROMPT_MS: 3_000,

  // ── Economics ────────────────────────────────────────────────────
  MISVOTE_PENALTY_PCT: 10, // flat % of pool per round a human is eliminated (waived on human win)

  // ── Chat / moderation ────────────────────────────────────────────
  MSG_MAX_LEN: 280,
  MSG_RATE_PER_SEC: 0.66, // ~1 msg / 1.5s
  MSG_BURST: 3,

  // ── AI agents ────────────────────────────────────────────────────
  BLOC_COHESION: 1.0, // 1.0 = AI always pile on the same target; lower softens 4-AI draws
  AI_MIN_THINK_MS: 1_000,
  AI_MAX_THINK_MS: 6_000,
  AI_WPM_MIN: 30,
  AI_WPM_MAX: 70,
  AI_MAX_CONCURRENT_CALLS: 4,

  // ── Connection / reconnect ───────────────────────────────────────
  HEARTBEAT_MS: 10_000,
  GRACE_MS: 40_000, // reconnect window before auto-eliminate
  DISCONNECT_PENALTY_WAIVER: false, // tunable: waive 10% on genuine disconnects

  // ── Chain / demo lobby ───────────────────────────────────────────
  CHAIN_ID: 10_143, // Monad testnet
  // Human buy-in (wei). Default 0.01 MON for the demo. AI never fund the pool.
  BUY_IN_WEI: envBigint("BUY_IN_WEI", 10_000_000_000_000_000n),
  // Faucet drip per request (wei). Default 0.1 MON.
  FAUCET_DRIP_WEI: envBigint("FAUCET_DRIP_WEI", 100_000_000_000_000_000n),
  // Faucet: min interval between drips to one address (ms).
  FAUCET_COOLDOWN_MS: envInt("FAUCET_COOLDOWN_MS", 6 * 60 * 60 * 1000),
  // How many times to poll the escrow for a confirmed deposit (block inclusion
  // is ~sub-second on Monad, so a handful of short retries suffices).
  DEPOSIT_CONFIRM_RETRIES: envInt("DEPOSIT_CONFIRM_RETRIES", 8),
  DEPOSIT_CONFIRM_DELAY_MS: envInt("DEPOSIT_CONFIRM_DELAY_MS", 400),
} as const;

export type Config = typeof config;

/** HTTP port (env PORT, default 8080). */
export function httpPort(): number {
  return envInt("PORT", 8080);
}

/** Allowed WS / CORS origins (comma-separated WS_ALLOWED_ORIGINS; `*` = any). */
export function allowedOrigins(): string[] {
  const raw = process.env.WS_ALLOWED_ORIGINS?.trim();
  if (!raw) return ["*"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
