"use client";

/**
 * Elimination result (EliminationDesktop/EliminationMobile). Shows the voted-out
 * seat + the pot-health before→after delta — the ONLY human-vs-AI signal
 * mid-game (a −10% drop means a human was sent home; no change means an AI was
 * caught). No vote counts, no identities. The "Continue" advances when the next
 * round_started / settlement arrives; if game over, the shell routes to /result.
 */
import { Avatar, Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer, findSeat } from "@/lib/game/seat";

export function EliminationView() {
  const round = useGameStore((s) => s.round);
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const eliminated = useGameStore((s) => s.lastEliminatedSeatIds);
  const pct = useGameStore((s) => s.potHealthPct);
  const prevPct = useGameStore((s) => s.prevPotHealthPct);
  const gameOver = useGameStore((s) => s.gameOver);

  const seat = eliminated[0] ? findSeat(roster, eliminated[0]) : undefined;
  const dropped = pct < prevPct;

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
          {seat ? `${seat.codename} was voted out.` : "Resolved."}
        </h1>
        <p className="mb-6 mt-[14px]" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
          The table reached the most votes. They&apos;re gone for good.
        </p>

        <div className="rounded-[18px] p-[22px]" style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.35)" }}>
          <div className="flex items-center justify-between">
            <Eyebrow color={dropped ? C.berryHi : C.purple}>POT HEALTH</Eyebrow>
            <div className="flex items-center gap-[10px]">
              <span style={{ font: `400 18px/1 ${DISP}`, color: C.faint, textDecoration: dropped ? "line-through" : "none" }}>
                {prevPct}%
              </span>
              {dropped && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke={C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ font: `500 30px/1 ${DISP}`, color: C.berryHi }}>{pct}%</span>
                </>
              )}
            </div>
          </div>
          <p className="mt-3 text-left" style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>
            {dropped ? (
              <>
                <span style={{ color: C.berryHi, fontWeight: 600 }}>−{prevPct - pct}%.</span> The pool took a hit — that means you sent a <span style={{ color: C.text }}>human</span> home. The AI is still at the table.
              </>
            ) : (
              <>
                <span style={{ color: C.purple, fontWeight: 600 }}>No change.</span> The pool held — you caught an <span style={{ color: C.text }}>AI</span>. Keep going.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex justify-center lg:justify-start">
          <Btn variant="primary" style={{ height: 50, padding: "0 28px" }} disabled>
            {gameOver ? "REVEALING…" : `CONTINUE TO ROUND ${round + 1}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}
