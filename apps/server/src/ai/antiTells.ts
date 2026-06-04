/**
 * Anti-tell sanitizer for AI chat output. LLMs (Claude in particular) leak a
 * narrow set of typographic + lexical patterns that humans almost never use in
 * casual chat. Even when the system prompt forbids them, the model still
 * leaks them at non-zero rate. This is a belt-and-braces post-filter applied
 * to every AI message before broadcast (Game.postAiMessage → emitChat).
 *
 * Scope: ONLY applied to AI messages (humans are free to use whatever they
 * want; their habits ARE the signal humans are trying to detect).
 *
 * Removals (high-signal AI tells in informal chat):
 *   - em dash (—)      → " "   (top tell; almost no human types one in chat)
 *   - en dash  (–)     → "-"
 *   - smart quotes     → ascii equivalents
 *   - unicode ellipsis (…) → "..."
 *   - semicolons (;)   → ","   (no human uses a semicolon in chat)
 *   - "However," / "Moreover," / "Furthermore," opener → dropped
 *
 * NON-goals: this does NOT try to make a message sound human. It just removes
 * the most reliable typographic tells. Voice/register is the prompt's job.
 */

const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  // Em dash with surrounding spaces → single space. Handle "word—word" and
  // "word — word" both → "word word".
  [/\s*—\s*/g, " "],
  // En dash → hyphen.
  [/–/g, "-"],
  // Smart quotes → ascii.
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  // Unicode ellipsis → 3 dots.
  [/…/g, "..."],
  // Semicolons → commas. Negative lookahead spares emoticons (;) ;P ;D ;3).
  [/\s*;(?![)PD3pd])\s*/g, ", "],
];

// Lexical openers that scream "essay structure" in a chat reply.
const OPENER_RE = /^(however|moreover|furthermore|nevertheless|nonetheless|additionally|conversely|indeed)\b[\s,.:;-]*/i;

/**
 * Strip the most reliable AI tells from `text`. Idempotent. Returns the
 * sanitized string. Never throws.
 */
export function stripAiTells(text: string): string {
  let out = text;
  for (const [re, sub] of REPLACEMENTS) {
    out = out.replace(re, sub);
  }
  // Strip essay-openers iteratively at the start so a stacked
  // "However, Moreover, that's mid" doesn't survive half-stripped.
  // Bounded loop (max 3 iterations) — defensive, OPENER_RE only ever matches
  // at position 0 and consumes itself, so this is well-founded.
  for (let i = 0; i < 3; i++) {
    const next = out.replace(OPENER_RE, "");
    if (next === out) break;
    out = next;
  }
  // Collapse any double-spaces (em-dash replacement, " ; " collapse, etc.).
  out = out.replace(/  +/g, " ").trim();
  return out;
}
