"use client";

/**
 * In-game PhaseRouter. Renders Discussion / RoundPrompt / Vote / VoteWaiting /
 * Elimination / Spectator strictly off the AUTHORITATIVE `phase` + this viewer's
 * `viewerStatus` + `hasVoted` — the client never advances phase locally. A
 * spectator (eliminated) collapses to the read-only discussion view in every
 * non-terminal phase (spectator no-reveal). Settlement is handled by /result via
 * the shell's redirect.
 */
import { useGameStore } from "@/lib/game/store";
import { uiPhaseFor } from "@/lib/game/phase";
import { C } from "@/components/primitives";
import { DiscussionView } from "./phases/discussion-view";
import { PromptView } from "./phases/prompt-view";
import { VoteView } from "./phases/vote-view";
import { VoteWaitingView } from "./phases/vote-waiting-view";
import { EliminationView } from "./phases/elimination-view";

export default function PlayPage() {
  const phase = useGameStore((s) => s.phase);
  const viewerStatus = useGameStore((s) => s.viewerStatus);
  const hasVoted = useGameStore((s) => s.hasVoted);
  const connected = useGameStore((s) => s.connected);
  const gameId = useGameStore((s) => s.gameId);

  if (!connected || !gameId) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: C.faint }}>
        Connecting to the table…
      </div>
    );
  }

  const ui = uiPhaseFor(phase, viewerStatus, hasVoted);

  switch (ui) {
    case "prompt":
      return <PromptView />;
    case "vote":
      return <VoteView />;
    case "vote_waiting":
      return <VoteWaitingView />;
    case "elimination":
      return <EliminationView />;
    case "discussion":
      // alive players AND spectators share this view (read-only for spectators)
      return <DiscussionView />;
    default:
      return (
        <div className="flex flex-1 items-center justify-center" style={{ color: C.faint }}>
          Waiting for the next round…
        </div>
      );
  }
}
