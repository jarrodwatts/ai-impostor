"use client";

/**
 * Connect screen (ConnectDesktop/ConnectMobile). Connects a Monad wallet via
 * Reown AppKit; once connected, advances to /faucet (balance check) then queue.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Brand, Btn, Eyebrow, C, DISP, SANS } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { useAppKit } from "@reown/appkit/react";

function WalletGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="5.5" width="19" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2.5 9h19" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

export default function ConnectPage() {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) router.push("/faucet");
  }, [isConnected, router]);

  return (
    <PageBg opacity={0.7} fade="ellipse 80% 50% at 50% 22%, black 0%, transparent 75%">
      <header className="flex h-16 flex-none items-center border-b px-5 lg:px-10" style={{ borderColor: C.lineSoft }}>
        <Brand size={18} />
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-12 lg:border-r lg:px-14" style={{ borderColor: C.lineSoft }}>
          <div
            className="mb-[22px] inline-flex w-fit items-center gap-2 rounded-full px-3 py-[6px]"
            style={{ border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.02)" }}
          >
            <span className="animate-ai-pulse" style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi }} />
            <Eyebrow color={C.muted}>STEP 1 OF 2 · CONNECT</Eyebrow>
          </div>
          <h1 className="text-5xl lg:text-[56px]" style={{ font: `500 1em/1 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
            Some of you aren&apos;t <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p className="mt-[18px] max-w-md" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
            Connect a Monad wallet to take a seat. You&apos;ll be dealt a random name and face — no profile, no history, nothing that gives you away.
          </p>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 lg:px-14">
          <div
            className="w-full max-w-md rounded-[22px] p-[26px]"
            style={{ background: C.bgRaise, border: `1px solid ${C.line}` }}
          >
            <Eyebrow color={C.faint}>CHOOSE A WALLET</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-[10px]">
              <Btn variant="secondary" full icon={<WalletGlyph />} onClick={() => open()}>
                CONNECT MONAD WALLET
              </Btn>
            </div>
            <div
              className="mt-[18px] border-t pt-4"
              style={{ borderColor: C.lineSoft, font: `400 12px/1.5 ${SANS}`, color: C.faint }}
            >
              New to Monad testnet? You&apos;ll need a little test MON to play —{" "}
              <span style={{ color: C.purple }}>grab some free from the faucet</span>.
            </div>
          </div>
        </div>
      </div>
    </PageBg>
  );
}
