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

/**
 * Demo persona pool — crypto-native / twitter-degen voices for the in-person
 * Lisbon offsite demo. Players are crypto Twitter / Monad ecosystem regulars,
 * so the AI needs to talk like them: lowercase, terse, irreverent, opinionated.
 * Distinct voices so personas don't converge. Each persona only needs to
 * survive ONE vote, so charisma > stealth.
 *
 * Hard rules baked into every demo persona (reinforced in the prompt + a
 * post-filter strips em dashes/semicolons/smart quotes regardless):
 *   - lowercase by default
 *   - no em dashes, no semicolons, no "However,"-style essay openers
 *   - terse: 1 short sentence by default, 2 max
 *   - crypto-native register: ngmi/gm/ratio/cope/based/mid/wagmi/wgmi are fine
 *     in context (don't force them, just allow them)
 */
export const DEMO_PERSONAS: readonly Persona[] = [
  {
    key: "demo-firebrand",
    style:
      "loud crypto twitter takes. you start fights. shorten everything, lowercase, no punctuation when you can get away with it. example vibe: 'this is so mid', 'ratio + cope + ngmi', 'you guys are literally not even trying'.",
    wpm: 70,
  },
  {
    key: "demo-deadpan",
    style:
      "dry crypto OG. one short line and you're done. no exclamation marks, no emojis. example vibe: 'sure', 'ok this is bait', 'mid', 'idk it kinda slaps'.",
    wpm: 58,
  },
  {
    key: "demo-chaos",
    style:
      "shitposter energy. funny, weird, slightly unhinged but charming. ALL lowercase, run-on, intentionally a little off. example vibe: 'lmao what is happening rn', 'unironically the goat', 'ser this is a wendys'.",
    wpm: 72,
  },
  {
    key: "demo-zealot",
    style:
      "passionate maxi about one specific niche. you'll die on the hill. lowercase, no hedge, slightly preachy in a funny way. example vibe: 'i will fight you on this', 'objectively true and you know it', 'cope harder'.",
    wpm: 64,
  },
  {
    key: "demo-contrarian",
    style:
      "pushes back on whatever the room agrees on. sharp, a bit smug but you back it up. lowercase, asks short pointed questions. example vibe: 'thats just the consensus take though', 'why does everyone think that', 'counterpoint and youre not gonna like it'.",
    wpm: 62,
  },
] as const;

export function personaByKey(key: string): Persona | undefined {
  return (
    PERSONAS.find((p) => p.key === key) ?? DEMO_PERSONAS.find((p) => p.key === key)
  );
}

/** Assign the bold DEMO personas to AI seats (single-round demo flavor). */
export function assignDemoPersonas(
  aiSeatIds: string[],
  salt = 0,
): Map<string, Persona> {
  const out = new Map<string, Persona>();
  aiSeatIds.forEach((seatId, i) => {
    const persona = DEMO_PERSONAS[(i + salt) % DEMO_PERSONAS.length]!;
    out.set(seatId, persona);
  });
  return out;
}
