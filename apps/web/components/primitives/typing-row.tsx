import { C, MONO, type Player } from "./tokens";
import { Avatar } from "./avatar";

export type TypingRowProps = {
  p: Player;
};

/**
 * Typing indicator with 3-dot blink. Exact recreation of `TypingRow` from
 * screens-shared.jsx. The `aiBlink` keyframe is defined in globals.css.
 */
export function TypingRow({ p }: TypingRowProps) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Avatar p={p} size={30} />
      <div
        style={{
          padding: "11px 14px",
          borderRadius: 13,
          borderTopLeftRadius: 3,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${C.line}`,
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: C.faint,
              animation: `aiBlink 1.2s ${i * 0.18}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          font: `400 11px/1 ${MONO}`,
          color: C.faint,
          letterSpacing: "0.04em",
        }}
      >
        {p.name} is typing…
      </span>
    </div>
  );
}
