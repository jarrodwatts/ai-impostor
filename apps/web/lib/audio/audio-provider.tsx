"use client";

/**
 * AudioProvider — wires the AudioEngine into the app:
 *
 *  1. Unlocks audio (+ starts the music bed) on the first user gesture, as
 *     required by browser autoplay policy.
 *  2. Subscribes to the game store and fires sound effects on key transitions
 *     (incoming chat line, vote window opening, your ballot locking, an
 *     elimination, the settlement reveal).
 *  3. Exposes mute state to the UI via `useAudio`.
 *
 * It renders nothing structural — just provides context and runs effects.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { audio } from "./engine";
import { useGameStore } from "@/lib/game/store";

type AudioCtx = { muted: boolean; toggleMute: () => void };
const Ctx = createContext<AudioCtx | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    audio.init();
    setMuted(audio.isMuted());
    const offMute = audio.subscribe(setMuted);

    // Unlock + start music on the first gesture, then stop listening.
    const unlock = () => {
      audio.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    // Fire SFX off store transitions (state, prevState).
    const offStore = useGameStore.subscribe((s, p) => {
      if (s.messages.length > p.messages.length) {
        const last = s.messages[s.messages.length - 1];
        if (last && !last.system) audio.playSfx("message");
      }
      if (s.phase === "VOTE_WINDOW" && p.phase !== "VOTE_WINDOW") {
        audio.playSfx("voteOpen");
      }
      if (s.hasVoted && !p.hasVoted) audio.playSfx("vote");
      if (
        s.phase === "RESOLVE" &&
        p.phase !== "RESOLVE" &&
        s.lastEliminatedSeatIds.length > 0
      ) {
        audio.playSfx("eliminate");
      }
      if (s.settlement && !p.settlement) audio.playSfx("reveal");
    });

    return () => {
      offMute();
      offStore();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <Ctx.Provider value={{ muted, toggleMute: () => audio.toggleMute() }}>
      {children}
    </Ctx.Provider>
  );
}

/** Mute state + toggle for the UI control. Safe outside the provider (no-op). */
export function useAudio(): AudioCtx {
  return useContext(Ctx) ?? { muted: false, toggleMute: () => {} };
}
