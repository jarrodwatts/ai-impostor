"use client";

/**
 * Client shell for /play: mounts the game socket (mock in M4, real WS in M5) for
 * the session lifetime, exposes `send` to descendants via context, and renders
 * the HUD over the phase content. On settlement it routes to /result.
 */
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ClientEvent } from "@ai-impostor/shared";
import { HudBar } from "@/components/game";
import { useGameSocket } from "@/lib/game/use-game-socket";
import { useGameStore } from "@/lib/game/store";
import { C } from "@/components/primitives";

const SendContext = createContext<(ev: ClientEvent) => void>(() => {});
export const useSend = () => useContext(SendContext);

export function PlayShell({ gameId, children }: { gameId: string; children: ReactNode }) {
  const { send } = useGameSocket();
  const router = useRouter();
  const phase = useGameStore((s) => s.phase);

  // Terminal: hand off to the result/reveal route once settled.
  useEffect(() => {
    if (phase === "SETTLEMENT" || phase === "COMPLETE") {
      const id = setTimeout(() => router.push(`/result/${gameId}`), 600);
      return () => clearTimeout(id);
    }
  }, [phase, router, gameId]);

  return (
    <SendContext.Provider value={send}>
      {/* Fixed to the viewport so chat scrolls INSIDE the layout and the HUD +
          roster + composer stay visible at all times (no page-level scroll). */}
      <div className="flex h-dvh flex-col overflow-hidden" style={{ background: C.bg }}>
        <HudBar />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </SendContext.Provider>
  );
}
