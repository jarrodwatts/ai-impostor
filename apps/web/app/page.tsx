"use client";

/**
 * Home / landing. Recreates HomeDesktop + HomeMobile (screens-home.jsx),
 * responsive mobile-first with `lg:` desktop. CTA routes to /connect.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brand,
  Btn,
  Eyebrow,
  RoundPill,
  Timer,
  ChatMsg,
  TypingRow,
  GridBG,
  PLAYERS,
  C,
  DISP,
  SANS,
  MONO,
} from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { WalletButton } from "@/components/chrome/wallet-button";

const STEPS: Array<[string, string, string]> = [
  ["01", "Sit down", "Connect a Monad wallet, pay the buy-in, and get dealt into a table of ten with a random name and face."],
  ["02", "Talk", "Each round opens with a prompt. Chat for two minutes. Some players are AI built to blend in — find the tells."],
  ["03", "Vote", "Secret ballot, one vote each. The most-voted player is out. Misfire on a human and the pool takes a hit."],
  ["04", "Cash out", "Vote out every AI before they reach parity, and the survivors split the pool in MON."],
];

const STAKES: Array<[string, string, string]> = [
  ["Winners split the pool", "Survive with the AI gone and the remaining pool is divided equally among you, in MON.", C.purple],
  ["Misfires cost the table", "Vote out a human and the pool drops 10% that round. Vote out an AI and it costs nothing.", C.amber],
  ["Let them reach parity", "If the AI ever equal the humans, they take everything. Equality is already a loss.", C.berryHi],
];

function MiniPreview() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${C.line}`, background: "#0C0E0D" }}
    >
      <div className="absolute inset-0">
        <GridBG opacity={0.7} fade="ellipse 90% 90% at 60% 10%, black 0%, transparent 78%" />
      </div>
      <div className="relative p-4 sm:p-5">
        <div className="mb-4 hidden items-center justify-between sm:flex">
          <RoundPill round={3} phase="DISCUSSION" />
          <Timer t="1:43" label="" />
        </div>
        <div className="flex flex-col gap-[11px]">
          <ChatMsg system text="What's a hot take you'd defend to the death?" />
          <ChatMsg p={PLAYERS[1]!} text="pineapple on pizza is correct and you all know it" />
          <ChatMsg p={PLAYERS[7]!} text="cereal before milk, every time. no exceptions" />
          <TypingRow p={PLAYERS[5]!} />
        </div>
        <div
          className="mt-4 flex items-center gap-2 rounded-xl px-[14px] py-3"
          style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.35)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-none">
            <path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z" stroke={C.berryHi} strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span style={{ font: `400 12px/1.3 ${SANS}`, color: C.muted }}>
            <span style={{ color: C.berryHi, fontWeight: 600 }}>Vote phase next.</span> One of them types a little too clean…
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const play = () => router.push("/connect");

  return (
    <PageBg opacity={0.55} fade="ellipse 75% 55% at 70% 16%, black 0%, transparent 68%">
      {/* nav */}
      <header
        className="flex h-[68px] flex-none items-center justify-between border-b px-5 lg:px-12"
        style={{ borderColor: C.lineSoft }}
      >
        <Brand size={18} />
        <div className="flex items-center gap-5">
          <Link href="#how" className="hidden text-sm sm:block" style={{ color: C.muted }}>
            How it works
          </Link>
          <Link href="#stakes" className="hidden text-sm sm:block" style={{ color: C.muted }}>
            Stakes
          </Link>
          <WalletButton label="CONNECT" />
        </div>
      </header>

      {/* hero */}
      <section className="grid grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-12 lg:py-16">
        <div>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-[14px] py-[7px]"
            style={{ border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.02)" }}
          >
            <span
              className="animate-ai-pulse"
              style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi }}
            />
            <Eyebrow color={C.muted}>SOCIAL DEDUCTION · ON MONAD</Eyebrow>
          </div>
          <h1
            className="text-5xl lg:text-[78px]"
            style={{ font: `500 1em/0.98 ${DISP}`, letterSpacing: "-0.04em", color: C.text }}
          >
            Some of you aren&apos;t <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p className="mt-6 max-w-md" style={{ font: `400 17px/1.55 ${SANS}`, color: C.muted }}>
            Ten players share a chat. A few are hidden AI, built to pass as human. Talk, read the room, and vote them out before they take over — the survivors split the pool in MON.
          </p>
          <div className="mt-8 flex gap-3">
            <Btn variant="primary" style={{ height: 52, padding: "0 30px" }} onClick={play}>
              CONNECT &amp; PLAY
            </Btn>
            <Link href="#how">
              <Btn variant="tertiary" style={{ height: 52, padding: "0 26px" }}>
                HOW IT WORKS
              </Btn>
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-[14px]">
            <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>Free to try on Monad testnet.</span>
            <span style={{ width: 3, height: 3, borderRadius: 9999, background: C.faint }} />
            <Link href="/faucet" style={{ font: `500 13px/1 ${SANS}`, color: C.purple }}>
              Need test MON?
            </Link>
          </div>
        </div>
        <MiniPreview />
      </section>

      {/* how it works */}
      <section id="how" className="border-t px-5 py-9 lg:px-12" style={{ borderColor: C.lineSoft }}>
        <Eyebrow color={C.faint} style={{ marginBottom: 24, display: "block" }}>
          HOW A GAME GOES
        </Eyebrow>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div
              key={n}
              className="rounded-[18px] p-[22px]"
              style={{ background: C.bgRaise, border: `1px solid ${C.line}` }}
            >
              <span style={{ font: `500 12px/1 ${MONO}`, color: C.purple, letterSpacing: "0.1em" }}>{n}</span>
              <div style={{ font: `500 20px/1.15 ${DISP}`, color: C.text, margin: "14px 0 8px", letterSpacing: "-0.01em" }}>{t}</div>
              <div style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* stakes */}
      <section id="stakes" className="px-5 pb-12 pt-5 lg:px-12">
        <div
          className="grid grid-cols-1 overflow-hidden rounded-[18px] sm:grid-cols-3"
          style={{ border: `1px solid ${C.line}`, background: C.bgRaise }}
        >
          {STAKES.map(([t, d, c], i) => (
            <div
              key={t}
              className="p-6"
              style={{ borderLeft: i ? `1px solid ${C.line}` : "none" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span style={{ width: 7, height: 7, borderRadius: 9999, background: c }} />
                <div style={{ font: `500 16px/1.2 ${DISP}`, color: C.text }}>{t}</div>
              </div>
              <div style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>{d}</div>
            </div>
          ))}
        </div>
        <div
          className="mt-7 flex flex-col items-start justify-between gap-5 rounded-[18px] px-7 py-6 sm:flex-row sm:items-center"
          style={{ background: C.purpleSoft, border: "1px solid rgba(131,110,249,0.3)" }}
        >
          <div>
            <div style={{ font: `500 26px/1.1 ${DISP}`, color: C.text, letterSpacing: "-0.02em" }}>
              Think you can spot the machine?
            </div>
            <div style={{ font: `400 14px/1.5 ${SANS}`, color: C.muted, marginTop: 6 }}>
              Connect your wallet and join the next table — it fills in seconds.
            </div>
          </div>
          <Btn variant="primary" style={{ height: 52, padding: "0 30px" }} onClick={play}>
            CONNECT &amp; PLAY
          </Btn>
        </div>
      </section>
    </PageBg>
  );
}
