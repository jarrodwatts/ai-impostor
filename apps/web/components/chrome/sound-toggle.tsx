"use client";

/**
 * Fixed, low-key mute toggle for all game audio (music + SFX). Sits bottom-right
 * so it never collides with the centered primary actions. Reflects + drives the
 * shared AudioEngine via `useAudio`.
 */
import { C } from "@/components/primitives";
import { useAudio } from "@/lib/audio/audio-provider";

export function SoundToggle() {
  const { muted, toggleMute } = useAudio();
  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "Unmute audio" : "Mute audio"}
      title={muted ? "Unmute" : "Mute"}
      className="fixed bottom-4 right-4 z-50 grid h-10 w-10 place-items-center rounded-full transition-[filter,opacity] hover:brightness-125"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.line}`,
        backdropFilter: "blur(6px)",
        color: muted ? C.faint : C.purple,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}
