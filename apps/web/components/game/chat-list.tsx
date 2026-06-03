"use client";

/**
 * Scrolling chat transcript. Renders the SAME component tree for alive players
 * and spectators (spectator no-reveal invariant) — system prompts, player
 * bubbles, and typing rows from the M1 primitives. No AI/human styling exists.
 */
import { useEffect, useRef } from "react";
import { ChatMsg, TypingRow } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer, findSeat } from "@/lib/game/seat";

export function ChatList({ className }: { className?: string }) {
  const messages = useGameStore((s) => s.messages);
  const typingSeatIds = useGameStore((s) => s.typingSeatIds);
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const promptText = useGameStore((s) => s.promptText);
  const phase = useGameStore((s) => s.phase);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingSeatIds.length]);

  // Show the active round prompt as a system bubble at the top of the round.
  const showPrompt = promptText != null && phase !== "LOBBY_FORMING";

  return (
    <div
      className={`ai-scrollcol flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:gap-4 sm:px-8 ${className ?? ""}`}
    >
      {showPrompt && <ChatMsg system text={promptText} />}
      {messages.map((m) => {
        if (m.system) return <ChatMsg key={m.msgId} system text={m.text} />;
        const seat = findSeat(roster, m.seatId);
        if (!seat) return null;
        const p = seatToPlayer(seat, mySeatId);
        return <ChatMsg key={m.msgId} p={p} text={m.text} you={p.you ?? false} />;
      })}
      {typingSeatIds.map((seatId) => {
        const seat = findSeat(roster, seatId);
        if (!seat) return null;
        return <TypingRow key={seatId} p={seatToPlayer(seat, mySeatId)} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
