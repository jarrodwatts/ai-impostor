import { C, DISP, SANS } from "./tokens";
import { Eyebrow } from "./eyebrow";

/**
 * Pot Health indicator. ANTI-LEAK INVARIANT (standards.md §1):
 * this component NEVER renders absolute MON or any headcount. Its only data
 * input is a percentage (0–100). The type below is intentionally narrow —
 * do not add `mon`, `pool`, `humanCount`, `aiCount`, etc. props. Real MON is
 * revealed only at settlement, on a different screen.
 *
 * Exact recreation of `PotHealth` from screens-shared.jsx.
 */
export type PotHealthProps = {
  /** percentage 0–100 ONLY. No absolute amounts, ever. */
  pct?: number;
  /** dense, right-aligned HUD variant (no caption) */
  compact?: boolean;
};

const SEGMENTS = 10;

function toneFor(pct: number): string {
  return pct >= 80 ? C.purple : pct >= 50 ? C.amber : C.berryHi;
}

export function PotHealth({ pct = 100, compact = false }: PotHealthProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const lit = Math.round(clamped / 10);
  const tone = toneFor(clamped);

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 5,
        }}
      >
        <Eyebrow color={C.faint} style={{ fontSize: 9 }}>
          POT HEALTH
        </Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: 14,
                  borderRadius: 1,
                  background: i < lit ? tone : "rgba(255,255,255,0.10)",
                }}
              />
            ))}
          </div>
          <span
            style={{
              font: `500 18px/1 ${DISP}`,
              color: tone,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {clamped}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bgRaise,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Eyebrow color={C.muted}>POT HEALTH</Eyebrow>
        <span
          style={{
            font: `500 30px/1 ${DISP}`,
            color: tone,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {clamped}%
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 2,
              background: i < lit ? tone : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          font: `400 11px/1.4 ${SANS}`,
          color: C.faint,
        }}
      >
        Real MON revealed only at settlement. −10% each round a human is voted
        out.
      </div>
    </div>
  );
}
