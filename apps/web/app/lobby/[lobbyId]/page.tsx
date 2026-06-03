"use client";

/**
 * Lobby / table forming (LobbyDesktop/LobbyMobile). Anonymous seats (no
 * identities yet — anti-leak: avatars/names are dealt only when the round
 * begins). A local countdown then routes to /play/[gameId]. Seat fill is
 * deliberately ambiguous (no human/AI split).
 */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Brand, Btn, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { WalletChip } from "@/components/chrome/wallet-button";
import { formatCountdown } from "@/lib/game/phase";
import { useNow } from "@/lib/game/use-now";

// Intentionally vague seat fill — never reveals human/AI counts.
const FILLED = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0];

function LobbySeat({ filled, you, idx }: { filled: number; you: boolean; idx: number }) {
  return (
    <div
      className="relative grid aspect-square place-items-center rounded-[14px]"
      style={{
        background: filled ? "rgba(255,255,255,0.06)" : "transparent",
        border: filled ? `1px solid ${C.line}` : "1px dashed rgba(255,255,255,0.14)",
      }}
    >
      {filled ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8.5" r="3.6" fill={you ? C.purple : "rgba(255,255,255,0.5)"} />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" fill={you ? C.purple : "rgba(255,255,255,0.5)"} />
        </svg>
      ) : (
        <span style={{ font: `400 10px/1 ${MONO}`, color: "rgba(255,255,255,0.22)" }}>{idx}</span>
      )}
      {you && (
        <div className="absolute bottom-[5px]" style={{ font: `600 7px/1 ${MONO}`, letterSpacing: "0.1em", color: C.purple }}>
          YOU
        </div>
      )}
    </div>
  );
}

const RULES: Array<[string, string, string]> = [
  ["01", "Talk it out", "Each round opens with a prompt. Chat freely for ~2 minutes."],
  ["02", "Vote in secret", "One vote each. Most votes is eliminated. Nobody sees who voted."],
  ["03", "Humans win", "Vote out every AI before they reach parity, and split the pool."],
];

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ lobbyId: string }>();
  const lobbyId = params.lobbyId;
  const now = useNow();
  const [endsAt] = useState(() => Date.now() + 8_000);

  useEffect(() => {
    const id = setTimeout(() => router.push(`/play/${lobbyId}`), 8_000);
    return () => clearTimeout(id);
  }, [router, lobbyId]);

  return (
    <PageBg opacity={0.5} fade="ellipse 60% 60% at 30% 40%, black 0%, transparent 70%">
      <header className="flex h-16 flex-none items-center justify-between border-b px-5 lg:px-10" style={{ borderColor: C.lineSoft }}>
        <Brand size={18} />
        <div className="flex items-center gap-3">
          <WalletChip />
          <Btn variant="tertiary" size="sm" onClick={() => router.push("/")}>
            LEAVE TABLE
          </Btn>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
        {/* forming table */}
        <div className="flex flex-col justify-center px-6 py-12 lg:border-r lg:px-14" style={{ borderColor: C.lineSoft }}>
          <Eyebrow color={C.purple}>TABLE #{lobbyId} · FORMING</Eyebrow>
          <h1 className="mt-4 text-4xl lg:text-[52px]" style={{ font: `500 1em/1 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
            Starts in{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCountdown(endsAt, now)}</span>
          </h1>
          <p className="mb-8 mt-[14px] max-w-md" style={{ font: `400 15px/1.5 ${SANS}`, color: C.muted }}>
            The clock began when the table reached enough players. Late joiners are seated until it hits zero — then identities are dealt.
          </p>
          <div className="grid max-w-md grid-cols-5 gap-3">
            {FILLED.map((f, i) => (
              <LobbySeat key={i} filled={f ?? 0} you={i === 0} idx={i + 1} />
            ))}
          </div>
          <div className="mt-7 flex max-w-md items-center gap-[10px]" style={{ font: `400 12px/1.4 ${SANS}`, color: C.faint }}>
            <span className="flex-none" style={{ width: 6, height: 6, borderRadius: 9999, background: C.purple }} />
            Seat fill is deliberately ambiguous — the table never reveals how many players are human or AI.
          </div>
        </div>

        {/* how it works */}
        <div className="flex flex-col justify-center gap-[22px] px-6 py-10 lg:px-14">
          <Eyebrow color={C.faint}>HOW IT WORKS</Eyebrow>
          {RULES.map(([n, t, d]) => (
            <div key={n} className="flex gap-4">
              <span style={{ font: `500 13px/1.2 ${MONO}`, color: C.purple, paddingTop: 2 }}>{n}</span>
              <div>
                <div style={{ font: `500 18px/1.2 ${DISP}`, color: C.text, marginBottom: 4 }}>{t}</div>
                <div className="max-w-sm" style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>{d}</div>
              </div>
            </div>
          ))}
          <div className="mt-1 rounded-[14px] p-4" style={{ background: C.berrySoft, border: "1px solid rgba(224,58,139,0.3)" }}>
            <Eyebrow color={C.berryHi}>THE CATCH</Eyebrow>
            <p className="mt-2" style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>
              If the AI ever reach parity with the humans, they take the entire pool. Equality is already a loss.
            </p>
          </div>
        </div>
      </div>
    </PageBg>
  );
}
