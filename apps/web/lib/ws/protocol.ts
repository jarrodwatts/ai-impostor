/**
 * WS protocol re-export. The authoritative schema lives in
 * @ai-impostor/shared (events.ts + settlement.ts) — this module is the single
 * import point the web app uses so call-sites never reach into the package path
 * directly, and so the mock + real socket share one type surface.
 *
 * ANTI-LEAK: the re-exported `ServerEvent`/`PublicSeat` types deliberately carry
 * no aiCount/humanCount/AI-identity/MON fields mid-game (see shared/events.ts).
 * AI identities + absolute MON live ONLY in `SettlementReveal`.
 */
export * from "@ai-impostor/shared";
