import type { GamePhase, PublicSeat, ViewerStatus } from "@ai-impostor/shared";
import { type GameState, toPublicSeat } from "../game/types.js";

/**
 * ======================================================================
 *  THE ANTI-LEAK CHOKE POINT (HARD invariant — standards.md §1, SPEC §4).
 * ======================================================================
 *
 * projectStateForRecipient() is the ONLY function permitted to turn the
 * authoritative server GameState into something bound for a client socket.
 * Every server→client snapshot/resync flows through here.
 *
 * It MUST NEVER include, for ALIVE_HUMAN or SPECTATOR during a live game:
 *   - aiCount / humanCount (or any human/AI split)
 *   - AI identities (isAI on any seat)
 *   - vote tallies or who-voted-whom
 *   - absolute MON / pool size (only Pot Health % is allowed)
 *
 * Pot Health is a percentage derived from pool/startPool, rounded — identical
 * regardless of AI count, so it leaks nothing. Absolute MON + AI reveal happen
 * ONLY in the separate `settlement` event (settlement/settle.ts).
 *
 * The returned `ProjectedState` shape is intentionally minimal and contains NO
 * field capable of holding a forbidden value, by construction.
 */

export type RecipientRole = "ALIVE_HUMAN" | "SPECTATOR";

/** The full set of fields a client is ever allowed to see mid-game. */
export interface ProjectedState {
  gameId: string;
  phase: GamePhase;
  round: number;
  phaseEndsAt: number;
  /** Uniform roster — PublicSeat carries NO isAI. */
  roster: PublicSeat[];
  /** This viewer's seat. */
  mySeatId: string;
  /** Whether the viewer may act (alive) or is read-only (spectator). */
  viewerStatus: ViewerStatus;
  /** Pot Health as an integer percent in [0,100]. NEVER absolute MON. */
  potHealthPct: number;
}

/** Pot Health % from live pool / start pool. Rounded to an int in [0,100]. */
export function potHealthPct(startPool: bigint, pool: bigint): number {
  if (startPool <= 0n) return 100;
  // Compute in basis points then round to whole percent to avoid float drift.
  const bps = (pool * 10000n) / startPool;
  const pct = Math.round(Number(bps) / 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Build the client-bound projection for one recipient. `role` selects whether
 * the viewer is treated as an alive actor or a read-only spectator; `seatId` is
 * the recipient's own seat (used only to set mySeatId/viewerStatus — never to
 * expose anything about other seats).
 *
 * SECURITY: this function reads `game.seats` (which contains secrets) but only
 * ever emits `toPublicSeat(...)` (which strips isAI) and a derived Pot Health
 * percent. There is no code path here that copies isAI, votes, counts, or
 * absolute MON into the output.
 */
export function projectStateForRecipient(
  game: GameState,
  role: RecipientRole,
  seatId: string,
): ProjectedState {
  const roster: PublicSeat[] = game.seatOrder.map((id) => {
    const seat = game.seats.get(id)!;
    return toPublicSeat(seat); // strips isAI by construction
  });

  const viewerStatus: ViewerStatus = role === "ALIVE_HUMAN" ? "alive" : "spectator";

  return {
    gameId: game.gameId,
    phase: game.phase,
    round: game.round,
    phaseEndsAt: game.phaseEndsAt,
    roster,
    mySeatId: seatId,
    viewerStatus,
    potHealthPct: potHealthPct(game.startPool, game.pool),
  };
}
