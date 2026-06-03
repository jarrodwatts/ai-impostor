/**
 * Game-phase types + guards. The web NEVER advances phase locally — it only
 * reflects the authoritative `phase` from the server (or, in M4, the mock
 * server). These helpers classify the current phase so the PhaseRouter can pick
 * a screen, and derive countdown values purely from `phaseEndsAt`.
 */
import type { GamePhase, ViewerStatus } from "@ai-impostor/shared";

/** Discrete UI states the in-game PhaseRouter can render. */
export type UiPhase =
  | "prompt" // ROUND_PROMPT — full-screen prompt reveal
  | "discussion" // ROUND_DISCUSSION — chat + composer
  | "vote" // VOTE_WINDOW, not yet cast — vote grid
  | "vote_waiting" // VOTE_WINDOW, already cast — locked/waiting
  | "elimination" // RESOLVE — round result
  | "settlement" // SETTLEMENT/COMPLETE — handled by /result route
  | "lobby"; // LOBBY_* — handled by lobby route

export function isVotePhase(phase: GamePhase): boolean {
  return phase === "VOTE_WINDOW";
}

export function isChatPhase(phase: GamePhase): boolean {
  return phase === "ROUND_DISCUSSION";
}

export function isTerminalPhase(phase: GamePhase): boolean {
  return phase === "SETTLEMENT" || phase === "COMPLETE" || phase === "ABORTED";
}

/** Spectators (eliminated viewers) are read-only: never show vote/compose UI. */
export function canAct(viewerStatus: ViewerStatus): boolean {
  return viewerStatus === "alive";
}

/**
 * Map authoritative phase + per-viewer state to a UI phase. A spectator in the
 * vote window still watches discussion-style chat (no ballot), so they collapse
 * to a read-only discussion/spectator view rather than the vote grid.
 */
export function uiPhaseFor(
  phase: GamePhase,
  viewerStatus: ViewerStatus,
  hasVoted: boolean,
): UiPhase {
  switch (phase) {
    case "ROUND_PROMPT":
      return "prompt";
    case "ROUND_DISCUSSION":
    case "CHAT_LOCKED":
      return "discussion";
    case "VOTE_WINDOW":
      if (!canAct(viewerStatus)) return "discussion";
      return hasVoted ? "vote_waiting" : "vote";
    case "RESOLVE":
      return "elimination";
    case "SETTLEMENT":
    case "COMPLETE":
      return "settlement";
    default:
      return "lobby";
  }
}

/** Phase → accent tone + label for RoundPill, mirroring the design screens. */
export function phasePill(phase: GamePhase): { label: string; danger: boolean } {
  switch (phase) {
    case "ROUND_PROMPT":
      return { label: "STARTING", danger: false };
    case "ROUND_DISCUSSION":
      return { label: "DISCUSSION", danger: false };
    case "CHAT_LOCKED":
      return { label: "LOCKING", danger: false };
    case "VOTE_WINDOW":
      return { label: "VOTE", danger: true };
    case "RESOLVE":
      return { label: "RESULT", danger: false };
    default:
      return { label: "DISCUSSION", danger: false };
  }
}

/** mm:ss from a future epoch-ms deadline; clamps at 0:00. */
export function formatCountdown(phaseEndsAt: number | null, now: number): string {
  if (phaseEndsAt == null) return "0:00";
  const ms = Math.max(0, phaseEndsAt - now);
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
