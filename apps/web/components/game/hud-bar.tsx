"use client";

/**
 * In-game HUD top bar: Brand + RoundPill + Timer. No economics in the demo —
 * there is no pot/MON/headcount surfaced here.
 */
import { Brand, RoundPill, Timer, Eyebrow, C } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { useNow } from "@/lib/game/use-now";
import { formatCountdown, phasePill } from "@/lib/game/phase";

const TIMER_LABEL: Record<string, string> = {
  ROUND_PROMPT: "DISCUSSION BEGINS",
  ROUND_DISCUSSION: "DISCUSSION ENDS",
  CHAT_LOCKED: "LOCKING",
  VOTE_WINDOW: "VOTE CLOSES",
  RESOLVE: "RESOLVING",
};

export function HudBar() {
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt);
  const now = useNow();

  const { label: phaseLabel, danger } = phasePill(phase);
  const tone = danger ? C.berryHi : C.purple;

  return (
    <div
      className="grid h-[60px] flex-none grid-cols-[1fr_auto_1fr] items-center border-b px-4 sm:px-7"
      style={{ borderColor: C.lineSoft, background: C.bg }}
    >
      <div className="hidden sm:block">
        <Brand size={16} sub={false} />
      </div>
      <div className="flex items-center justify-self-start gap-3 sm:justify-self-center sm:gap-[18px]">
        <RoundPill round={round} phase={phaseLabel} tone={tone} />
        <Timer
          t={formatCountdown(phaseEndsAt, now)}
          label={TIMER_LABEL[phase] ?? ""}
          danger={danger}
        />
      </div>
      <div className="hidden justify-self-end sm:block">
        <Eyebrow color={C.faint} style={{ fontSize: 9 }}>
          AGENTS AMONG US
        </Eyebrow>
      </div>
    </div>
  );
}
