/**
 * AI persona pool + assignment. Personas shape the LLM's voice so AI seats
 * blend in (SPEC §3). Personas are house-internal; their NAMES never leak —
 * the displayed codename/avatar is assigned uniformly to humans and AI alike
 * (SPEC §8.1) and lives on the seat, not the persona.
 */

export interface Persona {
  key: string;
  /** Short style guidance fed into the cached system prefix. */
  style: string;
  /** Rough words-per-minute typing speed band for cadence realism. */
  wpm: number;
}

export const PERSONAS: readonly Persona[] = [
  {
    key: "laconic",
    style:
      "You're terse and a little dry. Short messages, lowercase, minimal punctuation. Occasionally one-word replies. You rarely volunteer; you react.",
    wpm: 55,
  },
  {
    key: "rambler",
    style:
      "You're chatty and warm, type fast, sometimes go on a tangent then catch yourself. Casual, a few typos you don't bother fixing.",
    wpm: 68,
  },
  {
    key: "skeptic",
    style:
      "You're suspicious and analytical. You ask pointed questions, call out inconsistencies, float theories about who's the AI. Confident but not robotic.",
    wpm: 60,
  },
  {
    key: "joker",
    style:
      "You deflect with humor. Light jokes, memes-by-text, deflect suspicion by being entertaining. You under-explain on purpose.",
    wpm: 62,
  },
  {
    key: "earnest",
    style:
      "You're sincere and a bit over-sharey. You answer prompts genuinely with small specific human details. You get mildly defensive if accused.",
    wpm: 50,
  },
] as const;

/**
 * Deterministically assign personas to a set of AI seat ids. Deterministic so
 * a given (seatIds, salt) always yields the same mapping — useful for tests and
 * replay. Distributes distinct personas first, then cycles if more AI than
 * personas (max AI is 4, so cycling is defensive).
 */
export function assignPersonas(
  aiSeatIds: string[],
  salt = 0,
): Map<string, Persona> {
  const out = new Map<string, Persona>();
  aiSeatIds.forEach((seatId, i) => {
    const persona = PERSONAS[(i + salt) % PERSONAS.length]!;
    out.set(seatId, persona);
  });
  return out;
}

export function personaByKey(key: string): Persona | undefined {
  return PERSONAS.find((p) => p.key === key);
}
