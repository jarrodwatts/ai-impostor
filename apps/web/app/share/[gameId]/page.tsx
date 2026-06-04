"use client";

/**
 * Share card. Builds a shareable result from the settlement reveal in the store
 * (agents caught / round outcome). NO MON, no payout — the demo has no economics.
 * Reveal data is post-game only, so showing agent avatars here is allowed.
 */
import { useParams, useRouter } from "next/navigation";
import { Avatar, Brand, Btn, Eyebrow, Tag, GridBG, C, DISP, SANS, MONO } from "@/components/primitives";
import { PageBg } from "@/components/chrome/page-bg";
import { useGameStore } from "@/lib/game/store";

export default function SharePage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const settlement = useGameStore((s) => s.settlement);
  const myVote = useGameStore((s) => s.myVote);

  const agentTotal = settlement?.aiReveal.length ?? 0;
  const votedSeat = myVote != null ? settlement?.roster.find((s) => s.seatId === myVote) : undefined;
  const votedRight = votedSeat?.wasAI ?? false;
  const aiSeatIds = settlement?.aiReveal ?? [];
  const aiSeats = (settlement?.roster ?? []).filter((s) => aiSeatIds.includes(s.seatId));

  const headline = votedRight ? "I spotted the agent." : "The agents fooled me.";
  const blurb = votedRight
    ? "Read the room, called the agent, and watched the table get unmasked."
    : "They passed as human right up to the reveal. Next time.";

  const copyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(
        `${typeof window !== "undefined" ? window.location.origin : ""}/share/${gameId}`,
      );
    }
  };
  const share = () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      void (navigator as Navigator).share?.({ title: "Agents Among Us", text: headline });
    } else {
      copyLink();
    }
  };

  return (
    <PageBg opacity={0.4} fade="ellipse 60% 60% at 50% 40%, black 0%, transparent 70%">
      <header className="flex h-16 flex-none items-center justify-center border-b" style={{ borderColor: C.lineSoft }}>
        <Eyebrow color={C.faint}>SHARE YOUR RESULT</Eyebrow>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
        {/* the card */}
        <div
          className="relative w-full max-w-[640px] overflow-hidden rounded-3xl"
          style={{ border: `1px solid ${C.line}`, background: "#0C0E0D" }}
        >
          <div className="absolute inset-0">
            <GridBG opacity={0.8} fade="ellipse 70% 90% at 60% 20%, black 0%, transparent 75%" />
          </div>
          <div className="relative p-8 lg:px-10 lg:py-9">
            <div className="flex items-center justify-between">
              <Brand size={16} sub={false} />
              <Tag tone={votedRight ? "purple" : "ai"}>{votedRight ? "READ IT" : "FOOLED"}</Tag>
            </div>
            <div className="my-7" style={{ font: `500 44px/1 ${DISP}`, letterSpacing: "-0.03em", color: C.text }}>
              {headline}
            </div>
            <p style={{ font: `400 15px/1.5 ${SANS}`, color: C.muted }}>{blurb}</p>
            <div className="mt-7 flex gap-10">
              <CardStat value={`${agentTotal}`} label="AGENTS" win={votedRight} />
              <CardStat value={votedRight ? "✓" : "✗"} label="YOUR CALL" win={votedRight} />
              <CardStat value="1" label="ROUND" win={votedRight} />
            </div>
            <div className="mt-7 flex items-center justify-between border-t pt-5" style={{ borderColor: C.lineSoft }}>
              <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: "0.14em", color: C.faint }}>
                AGENTS AMONG US
              </span>
              <div className="flex">
                {aiSeats.map((s, i) => (
                  <div key={s.seatId} style={{ marginLeft: i ? -10 : 0 }}>
                    <Avatar p={{ id: s.seatId, name: s.codename, c: s.avatarColor }} size={30} ring={C.bg} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-[640px] gap-3">
          <Btn
            variant="tertiary"
            style={{ flex: 1, height: 50 }}
            onClick={share}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.9 22H3l7-7.9L2.3 2h6.1l4.2 5.6L18.2 2zm-1 18h1.6L7.9 3.8H6.2L17.2 20z" />
              </svg>
            }
          >
            SHARE
          </Btn>
          <Btn
            variant="tertiary"
            style={{ flex: 1, height: 50 }}
            onClick={copyLink}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 15l6-6M11 6l1-1a4 4 0 016 6l-1 1M13 18l-1 1a4 4 0 01-6-6l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
          >
            COPY LINK
          </Btn>
          <Btn variant="primary" style={{ flex: 1.4, height: 50 }} onClick={() => router.push("/queue")}>
            PLAY AGAIN
          </Btn>
        </div>
      </div>
    </PageBg>
  );
}

function CardStat({ value, label, win }: { value: string; label: string; win: boolean }) {
  return (
    <div>
      <div style={{ font: `500 24px/1 ${DISP}`, color: win ? C.purple : C.berryHi }}>{value}</div>
      <Eyebrow color={C.faint} style={{ fontSize: 8, marginTop: 5, display: "block" }}>
        {label}
      </Eyebrow>
    </div>
  );
}
