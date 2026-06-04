"use client";

/**
 * Reveal / who-was-who screen — the money shot and the transition into the
 * pitch. Reads the `settlement` payload from the game store (the only source of
 * agent identities) and unmasks every seat as HUMAN or AGENT. NO pot, NO payout,
 * NO MON, NO tx — the demo has no economics. A "Play again" re-joins as a guest.
 */
import { useRouter } from "next/navigation";
import { Brand, Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { RevealGrid } from "@/components/game";
import { useGameStore } from "@/lib/game/store";

export default function ResultPage() {
  const router = useRouter();
  const settlement = useGameStore((s) => s.settlement);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const myVote = useGameStore((s) => s.myVote);

  if (!settlement) {
    return (
      <PageBg>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 style={{ font: `500 36px/1 ${DISP}`, color: C.text, letterSpacing: "-0.02em" }}>
            No reveal to show.
          </h1>
          <p style={{ font: `400 15px/1.5 ${SANS}`, color: C.muted }}>
            This round hasn&apos;t finished in this session.
          </p>
          <Btn variant="primary" onClick={() => router.push("/queue")}>
            JOIN THE TABLE
          </Btn>
        </div>
      </PageBg>
    );
  }

  const agentCount = settlement.aiReveal.length;

  // What did this viewer do? Build the headline callout off their own vote.
  const votedSeat =
    myVote != null
      ? settlement.roster.find((s) => s.seatId === myVote)
      : undefined;
  const votedWasAgent = votedSeat?.wasAI ?? false;

  const callout = (() => {
    if (!votedSeat) {
      return {
        tone: C.muted,
        text: (
          <>You didn&apos;t vote — but the agents were at the table the whole time.</>
        ),
      };
    }
    if (votedWasAgent) {
      return {
        tone: C.purple,
        text: (
          <>
            You called it.{" "}
            <span style={{ color: C.purple, fontWeight: 600 }}>{votedSeat.codename}</span>{" "}
            really was an agent.
          </>
        ),
      };
    }
    return {
      tone: C.berryHi,
      text: (
        <>
          You were sure{" "}
          <span style={{ color: C.berryHi, fontWeight: 600 }}>{votedSeat.codename}</span>{" "}
          was human… they were too. The agents slipped past you.
        </>
      ),
    };
  })();

  const myAgentLabel = (() => {
    const me = mySeatId
      ? settlement.roster.find((s) => s.seatId === mySeatId)
      : undefined;
    if (!me) return null;
    return me.wasAI ? "You were an agent." : "You were human.";
  })();

  return (
    <div className="relative flex min-h-dvh flex-col" style={{ background: C.bg }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 30% 25%, rgba(224,58,139,0.16), transparent 65%)",
        }}
      />
      <div className="relative grid flex-1 grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
        {/* headline */}
        <div
          className="flex flex-col justify-center px-6 py-12 lg:border-r lg:px-14"
          style={{ borderColor: C.lineSoft }}
        >
          <Brand size={16} sub={false} />
          <div className="mt-10">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-[14px] py-[7px]"
              style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.4)" }}
            >
              <span
                className="animate-ai-pulse"
                style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi }}
              />
              <Eyebrow color={C.berryHi}>THE REVEAL</Eyebrow>
            </div>
            <h1
              className="text-5xl lg:text-[74px]"
              style={{ font: `500 1em/0.96 ${DISP}`, letterSpacing: "-0.04em", color: C.text }}
            >
              Agents <span style={{ color: C.berryHi }}>among us.</span>
            </h1>
            <p
              className="mt-6 max-w-md"
              style={{ font: `400 17px/1.55 ${SANS}`, color: callout.tone }}
            >
              {callout.text}
            </p>
          </div>

          <div className="mt-9 flex items-center gap-9">
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.berryHi }}>{agentCount}</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: "block" }}>
                AGENTS AT THE TABLE
              </Eyebrow>
            </div>
            {myAgentLabel && (
              <div>
                <div style={{ font: `500 18px/1.1 ${DISP}`, color: C.text }}>{myAgentLabel}</div>
                <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 8, display: "block" }}>
                  YOUR SEAT
                </Eyebrow>
              </div>
            )}
          </div>

          <div className="mt-9 flex gap-3">
            <Btn
              variant="berry"
              style={{ height: 52, padding: "0 30px" }}
              onClick={() => router.push("/queue")}
            >
              PLAY AGAIN
            </Btn>
          </div>
          <div
            className="mt-5 flex items-center gap-[10px]"
            style={{ font: `400 11px/1 ${MONO}`, color: C.faint, letterSpacing: "0.06em" }}
          >
            EVERY SEAT UNMASKED · BERRY = AGENT
          </div>
        </div>

        {/* who-was-who grid */}
        <div className="flex flex-col justify-center px-6 py-10 lg:px-12">
          <Eyebrow color={C.faint} style={{ marginBottom: 18, display: "block" }}>
            WHO WAS WHO
          </Eyebrow>
          <RevealGrid roster={settlement.roster} mySeatId={mySeatId} myVoteSeatId={myVote} />
        </div>
      </div>
    </div>
  );
}
