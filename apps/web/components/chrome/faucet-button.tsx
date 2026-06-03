"use client";

/**
 * Reusable "Get test MON" button. POSTs `{address}` to `${httpBase}/faucet`
 * (the live server drips 0.1 MON and returns `{txHash}`), then shows pending /
 * success (with a Monad explorer tx link) / error inline. Disabled when no
 * wallet is connected.
 *
 * The HTTP base is derived from NEXT_PUBLIC_WS_URL (see lib/ws/factory.httpBase).
 * When unset, it falls back to same-origin; the request simply fails gracefully
 * (mock/demo has no faucet endpoint) and surfaces an error message.
 */
import { useState } from "react";
import { useAccount } from "wagmi";
import { Btn, type BtnProps, C, SANS } from "@/components/primitives";
import { httpBase } from "@/lib/ws/factory";

const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";

type FaucetState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; txHash: string }
  | { status: "error"; message: string };

export function FaucetButton({
  label = "GET TEST MON",
  variant = "tertiary",
  size = "default",
  full,
  style,
}: {
  label?: string;
  variant?: BtnProps["variant"];
  size?: BtnProps["size"];
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<FaucetState>({ status: "idle" });

  const onDrip = async () => {
    if (!address) return;
    const base = httpBase();
    if (!base) {
      setState({ status: "error", message: "Faucet unavailable in this build." });
      return;
    }
    setState({ status: "pending" });
    try {
      const res = await fetch(`${base}/faucet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Faucet failed (${res.status})`);
      }
      const data = (await res.json()) as { txHash?: string };
      if (!data.txHash) throw new Error("Faucet returned no tx hash.");
      setState({ status: "success", txHash: data.txHash });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Faucet request failed.",
      });
    }
  };

  const disabled = !isConnected || !address || state.status === "pending";

  return (
    <div className="flex flex-col gap-2" style={full ? { width: "100%" } : undefined}>
      <Btn
        variant={variant}
        size={size}
        full={full}
        disabled={disabled}
        onClick={onDrip}
        style={style}
      >
        {state.status === "pending" ? "DRIPPING…" : label}
      </Btn>
      {state.status === "success" && (
        <a
          href={`${EXPLORER_TX}${state.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ font: `400 12px/1.3 ${SANS}`, color: "#4ade80" }}
        >
          Sent 0.1 MON — view tx ↗
        </a>
      )}
      {state.status === "error" && (
        <span style={{ font: `400 12px/1.3 ${SANS}`, color: C.berryHi }}>
          {state.message}
        </span>
      )}
      {!isConnected && state.status === "idle" && (
        <span style={{ font: `400 12px/1.3 ${SANS}`, color: C.faint }}>
          Connect a wallet first.
        </span>
      )}
    </div>
  );
}
