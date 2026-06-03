"use client";

/**
 * Message composer (alive players only). Mirrors the design composer from
 * screens-game.jsx (input + SEND + char counter). Spectators get the read-only
 * "you can watch, but you can't chat" affordance via `disabled`.
 */
import { useState } from "react";
import type { ClientEvent } from "@ai-impostor/shared";
import { Btn, C, MONO, SANS } from "@/components/primitives";

const MAX = 240;

export function ChatComposer({
  send,
  disabled = false,
}: {
  send: (ev: ClientEvent) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  if (disabled) {
    return (
      <div
        className="flex-none border-t p-4 sm:px-8"
        style={{ borderColor: C.lineSoft }}
      >
        <div
          className="flex h-12 items-center justify-center gap-2 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px dashed ${C.line}`,
            font: `400 14px/1 ${SANS}`,
            color: C.faint,
          }}
        >
          You can watch, but you can&apos;t chat
        </div>
      </div>
    );
  }

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send({
      t: "send_message",
      clientMsgId: `c-${Date.now()}`,
      text: trimmed.slice(0, MAX),
    });
    setText("");
  };

  return (
    <div
      className="flex-none border-t px-4 pb-5 pt-4 sm:px-8"
      style={{ borderColor: C.lineSoft }}
    >
      <div className="flex items-center gap-3">
        <input
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Say something human…"
          className="h-12 flex-1 rounded-xl px-4 outline-none"
          style={{
            background: C.bgRaise,
            border: `1px solid ${C.line}`,
            font: `400 14px/1 ${SANS}`,
            color: C.text,
          }}
        />
        <Btn variant="primary" onClick={submit}>
          SEND
        </Btn>
      </div>
      <div className="mt-[9px] flex justify-between px-[2px]">
        <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint }}>
          {text.length} / {MAX}
        </span>
        <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint }}>
          Plain text · slow down between messages
        </span>
      </div>
    </div>
  );
}
