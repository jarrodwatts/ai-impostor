import type { CSSProperties, ReactNode } from "react";
import { C, MONO } from "./tokens";

export type EyebrowProps = {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Mono eyebrow / label — uppercase Roboto Mono, .16em tracking.
 * Exact recreation of `Eyebrow` from screens-shared.jsx.
 */
export function Eyebrow({ children, color = C.faint, className, style }: EyebrowProps) {
  return (
    <span
      className={className}
      style={{
        font: `500 11px/1 ${MONO}`,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
