import type { GamePhase, PublicSeat } from "@ai-impostor/shared";

/**
 * Server-internal game types. These carry the secrets (isAI, votes, absolute
 * MON) that must NEVER reach a client except through the settlement reveal.
 * The ONLY function permitted to turn this into a client payload is
 * projectStateForRecipient() in ws/broadcast.ts.
 */

/** A seat's role from the perspective of the server. */
export type SeatRole = "HUMAN" | "AI";

/** Server-side seat record — superset of the public projection. */
export interface SeatRecord {
  seatId: string;
  codename: string;
  avatarColor: string;
  /** SECRET: whether this seat is an AI agent. Never projected mid-game. */
  isAI: boolean;
  /** Whether the seat is still in the game. */
  alive: boolean;
  /** 0x address that funded this seat (humans only; AI fund $0). */
  funderAddress: string | null;
  /** AI persona key (null for humans). */
  personaKey: string | null;
}

/** A single recorded vote within a round (SECRET — never broadcast). */
export interface VoteRecord {
  round: number;
  voterSeatId: string;
  targetSeatId: string;
  ts: number;
}

/** Snapshot of a chat message (broadcast, but stored append-only too). */
export interface MessageRecord {
  msgId: string;
  round: number;
  seatId: string; // "system" for prompts
  text: string;
  ts: number;
}

/** Outcome of the whole game. */
export type GameOutcome = "HUMAN_WIN" | "AI_WIN" | "ABORTED" | null;

/**
 * Authoritative server-side game state. Money is tracked in wei as bigint.
 * `pool` is the live pool in wei; `startPool` is the original.
 */
export interface GameState {
  gameId: string;
  /** Numeric gameId for the on-chain settlement (uint256). */
  gameIdNum: bigint;
  phase: GamePhase;
  round: number;
  /** Server-stamped epoch ms when the current phase ends (0 if none). */
  phaseEndsAt: number;
  seats: Map<string, SeatRecord>;
  /** Deterministic seat ordering for stable rosters. */
  seatOrder: string[];
  /** Per-round votes: round -> (voterSeatId -> targetSeatId). Secret ballot. */
  votes: Map<number, Map<string, string>>;
  buyInWei: bigint;
  /** Original pool = (#humans) * buyIn. */
  startPool: bigint;
  /** Current pool in wei (drops 10% per misvote round). */
  pool: bigint;
  /** Accumulated house take in wei (misvote cuts + AI-win pool). */
  houseWei: bigint;
  outcome: GameOutcome;
  /** Monotonic broadcast sequence number. */
  seq: number;
}

/** Count of living humans / AI for win checks. */
export function aliveCounts(seats: Iterable<SeatRecord>): {
  aliveHumans: number;
  aliveAI: number;
} {
  let aliveHumans = 0;
  let aliveAI = 0;
  for (const s of seats) {
    if (!s.alive) continue;
    if (s.isAI) aliveAI++;
    else aliveHumans++;
  }
  return { aliveHumans, aliveAI };
}

/** Build the client-safe PublicSeat (NO isAI). */
export function toPublicSeat(s: SeatRecord): PublicSeat {
  return {
    seatId: s.seatId,
    codename: s.codename,
    avatarColor: s.avatarColor,
    alive: s.alive,
  };
}
