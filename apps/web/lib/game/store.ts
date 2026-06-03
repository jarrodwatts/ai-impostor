/**
 * Authoritative client game state, driven entirely by server events.
 *
 * ANTI-LEAK BY CONSTRUCTION (standards.md §1): this state shape has NO field for
 * aiCount, humanCount, AI identities, vote tallies, or absolute MON during a
 * live game. PotHealth is a percentage only. AI identities + real MON live
 * exclusively in `settlement` (a SettlementReveal), which is the only reveal
 * surface and is consumed by the /result screen — never merged into game state.
 *
 * SECRET BALLOT (standards.md §2): `myVote` holds ONLY this viewer's own target.
 * It locks on first cast (`hasVoted`) and is never overwritten; there is no field
 * for any other player's vote, and no tally.
 *
 * The reducer `applyServerEvent` is a pure function (state, event) -> state so it
 * is unit-testable and identical whether fed by the mock or the real socket.
 */
import { create } from "zustand";
import type {
  PublicSeat,
  ServerEvent,
  ViewerStatus,
  GamePhase,
} from "@ai-impostor/shared";
// Value import (zod schema) — also usable in type positions. Needed for runtime
// validation of the settlement reveal payload below.
import { SettlementReveal } from "@ai-impostor/shared";

export type ChatEntry = {
  msgId: string;
  seatId: string; // "system" for round prompts
  text: string;
  ts: number;
  system: boolean;
};

export type GameState = {
  // identity / connection
  gameId: string | null;
  mySeatId: string | null;
  viewerStatus: ViewerStatus;
  connected: boolean;

  // table (PublicSeat carries NO isAI — see shared/events.ts)
  roster: PublicSeat[];

  // round / phase (authoritative; never advanced locally)
  phase: GamePhase;
  round: number;
  promptText: string | null;
  phaseEndsAt: number | null;

  // pot — PERCENT ONLY. No MON, ever, until settlement.
  potHealthPct: number;

  // chat / typing
  messages: ChatEntry[];
  typingSeatIds: string[];

  // secret ballot — only THIS viewer's own vote
  eligibleTargets: string[];
  myVote: string | null;
  hasVoted: boolean;
  voteRejectedReason: string | null;

  // pot health BEFORE the last resolution — lets the elimination screen show the
  // before→after delta (the only human-vs-AI signal mid-game). Percent only.
  prevPotHealthPct: number;

  // round result (seatIds only — no counts)
  lastEliminatedSeatIds: string[];
  gameOver: boolean;

  // reveal — the ONLY place AI identities + absolute MON appear
  settlement: SettlementReveal | null;

  lastSeq: number;
};

export const INITIAL_STATE: GameState = {
  gameId: null,
  mySeatId: null,
  viewerStatus: "alive",
  connected: false,
  roster: [],
  phase: "LOBBY_FORMING",
  round: 0,
  promptText: null,
  phaseEndsAt: null,
  potHealthPct: 100,
  prevPotHealthPct: 100,
  messages: [],
  typingSeatIds: [],
  eligibleTargets: [],
  myVote: null,
  hasVoted: false,
  voteRejectedReason: null,
  lastEliminatedSeatIds: [],
  gameOver: false,
  settlement: null,
  lastSeq: 0,
};

/**
 * Pure reducer: fold a single server event into game state. No side effects.
 * Out-of-order / duplicate events (seq <= lastSeq) are ignored except for the
 * always-idempotent message/typing streams which carry their own ids.
 */
