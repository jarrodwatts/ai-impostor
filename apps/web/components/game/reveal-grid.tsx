"use client";

/**
 * End-game reveal grid. The FIRST and ONLY place AI identities surface — driven
 * by the `SettlementReveal.roster` (each seat carries `wasAI` + `survived`).
 * Recreates `RevealSeat` from screens-endgame.jsx (berry glow + AI/HUMAN tag).
 */
import { Avatar, Tag, C, MONO } from "@/components/primitives";
import type { RevealSeat } from "@ai-impostor/shared";

function RevealSeatCard({
  seat,
  mySeatId,
  myVoteSeatId,
  big = false,
}: {
  seat: RevealSeat;
  mySeatId: string | null;
  myVoteSeatId: string | null;
  big?: boolean;
}) {
  const isAI = seat.wasAI;
  const you = seat.seatId === mySeatId;
  const yourVote = myVoteSeatId != null && seat.seatId === myVoteSeatId;
  const size = big ? 56 : 44;

  return (
    <div
      className="relative flex flex-col items-center gap-[9px] rounded-2xl"
      style={{
        padding: big ? "18px 10px" : "14px 6px",
        background: isAI ? C.berrySoft : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${isAI ? "rgba(224,58,139,0.5)" : C.line}`,
        boxShadow: isAI ? "0 0 26px rgba(224,58,139,0.22)" : "none",
      }}
    >
      <Avatar
        p={{ id: seat.seatId, name: seat.codename, c: seat.avatarColor }}
        size={size}
        dead={!seat.survived}
        ring={isAI ? C.berryHi : undefined}
      />
      <div className="text-center">
        <div
          style={{
            font: `500 ${big ? 11 : 10}px/1.1 ${MONO}`,
            letterSpacing: "0.04em",
            color: seat.survived ? C.text : C.faint,
          }}
        >
          {seat.codename}
          {you ? " · YOU" : ""}
        </div>
      </div>
      <Tag tone={isAI ? "ai" : "human"}>{isAI ? "AI" : "HUMAN"}</Tag>
      {yourVote && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{
            top: -9,
            padding: "3px 8px",
            borderRadius: 9999,
            background: C.purple,
            font: `600 8px/1 ${MONO}`,
            letterSpacing: "0.08em",
            color: "#fff",
          }}
        >
          YOUR VOTE ✓
        </div>
      )}
    </div>
  );
}

export function RevealGrid({
  roster,
  mySeatId,
  myVoteSeatId,
}: {
  roster: RevealSeat[];
  mySeatId: string | null;
  myVoteSeatId: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {roster.map((seat) => (
        <RevealSeatCard
          key={seat.seatId}
          seat={seat}
          mySeatId={mySeatId}
          myVoteSeatId={myVoteSeatId}
        />
      ))}
    </div>
  );
}
