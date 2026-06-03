"use client";

/**
 * Selectable vote target. Recreates `VoteTarget` from screens-game.jsx: a swatch
 * + codename card that goes berry when selected, with a check badge. Selection
 * is local UI only until the ballot is locked (secret ballot).
 */
import { Avatar, C, MONO, type Player } from "@/components/primitives";

export function VoteTargetCard({
  p,
  selected,
  locked,
  onSelect,
}: {
  p: Player;
  selected: boolean;
  /** ballot is locked — disable further selection */
  locked: boolean;
  onSelect: (seatId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onSelect(p.id)}
      className="relative flex flex-col items-center gap-2 rounded-2xl px-2 py-[14px] transition-[filter] enabled:hover:brightness-110 disabled:cursor-not-allowed"
      style={{
        background: selected ? C.berrySoft : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${selected ? C.berryHi : C.line}`,
        cursor: locked ? "not-allowed" : "pointer",
      }}
    >
      <Avatar p={p} size={44} ring={selected ? C.berryHi : undefined} />
      <span
        className="text-center"
        style={{
          font: `500 10px/1.1 ${MONO}`,
          letterSpacing: "0.04em",
          color: selected ? C.berryHi : C.muted,
        }}
      >
        {p.name}
      </span>
      {selected && (
        <div
          className="absolute right-2 top-2 grid place-items-center"
          style={{ width: 18, height: 18, borderRadius: 9999, background: C.berryHi }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L19 7"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
