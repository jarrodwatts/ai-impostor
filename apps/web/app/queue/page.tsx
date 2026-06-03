"use client";

/**
 * Matchmaking / on-chain join screen. This is the live player-funded handshake:
 *
 *   request_join {address}  →  server: lobby_open {gameId, escrowAddress,
 *   buyInWei, minHumans, humansSeated}  →  user pays join(gameId) {value:buyInWei}
 *   on-chain  →  wait for receipt  →  confirm_payment {gameId, address, txHash}
 *   →  server seats us (game_started)  →  route into /play/[gameId].
 *
 * Buy-in amount + seating progress come from the server's lobby_open; useBuyIn()
 * reads the on-chain buyIn() as a display fallback before lobby_open arrives.
 * `join_rejected` surfaces a visible error with a retry. The mock path simulates
 * lobby_open + seating so this screen never dead-ends without a server.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Brand, Btn, Eyebrow, C, DISP, SANS } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { WalletButton, WalletChip } from "@/components/chrome/wallet-button";
import { FaucetButton } from "@/components/chrome/faucet-button";
import { useBuyIn, formatMon } from "@/lib/chain/use-escrow";
import { useLobbyJoin } from "@/lib/game/use-lobby-join";
import { isLiveSocket } from "@/lib/ws/factory";

export default function QueuePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { buyInWei } = useBuyIn();
  const {
    status,
    error,
    joinRejectedReason,
    lobby,
    gameId,
    payAndJoin,
    retry,
    canPay,
  } = useLobbyJoin();

  // Once the server seats us, head into the game.
  useEffect(() => {
    if (status === "seated" && gameId) router.push(`/play/${gameId}`);
  }, [status, gameId, router]);

  // Prefer the server's lobby buy-in; fall back to the on-chain read pre-lobby.
  const displayBuyIn = lobby ? BigInt(lobby.buyInWei) : buyInWei;
  const seated = lobby?.humansSeated ?? 0;
  const minHumans = lobby?.minHumans ?? 0;

  const ctaLabel = (() => {
    switch (status) {
      case "connecting":
        return "CONNECTING…";
      case "waiting_lobby":
        return "FINDING A TABLE…";
      case "paying":
        return "CONFIRM IN WALLET…";
      case "confirming":
        return "SEATING YOU…";
      case "seated":
        return "JOINED — ENTERING…";
      default:
        return `PAY ${formatMon(displayBuyIn)} MON & JOIN`;
    }
  })();

  const busy = status !== "ready";
  // Live path requires a connected wallet to pay the on-chain buy-in; the
  // mock/demo path does not (no real chain).
  const needsWallet = isLiveSocket() && !isConnected;

  return (
    <PageBg opacity={0.5} fade="ellipse 55% 60% at 50% 46%, black 0%, transparent 70%">
      <header
        className="flex h-16 flex-none items-center justify-between border-b px-5 lg:px-10"
        style={{ borderColor: C.lineSoft }}
      >
        <Brand size={18} />
        <div className="flex items-center gap-3">
          {isConnected ? <WalletChip /> : <WalletButton label="CONNECT" />}
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
            <span style={{ font: `500 26px/1 ${DISP}`, color: C.purple }}>
              {minHumans > 0 ? `${seated}/${minHumans}` : "10"}
            </span>
          </div>
        </div>

        <div className="text-center">
          <h1
            className="text-3xl lg:text-[40px]"
            style={{ font: `500 1em/1.05 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}
          >
            {lobby ? "Take your seat." : "Finding your table…"}
          </h1>
          <p
            className="mx-auto mt-3 max-w-sm"
            style={{ font: `400 15px/1.55 ${SANS}`, color: C.muted }}
          >
            {lobby ? (
              <>
                Pay the buy-in on-chain to join the table.{" "}
                <span style={{ color: C.text }}>
                  {seated}/{minHumans} seated
                </span>{" "}
                — some are AI, you won&apos;t be told how many.
              </>
            ) : (
              <>
                You&apos;ll join up to 9 others.{" "}
                <span style={{ color: C.text }}>1–4 are AI</span> — you won&apos;t be
                told how many.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-[14px]">
          {[
            ["BUY-IN", `${formatMon(displayBuyIn)} MON`],
            ["SEATED", minHumans > 0 ? `${seated}/${minHumans}` : "—"],
            ["SEATS", "10"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-2xl px-[14px] py-4 text-center"
              style={{ width: 130, background: C.bgRaise, border: `1px solid ${C.line}` }}
            >
              <div style={{ font: `500 20px/1 ${DISP}`, color: C.text }}>{v}</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 8, display: "block" }}>
                {k}
              </Eyebrow>
            </div>
          ))}
        </div>

        {(joinRejectedReason || error) && (
          <div
            className="max-w-sm rounded-[14px] px-4 py-3 text-center"
            style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.35)" }}
          >
            <p style={{ font: `400 13px/1.4 ${SANS}`, color: C.berryHi }}>
              {joinRejectedReason ?? error}
            </p>
            {joinRejectedReason && (
              <Btn variant="berry" size="sm" style={{ marginTop: 10 }} onClick={retry}>
                TRY AGAIN
              </Btn>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          {needsWallet ? (
            <WalletButton label="CONNECT WALLET TO JOIN" variant="primary" size="default" />
          ) : (
            <Btn
              variant="primary"
              style={{ height: 46, padding: "0 26px" }}
              onClick={payAndJoin}
              disabled={busy || !canPay}
            >
              {ctaLabel}
            </Btn>
          )}
          <FaucetButton variant="tertiary" size="sm" label="GET TEST MON" />
          <Btn variant="tertiary" size="sm" onClick={() => router.push("/")}>
            LEAVE QUEUE
          </Btn>
        </div>
      </div>
    </PageBg>
  );
}
