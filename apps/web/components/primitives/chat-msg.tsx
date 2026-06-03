import type { ReactNode } from "react";
import { C, MONO, SANS, type Player } from "./tokens";
import { Eyebrow } from "./eyebrow";
import { Avatar } from "./avatar";

export type ChatMsgProps = {
  /** required for player bubbles (you/other); omit for system */
  p?: Player;
  text: ReactNode;
  /** the local player's own message (right-aligned, purple) */
  you?: boolean;
  /** a centered round-prompt / system bubble */
  system?: boolean;
};

/**
 * Chat message bubble. Exact recreation of `ChatMsg` from screens-shared.jsx,
 * covering the system / you / other bubble variants.
 */
export function ChatMsg({ p, text, you = false, system = false }: ChatMsgProps) {
  if (system) {
    return (
      <div
        style={{
          alignSelf: "center",
          textAlign: "center",
          maxWidth: "86%",
          margin: "4px 0",
          padding: "10px 16px",
          borderRadius: 12,
          background: C.purpleSoft,
          border: "1px solid rgba(131,110,249,0.3)",
        }}
      >
        <Eyebrow color={C.purple} style={{ fontSize: 9 }}>
          ROUND PROMPT
        </Eyebrow>
        <div style={{ font: `400 14px/1.45 ${SANS}`, color: C.text, marginTop: 6 }}>
          {text}
        </div>
      </div>
    );
  }

  // Player bubble. `p` is required here; render nothing if misused.
  if (!p) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        flexDirection: you ? "row-reverse" : "row",
      }}
    >
      <Avatar p={p} size={30} />
      <div
        style={{
          maxWidth: "74%",
          display: "flex",
          flexDirection: "column",
          alignItems: you ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginBottom: 3,
          }}
        >
          <span
            style={{
              font: `500 10px/1 ${MONO}`,
              letterSpacing: "0.08em",
              color: you ? C.purple : C.faint,
            }}
          >
            {p.name}
            {you ? " · YOU" : ""}
          </span>
        </div>
        <div
          style={{
            padding: "9px 13px",
            borderRadius: 13,
            borderTopLeftRadius: you ? 13 : 3,
            borderTopRightRadius: you ? 3 : 13,
            background: you ? C.purpleSoft : "rgba(255,255,255,0.05)",
            border: `1px solid ${you ? "rgba(131,110,249,0.28)" : C.line}`,
            font: `400 14px/1.4 ${SANS}`,
            color: C.text,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
