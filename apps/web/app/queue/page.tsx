"use client";

/**
 * Matchmaking queue (QueueDesktop/QueueMobile). Shows the radar, buy-in (read
 * via useBuyIn), and a JOIN action that fires the wagmi `join()` buy-in write
 * (wired against monadTestnet; may not execute live in M4) then routes to a
 * lobby. The mock auto-advances after a short search so the flow is demoable
 * without a wallet tx.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand, Btn, Eyebrow, C, DISP, SANS } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { WalletChip } from "@/components/chrome/wallet-button";
import { useBuyIn, useJoin, formatMon } from "@/lib/chain/use-escrow";

const LOBBY_ID = "4471";

export default function QueuePage() {
  const router = useRouter();
  const { buyInWei } = useBuyIn();
  const { join, isPending } = useJoin();
  const [searching, setSearching] = useState(true);

  // Auto-advance the demo to the lobby after a brief "search".
  useEffect(() => {
    const id = setTimeout(() => {
      setSearching(false);
      router.push(`/lobby/${LOBBY_ID}`);
    }, 4500);
    return () => clearTimeout(id);
  }, [router]);

  const onJoin = async () => {
    try {
      if (buyInWei != null) {
        // Wired for M5; ignore failures in M4 (no live contract) and continue.
        await join(BigInt(LOBBY_ID), buyInWei).catch(() => undefined);
      }
    } finally {
      router.push(`/lobby/${LOBBY_ID}`);
    }
  };

  return (
    <PageBg opacity={0.5} fade="ellipse 55% 60% at 50% 46%, black 0%, transparent 70%">
      <header className="flex h-16 flex-none items-center justify-between border-b px-5 lg:px-10" style={{ borderColor: C.lineSoft }}>
        <Brand size={18} />
        <div className="flex items-center gap-3">
          <WalletChip />
          <Eyebrow color={C.faint}>QUICK MATCH</Eyebrow>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
        {/* radar */}
        <div className="relative grid h-[200px] w-[200px] place-items-center">
          {[200, 148, 96].map((d, i) => (
            <div
              key={d}
              className="absolute rounded-full"
              style={{ width: d, height: d, border: `1px solid rgba(131,110,249,${0.28 - i * 0.06})` }}
            />
          ))}
          <div className="absolute h-[200px] w-[200px] overflow-hidden rounded-full">
            <div
              className="absolute inset-0 animate-spin"
              style={{
                background: "conic-gradient(from 0deg, transparent 0deg, rgba(131,110,249,0.35) 60deg, transparent 90deg)",
                animationDuration: "2.6s",
              }}
            />
          </div>
          <div
            className="grid place-items-center"
            style={{ width: 64, height: 64, borderRadius: 18, background: C.purpleSoft, border: "1px solid rgba(131,110,249,0.5)" }}
          >
            <span style={{ font: `500 26px/1 ${DISP}`, color: C.purple }}>10</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl lg:text-[40px]" style={{ font: `500 1em/1.05 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
            Finding your table…
          </h1>
          <p className="mx-auto mt-3 max-w-sm" style={{ font: `400 15px/1.55 ${SANS}`, color: C.muted }}>
            You&apos;ll join up to 9 others. <span style={{ color: C.text }}>1–4 are AI</span> — you won&apos;t be told how many.
          </p>
        </div>

        <div className="flex gap-[14px]">
          {[
            ["BUY-IN", `${formatMon(buyInWei)} MON`],
            ["EST. WAIT", "~12s"],
            ["SEATS", "10"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-2xl px-[14px] py-4 text-center"
              style={{ width: 130, background: C.bgRaise, border: `1px solid ${C.line}` }}
            >
              <div style={{ font: `500 20px/1 ${DISP}`, color: C.text }}>{v}</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 8, display: "block" }}>{k}</Eyebrow>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Btn variant="primary" style={{ height: 46, padding: "0 26px" }} onClick={onJoin} disabled={isPending}>
            {isPending ? "JOINING…" : "TAKE A SEAT NOW"}
          </Btn>
          <Btn variant="tertiary" style={{ height: 46, padding: "0 26px" }} onClick={() => router.push("/")}>
            LEAVE QUEUE
          </Btn>
        </div>
        {!searching && (
          <span style={{ font: `400 12px/1 ${SANS}`, color: C.faint }}>Seating you at the table…</span>
        )}
      </div>
    </PageBg>
  );
}
