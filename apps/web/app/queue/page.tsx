"use client";

/**
 * Guest join / lobby screen. Opens a guest session on the shared socket and
 * auto-advances into the game — no wallet, no faucet, no buy-in, no MON.
 *
 *   request_join {address:"guest"}  →  server seats us (demo mode)  →
 *   lobby_open / game_started  →  route into /play/[gameId].
 *
 * `join_rejected` surfaces a visible error with a retry. The mock path scripts
 * the same arc so this screen never dead-ends without a server.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brand, Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { useLobbyJoin } from "@/lib/game/use-lobby-join";
import { useNow } from "@/lib/game/use-now";
import { formatCountdown } from "@/lib/game/phase";

export default function QueuePage() {
  const router = useRouter();
  const { status, joinRejectedReason, lobby, gameId, retry } = useLobbyJoin();

  // Once the server seats us, head into the game.
  useEffect(() => {
    if (status === "seated" && gameId) router.push(`/play/${gameId}`);
  }, [status, gameId, router]);

  const now = useNow();
  // ANTI-LEAK: never display the human count (humansSeated). The demo backfills
  // the table to `seats` with AI, so "humans/seats" would reveal the human/AI
  // split — the one thing players must never be told. Show the fixed table size
  // (public: every game is 10 players) and a countdown to start instead.
  const tableSeats = lobby?.seats ?? 10;
  const startsIn = lobby?.countdownEndsAt
    ? formatCountdown(lobby.countdownEndsAt, now)
    : null;

  const headline = (() => {
    switch (status) {
      case "connecting":
        return "Connecting…";
      case "joining":
        return "Finding your table…";
      case "lobby":
        return "Starting soon…";
      case "seated":
        return "Seated — entering…";
    }
  })();

  const sub = (() => {
    switch (status) {
      case "lobby":
        return (
          <>
            You&apos;re in.{" "}
            <span style={{ color: C.text }}>{tableSeats} players</span> at the
            table — some are AI agents, you won&apos;t be told how many.
          </>
        );
      case "seated":
        return <>Dealing names and faces — the round is about to begin.</>;
      default:
        return (
          <>
            You&apos;ll join up to 9 others.{" "}
            <span style={{ color: C.text }}>Some are AI agents</span> — you
            won&apos;t be told how many.
          </>
        );
    }
  })();

  return (
    <PageBg opacity={0.5} fade="ellipse 55% 60% at 50% 46%, black 0%, transparent 70%">
      <header
        className="flex h-16 flex-none items-center justify-between border-b px-5 lg:px-10"
        style={{ borderColor: C.lineSoft }}
      >
        <Brand size={18} />
        <Eyebrow color={C.faint}>QUICK MATCH</Eyebrow>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
        {/* radar */}
        <div className="relative grid h-[200px] w-[200px] place-items-center">
          {[200, 148, 96].map((d, i) => (
            <div
              key={d}
              className="absolute rounded-full"
              style={{
                width: d,
                height: d,
                border: `1px solid rgba(131,110,249,${0.28 - i * 0.06})`,
              }}
            />
          ))}
          <div className="absolute h-[200px] w-[200px] overflow-hidden rounded-full">
            <div
              className="absolute inset-0 animate-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(131,110,249,0.35) 60deg, transparent 90deg)",
                animationDuration: "2.6s",
              }}
            />
          </div>
          <div
            className="grid place-items-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: C.purpleSoft,
              border: "1px solid rgba(131,110,249,0.5)",
            }}
          >
            <span
              style={{
                font: `500 ${startsIn ? 22 : 26}px/1 ${DISP}`,
                color: C.purple,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {startsIn ?? tableSeats}
            </span>
          </div>
        </div>

        <div className="text-center">
          <h1
            className="text-3xl lg:text-[40px]"
            style={{ fontFamily: DISP, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.text }}
          >
            {headline}
          </h1>
          <p
            className="mx-auto mt-3 max-w-sm"
            style={{ font: `400 15px/1.55 ${SANS}`, color: C.muted }}
          >
            {sub}
          </p>

          {/* Buy-in element (SIMULATED — no chain in the demo). Plants the
              stakes so the settlement reveal at the end pays it off. */}
          <div
            className="mx-auto mt-5 inline-flex items-center gap-[10px] rounded-full px-[14px] py-[7px]"
            style={{ background: C.purpleSoft, border: "1px solid rgba(131,110,249,0.3)" }}
          >
            <span style={{ font: `500 12px/1 ${MONO}`, color: C.purple, letterSpacing: "0.08em" }}>
              ENTRY · 1 MON
            </span>
            <span style={{ font: `400 10px/1 ${MONO}`, color: C.faint, letterSpacing: "0.1em" }}>
              SIMULATED
            </span>
          </div>
        </div>

        {joinRejectedReason && (
          <div
            className="max-w-sm rounded-[14px] px-4 py-3 text-center"
            style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.35)" }}
          >
            <p style={{ font: `400 13px/1.4 ${SANS}`, color: C.berryHi }}>
              {joinRejectedReason}
            </p>
            <Btn variant="berry" size="sm" style={{ marginTop: 10 }} onClick={retry}>
              TRY AGAIN
            </Btn>
          </div>
        )}

        <Btn variant="tertiary" size="sm" onClick={() => router.push("/")}>
          LEAVE
        </Btn>
      </div>
    </PageBg>
  );
}
