"use client";

/**
 * Round result (RESOLVE phase). Shows the voted-out seat, then hands off to the
 * reveal. No economics in the demo — no pot, no MON, no counts. AI identities
 * stay hidden until the reveal screen.
 */
import { Avatar, Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer, findSeat } from "@/lib/game/seat";

export function EliminationView() {
  const round = useGameStore((s) => s.round);
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const eliminated = useGameStore((s) => s.lastEliminatedSeatIds);

  const seat = eliminated[0] ? findSeat(roster, eliminated[0]) : undefined;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center lg:flex-row lg:gap-16">
      <div className="flex flex-col items-center">
        {seat && <Avatar p={seatToPlayer(seat, mySeatId)} size={120} dead />}
        {seat && (
          <div className="mt-[18px]" style={{ font: `500 12px/1 ${MONO}`, letterSpacing: "0.08em", color: C.faint, textDecoration: "line-through" }}>
            {seat.codename}
          </div>
        )}
      </div>

      <div className="max-w-md">
        <Eyebrow color={C.faint}>ROUND {round} · RESULT</Eyebrow>
        <h1 className="mt-3 text-3xl lg:text-[44px]" style={{ font: `500 1em/1.04 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
          {seat ? `${seat.codename} was voted out.` : "Votes are in."}
        </h1>
        <p className="mb-6 mt-[14px]" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
          The table reached the most votes. Were they an agent, or did the room read it wrong?
        </p>

        <div className="flex justify-center lg:justify-start">
          <Btn variant="primary" style={{ height: 50, padding: "0 28px" }} disabled>
            UNMASKING…
          </Btn>
        </div>
      </div>
    </div>
  );
}
