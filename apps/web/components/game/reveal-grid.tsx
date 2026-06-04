"use client";

/**
 * End-game reveal grid — the money shot. The FIRST and ONLY place agent
 * identities surface, driven by `SettlementReveal.roster` (each seat carries
 * `wasAI` + `survived`). Berry glow + "AGENT" tag for the AI seats; a banner on
 * YOUR vote calls out whether you read it right or got fooled.
 */
import { Avatar, Tag, C, MONO } from "@/components/primitives";
import type { RevealSeat } from "@ai-impostor/shared";

function RevealSeatCard({
  seat,
  mySeatId,
  myVoteSeatId,
}: {
  seat: RevealSeat;
  mySeatId: string | null;
  myVoteSeatId: string | null;
}) {
  const isAI = seat.wasAI;
  const you = seat.seatId === mySeatId;
  const yourVote = myVoteSeatId != null && seat.seatId === myVoteSeatId;
  // Did your vote land on an agent? Drives the "nailed it / fooled you" banner.
  const votedRight = yourVote && isAI;

  return (
    <div
      className="relative flex flex-col items-center gap-[9px] rounded-2xl"
      style={{
        padding: "16px 8px",
        background: isAI ? C.berrySoft : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${
          yourVote
            ? votedRight
              ? "rgba(131,110,249,0.7)"
              : "rgba(224,58,139,0.6)"
            : isAI
              ? "rgba(224,58,139,0.5)"
              : C.line
        }`,
        boxShadow: isAI ? "0 0 26px rgba(224,58,139,0.22)" : "none",
      }}
    >
      <Avatar
        p={{ id: seat.seatId, name: seat.codename, c: seat.avatarColor }}
        size={50}
        dead={!seat.survived}
        ring={isAI ? C.berryHi : undefined}
      />
      <div className="text-center">
        <div
          style={{
            font: `500 10px/1.1 ${MONO}`,
            letterSpacing: "0.04em",
            color: seat.survived ? C.text : C.faint,
          }}
        >
          {seat.codename}
          {you ? " · YOU" : ""}
        </div>
      </div>
      <Tag tone={isAI ? "ai" : "human"}>{isAI ? "AGENT" : "HUMAN"}</Tag>
      {yourVote && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{
            top: -9,
            padding: "3px 8px",
            borderRadius: 9999,
            background: votedRight ? C.purple : C.berryHi,
            font: `600 8px/1 ${MONO}`,
            letterSpacing: "0.08em",
            color: "#fff",
          }}
        >
          {votedRight ? "YOUR VOTE ✓" : "YOUR VOTE ✗"}
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
