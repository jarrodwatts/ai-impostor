import { C, MONO, DISP } from "./tokens";

export type BrandProps = {
  size?: number;
  /** show the "BUILT ON MONAD" sub-label */
  sub?: boolean;
};

/**
 * Brand lockup (Monad mark + "AI Impostor" wordmark). Exact recreation of
 * `Brand` from screens-shared.jsx. The mark lives at /public/monad-logo-mark.svg.
 */
export function Brand({ size = 18, sub = true }: BrandProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/monad-logo-mark.svg" alt="" style={{ height: size + 4 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            font: `600 ${size}px/1 ${DISP}`,
            letterSpacing: "-0.01em",
            color: C.text,
          }}
        >
          AI Impostor
        </span>
        {sub && (
          <span
            style={{
              font: `500 8px/1 ${MONO}`,
              letterSpacing: "0.22em",
              color: C.faint,
            }}
          >
            BUILT ON MONAD
          </span>
        )}
      </div>
    </div>
  );
}