export function applyServerEvent(state: GameState, ev: ServerEvent): GameState {
  switch (ev.t) {
    case "game_started":
      return {
        ...state,
        gameId: ev.gameId,
        mySeatId: ev.mySeatId,
        viewerStatus: ev.viewerStatus,
        roster: ev.roster,
        potHealthPct: ev.potHealthPct,
        phase: "ROUND_PROMPT",
        round: 0,
        gameOver: false,
        settlement: null,
        lastSeq: ev.seq,
      };

    case "round_started":
      return {
        ...state,
        round: ev.round,
        promptText: ev.promptText,
        phase: "ROUND_PROMPT",
        phaseEndsAt: ev.phaseEndsAt,
        // new round → reset this viewer's ballot + per-round result
        myVote: null,
        hasVoted: false,
        voteRejectedReason: null,
        eligibleTargets: [],
        lastEliminatedSeatIds: [],
        typingSeatIds: [],
        lastSeq: ev.seq,
      };

    case "phase_changed":
      return {
        ...state,
        round: ev.round,
        phase: ev.phase,
        phaseEndsAt: ev.phaseEndsAt,
        lastSeq: ev.seq,
      };

    case "chat_message": {
      // idempotent by msgId
      if (state.messages.some((m) => m.msgId === ev.msgId)) return state;
      const entry: ChatEntry = {
        msgId: ev.msgId,
        seatId: ev.seatId,
        text: ev.text,
        ts: ev.ts,
        system: ev.seatId === "system",
      };
      return {
        ...state,
        messages: [...state.messages, entry],
        // a delivered message clears that author's typing flag
        typingSeatIds: state.typingSeatIds.filter((s) => s !== ev.seatId),
        lastSeq: Math.max(state.lastSeq, ev.seq),
      };
    }

    case "typing": {
      const present = state.typingSeatIds.includes(ev.seatId);
      if (ev.isTyping === present) return state;
      return {
        ...state,
        typingSeatIds: ev.isTyping
          ? [...state.typingSeatIds, ev.seatId]
          : state.typingSeatIds.filter((s) => s !== ev.seatId),
      };
    }

    case "vote_open":
      return {
        ...state,
        phase: "VOTE_WINDOW",
        round: ev.round,
        phaseEndsAt: ev.phaseEndsAt,
        eligibleTargets: ev.eligibleTargets,
        // do not reset hasVoted here — a re-sent vote_open must not unlock a ballot
        lastSeq: ev.seq,
      };

    case "vote_ack":
      if (ev.accepted) {
        return { ...state, hasVoted: true, voteRejectedReason: null };
      }
      // rejected (e.g. recast attempt) — keep any existing lock, surface reason
      return { ...state, voteRejectedReason: ev.reason ?? "Vote rejected" };

    case "round_resolved": {
      const meEliminated =
        state.mySeatId != null &&
        ev.eliminatedSeatIds.includes(state.mySeatId);
      return {
        ...state,
        phase: "RESOLVE",
        round: ev.round,
        prevPotHealthPct: state.potHealthPct,
        potHealthPct: ev.potHealthPct,
        lastEliminatedSeatIds: ev.eliminatedSeatIds,
        gameOver: ev.gameOver,
        viewerStatus: meEliminated ? "spectator" : state.viewerStatus,
        roster: state.roster.map((s) =>
          ev.eliminatedSeatIds.includes(s.seatId) ? { ...s, alive: false } : s,
        ),
        lastSeq: ev.seq,
      };
    }

    case "you_eliminated":
      return { ...state, viewerStatus: "spectator" };

    case "settlement": {
      // The reveal payload is `unknown` on the wire (ServerEvent only validates
      // the envelope). Validate it here — this is the one payload carrying real
      // MON + AI identities, so a malformed reveal must be rejected, not rendered.
      const parsed = SettlementReveal.safeParse(ev.payload);
      if (!parsed.success) {
        // Drop the bad frame; stay in-phase rather than crash the reveal screen.
        return { ...state, lastSeq: ev.seq };
      }
      return {
        ...state,
        phase: "SETTLEMENT",
        settlement: parsed.data,
        lastSeq: ev.seq,
      };
    }

    case "error":
      return { ...state, voteRejectedReason: ev.message };

    // queue_state / lobby_state / resync handled by their own screens/stores
    default:
      return state;
  }
}

type GameStore = GameState & {
  setConnected: (connected: boolean) => void;
  /** Record this viewer's own pending vote target (optimistic; lock on ack). */
  setMyVote: (seatId: string) => void;
  apply: (ev: ServerEvent) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL_STATE,
  setConnected: (connected) => set({ connected }),
  setMyVote: (seatId) =>
    set((s) => (s.hasVoted ? s : { ...s, myVote: seatId })),
  apply: (ev) => set((s) => applyServerEvent(s, ev)),
  reset: () => set({ ...INITIAL_STATE }),
}));
