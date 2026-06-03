import type { CSSProperties } from "react";

export type GridBGProps = {
  opacity?: number;
  /** radial-gradient mask expression (the part inside `radial-gradient(...)`) */
  fade?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Faint purple grid background (hero-grid motif).
 * Exact recreation of `GridBG` from screens-shared.jsx.
 */
export function GridBG({
  opacity = 1,
  fade = "ellipse at center, black 35%, transparent 88%",
  className,
  style,
}: GridBGProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: `linear-gradient(rgba(82,27,255,0.10) 1px, transparent 1px),
         linear-gradient(90deg, rgba(82,27,255,0.10) 1px, transparent 1px)`,
        backgroundSize: "38px 38px",
        WebkitMaskImage: `radial-gradient(${fade})`,
        maskImage: `radial-gradient(${fade})`,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
