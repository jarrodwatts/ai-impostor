import { describe, expect, it } from "vitest";
import {
  ClientEvent,
  GameConfig,
  PublicSeat,
  ServerEvent,
} from "./events.js";

const config: GameConfig = {
  buyInWei: "100000000000000000",
  minPlayers: 6,
  maxSeats: 10,
  countdownMs: 10_000,
  discussionMs: 90_000,
  voteWindowMs: 30_000,
};

const roster: PublicSeat[] = [
  { seatId: "s1", codename: "Falcon", avatarColor: "#836EF9", alive: true },
  { seatId: "s2", codename: "Otter", avatarColor: "#E03A8B", alive: true },
];

/**
 * One representative instance per ServerEvent `t` discriminant. Keep this list
 * exhaustive: every variant in events.ts must appear here (asserted below).
 */
const serverSamples: Record<string, ServerEvent> = {
  queue_state: { t: "queue_state", seq: 1, position: 3, waiting: 5, config },
  lobby_state: {
    t: "lobby_state",
    seq: 2,
    phase: "LOBBY_FORMING",
    seatsFilled: 4,
    mySeatId: null,
    countdownEndsAt: 1700000000000,
  },
  game_started: {
    t: "game_started",
    seq: 3,
    gameId: "g1",
    roster,
    mySeatId: "s1",
    viewerStatus: "alive",
    potHealthPct: 100,
  },
  round_started: {
    t: "round_started",
    seq: 4,
    round: 1,
    promptText: "What did you have for breakfast?",
    phaseEndsAt: 1700000090000,
  },
  phase_changed: {
    t: "phase_changed",
    seq: 5,
    round: 1,
    phase: "VOTE_WINDOW",
    phaseEndsAt: 1700000120000,
  },
  chat_message: {
    t: "chat_message",
    seq: 6,
    msgId: "m1",
    seatId: "s2",
    text: "eggs, obviously",
    ts: 1700000010000,
  },
  typing: { t: "typing", seq: 7, seatId: "s2", isTyping: true },
  vote_open: {
    t: "vote_open",
    seq: 8,
    round: 1,
    phaseEndsAt: 1700000120000,
    eligibleTargets: ["s1", "s2"],
  },
  vote_ack: { t: "vote_ack", seq: 9, round: 1, accepted: true },
  round_resolved: {
    t: "round_resolved",
    seq: 10,
    round: 1,
    eliminatedSeatIds: ["s2"],
    potHealthPct: 90,
    gameOver: false,
  },
  you_eliminated: { t: "you_eliminated", seq: 11, round: 1 },
  settlement: {
    t: "settlement",
    seq: 12,
    gameId: "g1",
    payload: { outcome: "HUMAN_WIN" },
  },
  resync: { t: "resync", seq: 13, snapshot: { phase: "RESOLVE" } },
  error: { t: "error", seq: 14, code: "BAD_INPUT", message: "nope" },
};

const clientSamples: Record<string, ClientEvent> = {
  join_queue: { t: "join_queue", buyInTxRef: "0xabc" },
  leave_queue: { t: "leave_queue" },
  send_message: { t: "send_message", clientMsgId: "c1", text: "hi" },
  set_typing: { t: "set_typing", isTyping: false },
  cast_vote: { t: "cast_vote", round: 1, targetSeatId: "s2" },
  heartbeat: { t: "heartbeat" },
  resync_request: { t: "resync_request", lastSeq: 12 },
};

/** Pull the set of literal discriminants out of a discriminated union schema. */
function discriminants(schema: typeof ServerEvent | typeof ClientEvent): string[] {
  return [...schema.options].map((opt) => opt.shape.t.value as string);
}

describe("ServerEvent", () => {
  it("covers every variant in the sample set", () => {
    expect(new Set(Object.keys(serverSamples))).toEqual(
      new Set(discriminants(ServerEvent)),
    );
  });

  for (const [name, value] of Object.entries(serverSamples)) {
    it(`round-trips ${name}`, () => {
      const parsed = ServerEvent.parse(value);
      expect(parsed).toEqual(value);
      // JSON wire round-trip (what actually crosses the socket).
      expect(ServerEvent.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    });
  }
});

describe("ClientEvent", () => {
  it("covers every variant in the sample set", () => {
    expect(new Set(Object.keys(clientSamples))).toEqual(
      new Set(discriminants(ClientEvent)),
    );
  });

  for (const [name, value] of Object.entries(clientSamples)) {
    it(`round-trips ${name}`, () => {
      const parsed = ClientEvent.parse(value);
      expect(parsed).toEqual(value);
      expect(ClientEvent.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    });
  }
});

describe("anti-leak invariants", () => {
  it("PublicSeat has no isAI field", () => {
    expect("isAI" in PublicSeat.shape).toBe(false);
  });

  it("game_started potHealthPct is pinned to 100", () => {
    expect(() =>
      ServerEvent.parse({ ...serverSamples.game_started, potHealthPct: 99 }),
    ).toThrow();
  });
});
