/**
 * Central game + service tunables. All durations in milliseconds unless noted.
 * These are the knobs called out in SPEC.md and the build plan (.agent/plans.md).
 */
export const config = {
  // ── Lobby / matchmaking ──────────────────────────────────────────
  SEATS: 10,
  MIN_HUMANS: 6,
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

  // ── Chain ────────────────────────────────────────────────────────
  CHAIN_ID: 10_143, // Monad testnet
} as const;

export type Config = typeof config;
