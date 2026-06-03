"use client";

/**
 * Round prompt reveal (PromptDesktop/PromptMobile). Full-screen prompt + the
 * alive seats' avatars; the HUD timer counts down to discussion.
 */
import { Avatar, Eyebrow, C, DISP, SANS, MONO } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer } from "@/lib/game/seat";

export function PromptView() {
  const round = useGameStore((s) => s.round);
  const promptText = useGameStore((s) => s.promptText);
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const alive = roster.filter((s) => s.alive).slice(0, 8);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-7 p-10 text-center">
      <Eyebrow color={C.purple}>ROUND {round} · PROMPT</Eyebrow>
      <h1
        className="max-w-3xl text-3xl lg:text-[52px]"
        style={{ font: `500 1em/1.12 ${DISP}`, letterSpacing: "-0.03em", color: C.text, textWrap: "balance" }}
      >
        {promptText ? `“${promptText}”` : "Get ready…"}
      </h1>
      <p className="max-w-md" style={{ font: `400 16px/1.55 ${SANS}`, color: C.muted }}>
        The prompts get more revealing each round. You have two minutes. Watch who dodges.
      </p>
      <div className="flex">
        {alive.map((s, i) => (
          <div key={s.seatId} style={{ marginLeft: i ? -12 : 0 }}>
            <Avatar p={seatToPlayer(s, mySeatId)} size={44} ring={C.bg} />
          </div>
        ))}
      </div>
      <div style={{ font: `400 13px/1.4 ${MONO}`, color: C.faint, letterSpacing: "0.04em" }}>
        CHAT UNLOCKS NOW · TYPING INDICATORS ON FOR EVERYONE
      </div>
    </div>
  );
}
