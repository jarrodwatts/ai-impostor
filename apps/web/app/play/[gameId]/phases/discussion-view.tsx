"use client";

/**
 * Discussion phase (GameDesktop/GameMobile). Roster sidebar (desktop) + chat +
 * composer. Spectators render the SAME chat (spectator no-reveal) with a muted,
 * read-only composer and an "eliminated" banner.
 */
import { Roster, RosterStrip, ChatList, ChatComposer } from "@/components/game";
import { useGameStore } from "@/lib/game/store";
import { canAct } from "@/lib/game/phase";
import { useSend } from "../play-shell";
import { C, SANS } from "@/components/primitives";

export function DiscussionView() {
  const send = useSend();
  const viewerStatus = useGameStore((s) => s.viewerStatus);
  const isSpectator = !canAct(viewerStatus);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[288px_1fr]">
      <Roster className="hidden lg:flex" />
      <div className="flex min-h-0 flex-col">
        {/* mobile roster strip */}
        <div className="border-b px-4 pb-3 pt-2 lg:hidden" style={{ borderColor: C.lineSoft }}>
          <RosterStrip />
        </div>
        {isSpectator && <SpectatorBanner />}
        <ChatList />
        <ChatComposer send={send} disabled={isSpectator} />
      </div>
    </div>
  );
}

function SpectatorBanner() {
  return (
    <div
      className="m-4 flex items-center gap-3 rounded-[14px] px-[18px] py-[14px]"
      style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.35)" }}
    >
      <div
        className="grid flex-none place-items-center"
        style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(220,38,38,0.2)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M7 7l10 10M17 7L7 17" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1">
        <div style={{ font: `500 14px/1.2 ${SANS}`, color: "#f87171", marginBottom: 2 }}>
          You were eliminated — spectating
        </div>
        <div style={{ font: `400 12px/1.3 ${SANS}`, color: C.muted }}>
          Read-only and muted. No payout — only survivors split the pool. AI
          identities stay hidden until the game ends.
        </div>
      </div>
    </div>
  );
}
