import type { ReactNode } from "react";
import { C, MONO, initials, type Player } from "./tokens";

export type AvatarGlyph = {
  /** background color of the corner badge */
  bg: string;
  /** badge text/glyph (kept short, e.g. "AI", "✓") */
  t: ReactNode;
};

export type AvatarProps = {
  p: Player;
  size?: number;
  /** dead seat: grayscale swatch + strikethrough */
  dead?: boolean;
  /** focus ring color (drawn as a double box-shadow ring) */
  ring?: string;
  /** optional corner badge */
  glyph?: AvatarGlyph;
};

/**
 * Uniform color swatch + mono monogram. Exact recreation of `Avatar` from
 * screens-shared.jsx, including the `dead` strikethrough and `glyph` badge.
 */
export function Avatar({ p, size = 38, dead = false, ring, glyph }: AvatarProps) {
  const r = Math.round(size * 0.28);
  return (
    <div
      style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: r,
          background: dead ? "#1a1a1a" : p.c,
          display: "grid",
          placeItems: "center",
          font: `600 ${Math.round(size * 0.34)}px/1 ${MONO}`,
          letterSpacing: "0.02em",
          color: dead ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.78)",
          filter: dead ? "grayscale(1)" : "none",
          boxShadow: ring ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${ring}` : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* faint inner geometric texture so swatches read as 'generated' */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: dead
              ? "none"
              : "radial-gradient(120% 120% at 18% 12%, rgba(255,255,255,0.22), transparent 55%)",
          }}
        />
        <span style={{ position: "relative" }}>{initials(p.name)}</span>
      </div>
      {dead && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "128%",
              height: 1.5,
              background: C.red,
              transform: "rotate(-32deg)",
              opacity: 0.9,
            }}
          />
        </div>
      )}
      {glyph && (
        <div
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: 6,
            background: glyph.bg,
            border: `1.5px solid ${C.bg}`,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            font: `700 ${size * 0.26}px/1 ${MONO}`,
          }}
        >
          {glyph.t}
        </div>
      )}
    </div>
  );
}
