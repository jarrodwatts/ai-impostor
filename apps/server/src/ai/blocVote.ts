import { config } from "../config.js";
import type { Rng } from "./cadence.js";

/**
 * Bloc voting (SPEC §3, standards.md §6). When there are multiple AI, they see
 * each other's intended votes and pile onto a single human target to force an
 * elimination — this is what makes the parity win condition decisive. AI never
 * vote for each other.
 *
 * BLOC_COHESION (config) tunes how tightly the bloc converges:
 *   - 1.0 → every AI votes the shared target (full bloc).
 *   - <1.0 → each AI independently has a (1 - cohesion) chance to defect to a
 *     different eligible human, softening 4-AI near-certain eliminations.
 *
 * Votes are cast through the SAME cast path as humans (the runner calls the
 * game's castVote with these targets), preserving secret-ballot handling.
 */

export interface BlocPlan {
  /** seatId of each AI → chosen target seatId (a human). */
  assignments: Map<string, string>;
  /** The shared/primary target the bloc rallies behind. */
  primaryTarget: string;
}

/**
 * Decide the bloc's votes.
 *
 * @param aiSeatIds        living AI seat ids (the voters)
 * @param humanTargets     living human seat ids (eligible targets)
 * @param preferredTarget  the target the AI "agreed" on (e.g. most-suspicious
 *                         human surfaced by the LLM); falls back to the first
 *                         human if not provided/eligible.
 * @param rng              deterministic RNG for defection rolls
 * @param cohesion         override BLOC_COHESION (defaults to config)
 */
export function planBlocVote(
  aiSeatIds: string[],
  humanTargets: string[],
  preferredTarget: string | null,
  rng: Rng,
  cohesion: number = config.BLOC_COHESION,
): BlocPlan {
  const assignments = new Map<string, string>();
  if (humanTargets.length === 0) {
    return { assignments, primaryTarget: "" };
  }
  // Primary target: the preferred one if it's an eligible human, else first.
  const sortedHumans = [...humanTargets].sort();
  const primaryTarget =
    preferredTarget && humanTargets.includes(preferredTarget)
      ? preferredTarget
      : sortedHumans[0]!;

  for (const ai of aiSeatIds) {
    // Roll for cohesion: with probability `cohesion`, vote the primary target.
    if (rng.next() < cohesion || humanTargets.length === 1) {
      assignments.set(ai, primaryTarget);
    } else {
      // Defect to a different eligible human.
      const others = sortedHumans.filter((h) => h !== primaryTarget);
      const pick = others[Math.floor(rng.next() * others.length)] ?? primaryTarget;
      assignments.set(ai, pick);
    }
  }
  return { assignments, primaryTarget };
}
