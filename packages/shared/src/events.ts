import { z } from "zod";

/**
 * Authoritative WebSocket event-schema for AI Impostor — the contract the
 * front-end and game server share. Frozen in milestone M1(A).
 *
 * INVARIANT (anti-leak): no server→client payload below may ever carry
 * aiCount, humanCount, AI identities, vote tallies, or absolute MON during a
 * live game. AI identities + real MON appear ONLY in `settlement`.
 * The single emit path that enforces this is the server's
 * projectStateForRecipient() (apps/server/src/ws/broadcast.ts).
 */

export const GamePhase = z.enum([
  "LOBBY_FORMING",
  "LOBBY_COUNTDOWN",
  "ROUND_PROMPT",
  "ROUND_DISCUSSION",
  "CHAT_LOCKED",
  "VOTE_WINDOW",
  "RESOLVE",
  "SETTLEMENT",
  "COMPLETE",
  "ABORTED",
]);
export type GamePhase = z.infer<typeof GamePhase>;

/** A seat as seen by clients DURING a game — deliberately has NO isAI field. */
export const PublicSeat = z.object({
  seatId: z.string(),
  codename: z.string(),
  avatarColor: z.string(),
  alive: z.boolean(),
});
export type PublicSeat = z.infer<typeof PublicSeat>;

/** Viewer role drives what the client may render (alive can act; spectator is read-only). */
export const ViewerStatus = z.enum(["alive", "spectator"]);
export type ViewerStatus = z.infer<typeof ViewerStatus>;

/**
 * Client-visible mirror of server tunables (timings + lobby sizing). The server
 * is authoritative; this is a small read-only DTO so the web can size timers /
 * progress bars without hard-coding magic numbers. Deliberately carries NO
 * aiCount split — `minPlayers`/`maxSeats` are lobby caps, not human/AI counts.
 */
export const GameConfig = z.object({
  buyInWei: z.string(), // stringified wei; absolute MON, safe pre-game (no live pool)
  minPlayers: z.number().int().positive(), // humans required to start a countdown
  maxSeats: z.number().int().positive(), // total seats (humans + AI) in a game
  countdownMs: z.number().int().nonnegative(),
  discussionMs: z.number().int().nonnegative(),
  voteWindowMs: z.number().int().nonnegative(),
});
export type GameConfig = z.infer<typeof GameConfig>;

// ── Server → Client ────────────────────────────────────────────────
export const ServerEvent = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("queue_state"),
    seq: z.number(),
    position: z.number().int().nonnegative(), // 0 = front of FIFO
    waiting: z.number().int().nonnegative(), // total humans queued (NOT a game's AI/human split)
    config: GameConfig.optional(),
  }),
  z.object({
    t: z.literal("lobby_state"),
    seq: z.number(),
    phase: GamePhase,
    seatsFilled: z.number(), // total seats taken — NOT a human/AI split
    mySeatId: z.string().nullable(),
    countdownEndsAt: z.number().optional(),
  }),
  // On-chain demo lobby: the single shared open game a client may pay into.
  // Carries the absolute buyInWei (safe pre-game: known fixed B, no live pool)
  // and humansSeated/minHumans (lobby-fill progress — NOT an AI/human split of a
  // live game; AI seats don't exist until the game starts).
  z.object({
    t: z.literal("lobby_open"),
    seq: z.number(),
    gameId: z.string(), // numeric on-chain gameId, stringified
    escrowAddress: z.string(),
    buyInWei: z.string(),
    minHumans: z.number().int().positive(),
    humansSeated: z.number().int().nonnegative(),
    countdownEndsAt: z.number().optional(),
  }),
  z.object({
    t: z.literal("join_rejected"),
    seq: z.number(),
    reason: z.string(),
  }),
  z.object({
    t: z.literal("game_started"),
    seq: z.number(),
    gameId: z.string(),
    roster: z.array(PublicSeat),
    mySeatId: z.string(),
    viewerStatus: ViewerStatus,
    potHealthPct: z.literal(100),
  }),
  z.object({
    t: z.literal("round_started"),
    seq: z.number(),
    round: z.number(),
    promptText: z.string(),
    phaseEndsAt: z.number(),
  }),
  z.object({
    t: z.literal("phase_changed"),
    seq: z.number(),
    round: z.number(),
    phase: GamePhase,
    phaseEndsAt: z.number(),
  }),
  z.object({
    t: z.literal("chat_message"),
    seq: z.number(),
    msgId: z.string(),
    seatId: z.string(), // "system" for round prompts
    text: z.string(),
    ts: z.number(),
  }),
  z.object({
    t: z.literal("typing"),
    seq: z.number(),
    seatId: z.string(),
    isTyping: z.boolean(),
  }),
  z.object({
    t: z.literal("vote_open"),
    seq: z.number(),
    round: z.number(),
    phaseEndsAt: z.number(),
    eligibleTargets: z.array(z.string()),
  }),
  z.object({
    t: z.literal("vote_ack"),
    seq: z.number(),
    round: z.number(),
    accepted: z.boolean(),
    reason: z.string().optional(),
  }),
  z.object({
    t: z.literal("round_resolved"),
    seq: z.number(),
    round: z.number(),
    eliminatedSeatIds: z.array(z.string()), // NO vote counts
    potHealthPct: z.number(),
    gameOver: z.boolean(),
  }),
  z.object({
    t: z.literal("you_eliminated"),
    seq: z.number(),
    round: z.number(),
  }),
  z.object({
    t: z.literal("settlement"),
    seq: z.number(),
    gameId: z.string(),
    // first and only reveal of AI identities + absolute MON — see settlement.ts
    payload: z.unknown(),
  }),
  z.object({
    t: z.literal("resync"),
    seq: z.number(),
    snapshot: z.unknown(),
  }),
  z.object({
    t: z.literal("error"),
    seq: z.number(),
    code: z.string(),
    message: z.string(),
  }),
]);
export type ServerEvent = z.infer<typeof ServerEvent>;

// ── Client → Server ────────────────────────────────────────────────
export const ClientEvent = z.discriminatedUnion("t", [
  z.object({ t: z.literal("join_queue"), buyInTxRef: z.string() }),
  z.object({ t: z.literal("leave_queue") }),
  // On-chain demo handshake: ask to join the current open game (server replies
  // lobby_open), then confirm the on-chain buy-in payment by tx hash.
  z.object({ t: z.literal("request_join"), address: z.string() }),
  z.object({
    t: z.literal("confirm_payment"),
    gameId: z.string(),
    address: z.string(),
    txHash: z.string(),
  }),
  z.object({ t: z.literal("send_message"), clientMsgId: z.string(), text: z.string() }),
  z.object({ t: z.literal("set_typing"), isTyping: z.boolean() }),
  z.object({ t: z.literal("cast_vote"), round: z.number(), targetSeatId: z.string() }),
  z.object({ t: z.literal("heartbeat") }),
  z.object({ t: z.literal("resync_request"), lastSeq: z.number() }),
]);
export type ClientEvent = z.infer<typeof ClientEvent>;
