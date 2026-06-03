import { C } from "./tokens";
import { Eyebrow } from "./eyebrow";

export type RoundPillProps = {
  round?: number;
  phase?: string;
  /** accent dot + phase color */
  tone?: string;
};

/**
 * Round / phase pill. Exact recreation of `RoundPill` from screens-shared.jsx.
 */
export function RoundPill({
  round = 3,
  phase = "DISCUSSION",
  tone = C.purple,
}: RoundPillProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 28,
        padding: "0 12px",
        borderRadius: 9999,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.line}`,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: 9999, background: tone }}
      />
      <Eyebrow color={C.muted}>ROUND {round}</Eyebrow>
      <span style={{ width: 1, height: 12, background: C.line }} />
      <Eyebrow color={tone}>{phase}</Eyebrow>
    </div>
  );
}
