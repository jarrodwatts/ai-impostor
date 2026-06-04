"use client";

/**
 * Vote phase (VoteDesktop/VoteMobile). A grid of eligible targets (alive, not
 * you). SECRET BALLOT: selecting is local; "LOCK VOTE" casts ONCE via
 * `cast_vote`. The store records only this viewer's own target; there is no
 * abstain control and no recast (locked on first ack).
 */
import { useState } from "react";
import { Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { VoteTargetCard } from "@/components/game";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer, findSeat } from "@/lib/game/seat";
import { useSend } from "../play-shell";

export function VoteView() {
  const send = useSend();
  const round = useGameStore((s) => s.round);
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const eligibleTargets = useGameStore((s) => s.eligibleTargets);
  const hasVoted = useGameStore((s) => s.hasVoted);
  const setMyVote = useGameStore((s) => s.setMyVote);
  const [selected, setSelected] = useState<string | null>(null);

  const targets = eligibleTargets
    .filter((id) => id !== mySeatId) // never offer your own seat (no self-votes)
    .map((id) => findSeat(roster, id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const selectedSeat = selected ? findSeat(roster, selected) : undefined;

  const lock = () => {
    if (!selected || hasVoted) return;
    setMyVote(selected); // record OUR own vote only
    send({ t: "cast_vote", round, targetSeatId: selected });
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-8">
      <div className="mb-6 text-center">
        <Eyebrow color={C.berryHi}>CAST YOUR VOTE</Eyebrow>
        <h1 className="mt-3 text-3xl lg:text-[44px]" style={{ fontFamily: DISP, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", color: C.text }}>
          Who is the AI?
        </h1>
        <p className="mt-[6px]" style={{ font: `400 14px/1.5 ${SANS}`, color: C.muted }}>
          One vote each. Most votes is eliminated — ties send everyone tied home.
        </p>
      </div>

      <div className="mb-7 grid w-full max-w-2xl grid-cols-3 gap-[9px] sm:grid-cols-5 lg:gap-3">
        {targets.map((s) => (
          <VoteTargetCard
            key={s.seatId}
            p={seatToPlayer(s, mySeatId)}
            selected={selected === s.seatId}
            locked={hasVoted}
            onSelect={setSelected}
          />
        ))}
      </div>

      <Btn variant="berry" style={{ height: 52, padding: "0 32px" }} disabled={!selected || hasVoted} onClick={lock}>
        {selectedSeat ? `LOCK VOTE · ${selectedSeat.codename}` : "SELECT A PLAYER"}
      </Btn>
      <div className="mt-[14px]" style={{ font: `400 11px/1 ${MONO}`, color: C.faint, letterSpacing: "0.06em" }}>
        SECRET BALLOT · LOCKED ON FIRST CAST · NO RECAST · NO ABSTAIN
      </div>
    </div>
  );
}
