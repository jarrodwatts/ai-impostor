import { config } from "../config.js";

/**
 * Human-cadence simulation (HARD invariant, standards.md §6 / SPEC §8.2).
 *
 * The AI's primary blend-in surface is timing. The runner MUST:
 *   1. Generate the message text FIRST (so Claude latency is absorbed),
 *   2. wait a randomized think-delay,
 *   3. show the "typing…" indicator,
 *   4. wait a length-proportional typing duration,
 *   5. THEN post the message and clear typing.
 *
 * This module is pure timing math + a seedable RNG so sims are reproducible.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
}

/** Mulberry32 — small, deterministic PRNG for reproducible sims. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

function randRange(rng: Rng, lo: number, hi: number): number {
  return lo + rng.next() * (hi - lo);
}

export interface CadenceTiming {
  /** ms to wait before showing typing (think delay). */
  thinkMs: number;
  /** ms to "type" before posting (proportional to message length). */
  typingMs: number;
}

/**
 * Compute think + typing delays for a message. `wpm` lets a persona type
 * faster/slower; clamped into the configured band.
 */
export function computeCadence(
  textLength: number,
  wpm: number,
  rng: Rng,
): CadenceTiming {
  const thinkMs = Math.round(
    randRange(rng, config.AI_MIN_THINK_MS, config.AI_MAX_THINK_MS),
  );
  const effectiveWpm = Math.max(
    config.AI_WPM_MIN,
    Math.min(config.AI_WPM_MAX, wpm),
  );
  // ~5 chars per word; typing time = words / (wpm/60) seconds.
  const words = Math.max(1, textLength / 5);
  const seconds = words / (effectiveWpm / 60);
  // Add slight jitter so durations don't look mechanical.
  const jitter = randRange(rng, 0.85, 1.2);
  const typingMs = Math.round(seconds * 1000 * jitter);
  return { thinkMs, typingMs };
}

/** Total wall-clock for a turn (think + typing). */
export function totalCadenceMs(t: CadenceTiming): number {
  return t.thinkMs + t.typingMs;
}
