"use client";

/**
 * Settlement breakdown card — the only place absolute MON is shown, sourced from
 * `SettlementReveal.pool` + `myPayout` (the reveal payload). Mirrors the design
 * SettlementDesktop/Mobile rows + the on-chain tx confirmation chip.
 */
import { Btn, Eyebrow, C, MONO, SANS, DISP } from "@/components/primitives";
import type { SettlementReveal } from "@ai-impostor/shared";
import { formatMon } from "@/lib/chain/use-escrow";

function shortHash(h: string): string {
  return h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}

export function ResultCard({
  reveal,
  onContinue,
}: {
  reveal: SettlementReveal;
  onContinue: () => void;
}) {
  const { pool, myPayout, txHash } = reveal;
  const buyInWei = BigInt(pool.buyIn);
  const startWei = BigInt(pool.startPool);
  const houseWei = BigInt(pool.houseTake);
  const finalWei = BigInt(pool.finalPool);
  const payoutWei = myPayout != null ? BigInt(myPayout) : null;
  const survivors = reveal.roster.filter((s) => s.survived && !s.wasAI).length;
  const netWei = payoutWei != null ? payoutWei - buyInWei : null;
  const netPositive = netWei != null && netWei >= 0n;

  const rows: Array<[string, string]> = [
    ["Your buy-in", `${formatMon(buyInWei)} MON`],
    ["Pool at start", `${formatMon(startWei)} MON`],
    ["Misvote penalties", `−${formatMon(houseWei)} MON`],
    ["Final pool", `${formatMon(finalWei)} MON`],
    ["Split between survivors", `÷ ${survivors}`],
  ];

  return (
    <div className="flex w-full max-w-md flex-col">
      <div className="mb-4 text-center">
        <Eyebrow color="#4ade80">SETTLED ON MONAD</Eyebrow>
        <div
          style={{
            font: `500 56px/1 ${DISP}`,
            letterSpacing: "-0.03em",
            color: C.text,
            margin: "14px 0 8px",
          }}
        >
          {payoutWei != null ? formatMon(payoutWei) : "0.00"}{" "}
          <span style={{ font: `400 20px/1 ${SANS}`, color: C.faint }}>MON</span>
        </div>
        {netWei != null && (
          <div
            className="inline-flex items-center gap-[6px]"
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              background: netPositive
                ? "rgba(22,163,74,0.14)"
                : C.berrySoft,
            }}
          >
            <span
              style={{
                font: `500 12px/1 ${MONO}`,
                color: netPositive ? "#4ade80" : C.berryHi,
              }}
            >
              {netPositive ? "+" : "−"}
              {formatMon(netWei < 0n ? -netWei : netWei)} MON NET
            </span>
          </div>
        )}
      </div>

      <div
        className="mb-[14px] rounded-2xl p-4"
        style={{ background: C.bgRaise, border: `1px solid ${C.line}` }}
      >
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className="flex items-center justify-between py-[9px]"
            style={{ borderTop: i ? `1px solid ${C.lineSoft}` : "none" }}
          >
            <span style={{ font: `400 13px/1 ${SANS}`, color: C.muted }}>{k}</span>
            <span style={{ font: `500 13px/1 ${MONO}`, color: C.text }}>{v}</span>
          </div>
        ))}
      </div>

      {txHash && (
        <div
          className="mb-3 flex items-center gap-[10px] rounded-xl px-[15px] py-[13px]"
          style={{
            background: "rgba(22,163,74,0.1)",
            border: "1px solid rgba(22,163,74,0.3)",
          }}
        >
          <div
            className="grid flex-none place-items-center"
            style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(22,163,74,0.2)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l5 5L19 7"
                stroke="#4ade80"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div style={{ font: `500 12px/1.2 ${SANS}`, color: "#4ade80" }}>
              Payout confirmed
            </div>
            <div style={{ font: `400 11px/1.2 ${MONO}`, color: C.faint, marginTop: 2 }}>
              {shortHash(txHash)}
            </div>
          </div>
          <span
            style={{
              font: `500 10px/1 ${MONO}`,
              color: "#4ade80",
              letterSpacing: "0.06em",
            }}
          >
            EXPLORER ↗
          </span>
        </div>
      )}

      <Btn variant="primary" full onClick={onContinue}>
        CONTINUE
      </Btn>
    </div>
  );
}
