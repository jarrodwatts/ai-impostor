"use client";

/**
 * Vote locked / waiting (VoteLockedDesktop/VoteLockedMobile). Shown after this
 * viewer's ballot is locked. SECRET BALLOT: we render no tally and never show
 * who anyone voted for — only that our own vote is in.
 */
import { C, DISP, SANS, MONO } from "@/components/primitives";

export function VoteWaitingView() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div
        className="grid place-items-center"
        style={{ width: 86, height: 86, borderRadius: 26, background: C.berrySoft, border: "1px solid rgba(224,58,139,0.4)" }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" stroke={C.berryHi} strokeWidth="1.8" />
          <path d="M7.5 10.5V8a4.5 4.5 0 019 0v2.5" stroke={C.berryHi} strokeWidth="1.8" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl lg:text-[44px]" style={{ fontFamily: DISP, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.text }}>
          Vote locked.
        </h1>
        <p className="mx-auto mt-3 max-w-sm" style={{ font: `400 15px/1.55 ${SANS}`, color: C.muted }}>
          Your ballot is in and can&apos;t be changed. Waiting on the rest of the table.
        </p>
      </div>
      <div style={{ font: `400 11px/1.4 ${MONO}`, color: C.faint, letterSpacing: "0.04em" }}>
        NOBODY SEES WHO YOU VOTED FOR — ONLY THE OUTCOME
      </div>
    </div>
  );
}
