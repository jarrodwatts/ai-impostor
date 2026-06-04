"use client";

/**
 * SettlementCard — a SIMULATED on-chain settlement for the demo. The hackathon
 * build has no chain, so there is no real pot, payout, or transaction. This
 * card fakes the economics purely client-side to SHOW what a real-money round
 * would look like (buy-in → pot → outcome-driven payout → house take). The
 * numbers are illustrative; the tx hash is fabricated, not a real on-chain tx.
 *
 * Numbers are illustrative, scaled to a full 10-seat table (10 × 1 MON entry),
 * and the result line mirrors the viewer's own read of the table:
 *   - caught an agent  → you take a cut of the pot
 *   - backed a human / didn't vote → you forfeit your stake to the house
 *
 * The framing: you stake yourself, the house stakes the agents. Catch agents
 * and you win from the pot; get fooled and the house keeps it.
 */
import { C, DISP, MONO, SANS, Eyebrow } from "@/components/primitives";

// Illustrative full-table economics (NOT derived from the live 1-human demo,
// which would always resolve to a degenerate "AI win / you lose"). Scaled to a
// 1,000 MON entry across a 10-seat table.
const POT = "10,000";
const ENTRY = "1,000";
const HOUSE = "400";
const WIN_PAYOUT = "1,600";

/** Stable fake 0x tx hash derived from the gameId (no randomness, no chain). */
function fakeTxHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = (h.toString(16) + "0".repeat(8)).slice(0, 8);
  return `0x${hex}${"a3f7c1d2e9b4"}…${hex.slice(0, 4)}`;
}

function Row({
  label,
  value,
  color = C.text,
  strong = false,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ font: `400 12px/1.4 ${MONO}`, color: C.faint, letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span
        style={{
          font: `500 ${strong ? 17 : 14}px/1 ${DISP}`,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function SettlementCard({
  won,
  voted,
  gameId,
}: {
  /** Did this viewer catch an agent (their vote landed on an AI)? */
  won: boolean;
  /** Did this viewer cast a vote at all? */
  voted: boolean;
  gameId: string;
}) {
  const resultColor = won ? C.purple : C.berryHi;
  const resultValue = won ? `+${WIN_PAYOUT} MON` : `−${ENTRY} MON`;
  const resultLabel = won
    ? "Bounty — you caught an agent"
    : voted
      ? "You backed the wrong seat"
      : "No vote — stake forfeited";

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-5"
      style={{ background: C.card, border: `1px solid ${C.line}` }}
    >
      <div className="mb-4">
        <Eyebrow color={C.faint}>SETTLEMENT</Eyebrow>
      </div>

      <div className="flex flex-col gap-[10px]">
        <Row label="POT" value={`${POT} MON`} strong />
        <Row label="YOUR ENTRY" value={`${ENTRY} MON`} color={C.muted} />
        <div style={{ height: 1, background: C.lineSoft, margin: "2px 0" }} />
        <Row label="RESULT" value={resultValue} color={resultColor} strong />
        <Row label="HOUSE TAKE" value={`${HOUSE} MON`} color={C.muted} />
      </div>

      <p className="mt-3" style={{ font: `400 12px/1.4 ${SANS}`, color: resultColor }}>
        {resultLabel}
      </p>

      <div
        className="mt-4 flex items-center border-t pt-3"
        style={{ borderColor: C.lineSoft }}
      >
        <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint, letterSpacing: "0.04em" }}>
          tx {fakeTxHash(gameId)} ↗
        </span>
      </div>
    </div>
  );
}
