"use client";

/**
 * Faucet / balance check (FaucetDesktop/FaucetMobile). Shows the wallet balance
 * vs the buy-in (read from the escrow via useBuyIn — mocked until M2 deploys).
 * Links to the Monad testnet faucet; "refresh" re-reads balance and, when funded,
 * routes to the queue.
 */
import { useRouter } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import { Brand, Btn, Eyebrow, C, DISP, SANS } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { WalletChip } from "@/components/chrome/wallet-button";
import { useBuyIn, formatMon } from "@/lib/chain/use-escrow";
import { monadTestnet } from "@/lib/wagmi";

const FAUCET_URL = "https://testnet.monad.xyz/";

export default function FaucetPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { data: balance, refetch } = useBalance({
    address,
    chainId: monadTestnet.id,
  });
  const { buyInWei } = useBuyIn();

  const balanceWei = balance?.value ?? 0n;
  const funded = buyInWei != null && balanceWei >= buyInWei;

  const onRefresh = async () => {
    await refetch();
    if (funded) router.push("/queue");
  };

  return (
    <PageBg opacity={0.5} fade="ellipse 60% 60% at 50% 38%, black 0%, transparent 70%">
      <header className="flex h-16 flex-none items-center justify-between border-b px-5 lg:px-10" style={{ borderColor: C.lineSoft }}>
        <Brand size={18} />
        <WalletChip />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl text-center">
          <div
            className="mx-auto mb-6 grid place-items-center"
            style={{ width: 64, height: 64, borderRadius: 18, background: C.berrySoft, border: "1px solid rgba(224,58,139,0.4)" }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z" stroke={C.berryHi} strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M12 8v4M12 15.5v.5" stroke={C.berryHi} strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl lg:text-[44px]" style={{ font: `500 1em/1.05 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
            You need test MON to sit down.
          </h1>
          <p className="mx-auto mt-4 max-w-md" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
            This table runs on Monad testnet. Grab free test MON from the faucet — it takes a few seconds — then jump back into the queue.
          </p>

          <div className="my-7 flex justify-center gap-[14px]">
            {[
              ["YOUR BALANCE", `${formatMon(balanceWei)} MON`],
              ["BUY-IN", `${formatMon(buyInWei)} MON`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-2xl p-[18px] text-left"
                style={{ background: C.bgRaise, border: `1px solid ${C.line}`, flex: "0 0 200px" }}
              >
                <Eyebrow color={C.faint} style={{ fontSize: 9 }}>{k}</Eyebrow>
                <div style={{ font: `500 28px/1 ${DISP}`, color: C.text, marginTop: 10 }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              <Btn variant="primary" style={{ height: 50, padding: "0 28px" }}>
                OPEN TESTNET FAUCET
              </Btn>
            </a>
            <Btn variant="tertiary" style={{ height: 50, padding: "0 24px" }} onClick={onRefresh}>
              I ALREADY HAVE MON — REFRESH
            </Btn>
          </div>
          {funded && (
            <p className="mt-4" style={{ font: `400 13px/1 ${SANS}`, color: "#4ade80" }}>
              Funded — heading to the queue…
            </p>
          )}
        </div>
      </div>
    </PageBg>
  );
}
