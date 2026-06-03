import { C, DISP } from "./tokens";
import { Eyebrow } from "./eyebrow";

export type TimerProps = {
  /** preformatted clock string, e.g. "1:43" */
  t?: string;
  label?: string;
  /** danger state turns the numerals berry-hi */
  danger?: boolean;
  /** large display variant */
  big?: boolean;
};

/**
 * Countdown timer (mono tabular-nums). Exact recreation of `Timer` from
 * screens-shared.jsx.
 */
export function Timer({
  t = "1:43",
  label = "DISCUSSION ENDS",
  danger = false,
  big = false,
}: TimerProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Eyebrow color={C.faint} style={{ fontSize: 9, letterSpacing: "0.18em" }}>
        {label}
      </Eyebrow>
      <div
        style={{
          font: `500 ${big ? 40 : 22}px/1 ${DISP}`,
          letterSpacing: "-0.02em",
          color: danger ? C.berryHi : C.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {t}
      </div>
    </div>
  );
}
