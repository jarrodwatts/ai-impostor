/**
 * Escalating round-prompt table (SPEC §2 / §8.3). Round 1 is a trivial
 * ice-breaker; later rounds get progressively deeper to surface behavioral
 * signal that helps humans spot the AI. Past the table, the deepest prompts
 * cycle so long games still get a prompt.
 */
const ROUND_PROMPTS: readonly string[] = [
  "Round 1 — Everyone say hello and tell us one word for how your day is going.",
  "Round 2 — What's a small thing that consistently makes you irrationally happy?",
  "Round 3 — Describe a time you were embarrassed. Keep it short.",
  "Round 4 — What's a hot take you actually believe? Defend it in one line.",
  "Round 5 — If you had to vote someone out right now on vibes alone, who and why?",
  "Round 6 — Tell us something true about yourself that's hard to fake.",
  "Round 7 — What's the last thing that genuinely surprised you this week?",
  "Round 8 — Final stretch. Make your case for why you're obviously human.",
] as const;

/** Get the system prompt text for a given 1-based round number. */
export function promptForRound(round: number): string {
  if (round < 1) return ROUND_PROMPTS[0]!;
  const idx = Math.min(round - 1, ROUND_PROMPTS.length - 1);
  return ROUND_PROMPTS[idx]!;
}

export const TOTAL_SCRIPTED_PROMPTS = ROUND_PROMPTS.length;
