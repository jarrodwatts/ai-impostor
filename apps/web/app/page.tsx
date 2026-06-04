"use client";

/**
 * Home / landing for "Agents Among Us". ONE prominent guest CTA — no wallet, no
 * faucet, no buy-in. Tapping "JOIN THE TABLE" routes straight to /queue, which
 * opens a guest session and auto-advances into the game.
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

const STEPS: Array<[string, string, string]> = [
  ["01", "Sit down", "One tap drops you into a table of ten — a random name and face, nothing that gives you away."],
  ["02", "Talk", "The round opens with a prompt. Chat for 90 seconds. Some players are AI agents built to blend in — find the tells."],
  ["03", "Vote", "Secret ballot, one vote each. Pick the seat you're sure is an agent."],
  ["04", "The reveal", "Every seat is unmasked — human or agent. See who fooled you, and who you read right."],
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
          <RoundPill round={1} phase="DISCUSSION" />
          <Timer t="1:18" label="" />
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
  const play = () => router.push("/queue");

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
          <Btn variant="primary" size="sm" onClick={play}>
            JOIN THE TABLE
          </Btn>
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
            <Eyebrow color={C.muted}>SOCIAL DEDUCTION · LIVE AI AGENTS</Eyebrow>
          </div>
          {/* Discrete font props (NOT the `font` shorthand) so the responsive
              text-size classes aren't overridden by `1em`. */}
          <h1
            className="text-[46px] leading-[0.95] sm:text-[64px] lg:text-[84px]"
            style={{
              fontFamily: DISP,
              fontWeight: 500,
              letterSpacing: "-0.035em",
              color: C.text,
            }}
          >
            Some of you aren&apos;t <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p
            className="mt-6 max-w-md text-[18px] leading-[1.55]"
            style={{ fontFamily: SANS, fontWeight: 400, color: C.muted }}
          >
            Ten players share a chat. Some are AI agents, built to pass as human. Talk, read the room, and vote out the one you&apos;re sure is an agent — then everyone gets unmasked.
          </p>
          <div className="mt-8 flex gap-3">
            <Btn variant="primary" style={{ height: 52, padding: "0 30px" }} onClick={play}>
              JOIN THE TABLE
            </Btn>
            <Link href="#how">
              <Btn variant="tertiary" style={{ height: 52, padding: "0 26px" }}>
                HOW IT WORKS
              </Btn>
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-[14px]">
            <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>No sign-up. One tap to play.</span>
            <span style={{ width: 3, height: 3, borderRadius: 9999, background: C.faint }} />
            <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>One 90-second round.</span>
          </div>
        </div>
        <MiniPreview />
      </section>

      {/* how it works */}
      <section id="how" className="border-t px-5 py-9 lg:px-12" style={{ borderColor: C.lineSoft }}>
        <Eyebrow color={C.faint} style={{ marginBottom: 24, display: "block" }}>
          HOW A ROUND GOES
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
        <div
          className="mt-7 flex flex-col items-start justify-between gap-5 rounded-[18px] px-7 py-6 sm:flex-row sm:items-center"
          style={{ background: C.purpleSoft, border: "1px solid rgba(131,110,249,0.3)" }}
        >
          <div>
            <div style={{ font: `500 26px/1.1 ${DISP}`, color: C.text, letterSpacing: "-0.02em" }}>
              Think you can spot the agent?
            </div>
            <div style={{ font: `400 14px/1.5 ${SANS}`, color: C.muted, marginTop: 6 }}>
              Take a seat at the next table — it fills in seconds.
            </div>
          </div>
          <Btn variant="primary" style={{ height: 52, padding: "0 30px" }} onClick={play}>
            JOIN THE TABLE
          </Btn>
        </div>
      </section>
    </PageBg>
  );
}
