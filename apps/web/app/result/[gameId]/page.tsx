"use client";

/**
 * Result / reveal route. Reads the `settlement` payload from the game store (the
 * ONLY source of AI identities + absolute MON). Renders the win reveal +
 * settlement breakdown (RevealWinDesktop + SettlementDesktop) or the loss reveal
 * (RevealLossDesktop). If no settlement is present (e.g. deep link), it falls
 * back to a prompt to play.
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Brand, Btn, Eyebrow, C, DISP, SANS } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { RevealGrid, ResultCard } from "@/components/game";
import { useGameStore } from "@/lib/game/store";

type View = "reveal" | "payout";

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const settlement = useGameStore((s) => s.settlement);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const myVote = useGameStore((s) => s.myVote);
  const [view, setView] = useState<View>("reveal");

  if (!settlement) {
    return (
      <PageBg>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 style={{ font: `500 36px/1 ${DISP}`, color: C.text, letterSpacing: "-0.02em" }}>
            No result to show.
          </h1>
          <p style={{ font: `400 15px/1.5 ${SANS}`, color: C.muted }}>
            This game hasn&apos;t settled in this session.
          </p>
          <Btn variant="primary" onClick={() => router.push("/queue")}>
            PLAY A GAME
          </Btn>
        </div>
      </PageBg>
    );
  }

  const isWin = settlement.outcome === "HUMAN_WIN";
  const aiCaught = settlement.aiReveal.length;
  const survivors = settlement.roster.filter((s) => s.survived && !s.wasAI).length;

  // ── Loss (AI_WIN) ───────────────────────────────────────────────
  if (!isWin) {
    return (
      <div className="relative flex min-h-dvh flex-col" style={{ background: C.bg }}>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 70% at 30% 30%, rgba(224,58,139,0.16), transparent 65%)" }}
        />
        <div className="relative grid flex-1 grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
          <div className="flex flex-col justify-center px-6 py-12 lg:border-r lg:px-14" style={{ borderColor: C.lineSoft }}>
            <Brand size={16} sub={false} />
            <div className="mt-10">
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-[14px] py-[7px]"
                style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.4)" }}
              >
                <span className="animate-ai-pulse" style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi }} />
                <Eyebrow color={C.berryHi}>PARITY REACHED</Eyebrow>
              </div>
              <h1 className="text-5xl lg:text-[76px]" style={{ font: `500 1em/0.98 ${DISP}`, letterSpacing: "-0.04em", color: C.text }}>
                The AI <span style={{ color: C.berryHi }}>win.</span>
              </h1>
              <p className="mt-5 max-w-md" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
                The impostors reached parity and bloc-voted as one. The house takes the entire pool.
              </p>
            </div>
            <div className="mt-9 flex gap-9">
              <Stat value="100%" label="HOUSE TOOK" />
              <Stat value={`${aiCaught}`} label="AI AT THE TABLE" />
            </div>
            <div className="mt-9 flex gap-3">
              <Btn variant="berry" style={{ height: 52, padding: "0 30px" }} onClick={() => router.push("/queue")}>
                RUN IT BACK
              </Btn>
              <Btn variant="tertiary" style={{ height: 52, padding: "0 26px" }} onClick={() => router.push(`/share/${gameId}`)}>
                SHARE
              </Btn>
            </div>
          </div>
          <div className="flex flex-col justify-center px-6 py-10 lg:px-12">
            <Eyebrow color={C.faint} style={{ marginBottom: 18, display: "block" }}>
              THEY WERE AI ALL ALONG
            </Eyebrow>
            <RevealGrid roster={settlement.roster} mySeatId={mySeatId} myVoteSeatId={myVote} />
          </div>
        </div>
      </div>
    );
  }

  // ── Win (HUMAN_WIN): reveal → payout ────────────────────────────
  return (
    <PageBg opacity={0.6} fade="ellipse 70% 80% at 50% 30%, black 0%, transparent 70%">
      {view === "reveal" ? (
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
          <div className="flex flex-col justify-center px-6 py-12 lg:border-r lg:px-14" style={{ borderColor: C.lineSoft }}>
            <Brand size={16} sub={false} />
            <div className="mt-10">
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-[14px] py-[7px]"
                style={{ background: "rgba(22,163,74,0.14)", border: "1px solid rgba(22,163,74,0.4)" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 9999, background: "#4ade80" }} />
                <Eyebrow color="#4ade80">GAME OVER</Eyebrow>
              </div>
              <h1 className="text-5xl lg:text-[76px]" style={{ font: `500 1em/0.98 ${DISP}`, letterSpacing: "-0.04em", color: C.text }}>
                Humans <span style={{ color: C.purple }}>win.</span>
              </h1>
              <p className="mt-5 max-w-md" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
                Every impostor was voted out before they reached parity. The surviving table splits the pool.
              </p>
            </div>
            <div className="mt-9 flex gap-7">
              <Stat value={`${aiCaught}`} label="AI CAUGHT" />
              <Stat value={`${survivors}`} label="SURVIVORS" />
            </div>
            <div className="mt-9">
              <Btn variant="primary" style={{ height: 52, padding: "0 30px" }} onClick={() => setView("payout")}>
                SEE PAYOUT
              </Btn>
            </div>
          </div>
          <div className="flex flex-col justify-center px-6 py-10 lg:px-12">
            <Eyebrow color={C.faint} style={{ marginBottom: 18, display: "block" }}>
              WHO WAS WHO
            </Eyebrow>
            <RevealGrid roster={settlement.roster} mySeatId={mySeatId} myVoteSeatId={myVote} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <ResultCard reveal={settlement} onContinue={() => router.push(`/share/${gameId}`)} />
        </div>
      )}
    </PageBg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ font: `500 34px/1 ${DISP}`, color: C.text }}>{value}</div>
      <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: "block" }}>
        {label}
      </Eyebrow>
    </div>
  );
}
