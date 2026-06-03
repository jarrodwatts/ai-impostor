/**
 * Minimal v1 moderation (SPEC §8.10): basic profanity masking + PII redaction.
 * No human moderators, no report/block. Deliberately conservative — this is a
 * blend-in game, so we mask rather than reject where possible to avoid creating
 * a tell ("the bot never swears").
 */

const PROFANITY = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "piss",
];

// Simple PII patterns: emails, long digit runs (phones/cards), 0x addresses,
// and ETH-style seed-ish 64-hex strings.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g;
const ADDRESS_RE = /\b0x[a-fA-F0-9]{6,}\b/g;

const PROFANITY_RE = new RegExp(`\\b(${PROFANITY.join("|")})\\w*\\b`, "gi");

export interface FilterResult {
  text: string;
  changed: boolean;
}

function maskWord(w: string): string {
  if (w.length <= 1) return "*";
  return w[0]! + "*".repeat(w.length - 1);
}

/**
 * Sanitize an inbound chat message. Returns the cleaned text and whether any
 * change was made. Never throws.
 */
export function filterMessage(input: string): FilterResult {
  let text = input;
  const before = text;

  text = text.replace(EMAIL_RE, "[redacted]");
  text = text.replace(ADDRESS_RE, "[redacted]");
  text = text.replace(PHONE_RE, (m) => {
    // Only redact if it has enough digits to look like a phone/card.
    const digits = m.replace(/\D/g, "");
    return digits.length >= 9 ? "[redacted]" : m;
  });
  text = text.replace(PROFANITY_RE, (m) => maskWord(m));

  return { text, changed: text !== before };
}
