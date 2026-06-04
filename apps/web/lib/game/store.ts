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

  // on-chain demo lobby (pre-game only; all fields are safe before the game
  // starts — buyInWei is the fixed B and humansSeated/minHumans is lobby-fill
  // progress, NOT a human/AI split of a live game). Cleared/ignored once the
  // game begins; carries no mid-game leak.
  lobby: {
    gameId: string;
    escrowAddress: string;
    buyInWei: string;
    minHumans: number;
    humansSeated: number;
    countdownEndsAt?: number;
  } | null;
  joinRejectedReason: string | null;

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
  lobby: null,
  joinRejectedReason: null,
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
    // On-chain demo lobby: the single open game this client may pay into. All
    // fields are pre-game-safe (no human/AI split). Persist for the join CTA.
    case "lobby_open":
      return {
        ...state,
        lobby: {
          gameId: ev.gameId,
          escrowAddress: ev.escrowAddress,
          buyInWei: ev.buyInWei,
          minHumans: ev.minHumans,
          humansSeated: ev.humansSeated,
          countdownEndsAt: ev.countdownEndsAt,
        },
        joinRejectedReason: null,
        phase: "LOBBY_FORMING",
        lastSeq: ev.seq,
      };

    // The server refused the join (e.g. game full / payment not seen). Surface
    // the reason so the join screen can show it + offer a retry.
    case "join_rejected":
      return { ...state, joinRejectedReason: ev.reason, lastSeq: ev.seq };

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
        joinRejectedReason: null,
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
        // Safety net: no seat may remain in `typingSeatIds` once chat locks.
        // The server now also sweeps typing-off before broadcasting this event,
        // but clearing here makes the client robust to a missed OFF (network
        // jitter, throttled tab, dropped frame).
        typingSeatIds: [],
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
        // Defensive: eliminated seats cannot be typing. In practice the
        // phase_changed handler above already cleared the array; this filter
        // is insurance against a missed phase_changed or a future flow that
        // bypasses the lock-chat sweep.
        typingSeatIds: state.typingSeatIds.filter(
          (id) => !ev.eliminatedSeatIds.includes(id),
        ),
        gameOver: ev.gameOver,
        viewerStatus: meEliminated ? "spectator" : state.viewerStatus,
        roster: state.roster.map((s) =>
          ev.eliminatedSeatIds.includes(s.seatId) ? { ...s, alive: false } : s,
        ),
        lastSeq: ev.seq,
      };
    }

    case "you_eliminated":
      // Defensive: drop the viewer's own seat from typing if they had pressed
      // ON before being eliminated. Strict no-op in current wire order
      // (phase_changed:CHAT_LOCKED clears typingSeatIds first), but cheap
      // insurance against a dropped frame.
      return {
        ...state,
        viewerStatus: "spectator",
        typingSeatIds:
          state.mySeatId != null
            ? state.typingSeatIds.filter((id) => id !== state.mySeatId)
            : state.typingSeatIds,
      };

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
        // Final flush — no seat may appear as "typing…" on the reveal.
        typingSeatIds: [],
        lastSeq: ev.seq,
      };
    }

    case "lobby_state": {
      // Lobby-fill progress for the open game (seatsFilled is a total — NOT a
      // human/AI split). Mirror it into the lobby card's humansSeated + countdown
      // so the join screen reflects seating; ignored if no lobby is open.
      if (!state.lobby) return { ...state, lastSeq: ev.seq };
      return {
        ...state,
        lobby: {
          ...state.lobby,
          humansSeated: ev.seatsFilled,
          countdownEndsAt: ev.countdownEndsAt ?? state.lobby.countdownEndsAt,
        },
        phase: ev.phase,
        lastSeq: ev.seq,
      };
    }

    case "error":
      return { ...state, voteRejectedReason: ev.message };

    // queue_state / resync handled by their own screens/stores
    default:
      return state;
  }
}

type GameStore = GameState & {
  setConnected: (connected: boolean) => void;
  /** Record this viewer's own pending vote target (optimistic; lock on ack). */
  setMyVote: (seatId: string) => void;
  /** Clear a prior join rejection so the join CTA can be retried. */
  clearJoinRejected: () => void;
  apply: (ev: ServerEvent) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL_STATE,
  setConnected: (connected) => set({ connected }),
  setMyVote: (seatId) =>
    set((s) => (s.hasVoted ? s : { ...s, myVote: seatId })),
  clearJoinRejected: () => set({ joinRejectedReason: null }),
  apply: (ev) => set((s) => applyServerEvent(s, ev)),
  reset: () => set({ ...INITIAL_STATE }),
}));
