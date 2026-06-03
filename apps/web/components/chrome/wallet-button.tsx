"use client";

/**
 * Wallet connect button + connected-address chip, backed by Reown AppKit +
 * wagmi. Opens the AppKit modal; when connected shows the short address chip
 * from the design screens (green dot + 0x… short form).
 */
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { Btn, type BtnProps, MONO } from "@/components/primitives";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletButton({
  label = "CONNECT WALLET",
  variant = "secondary",
  size = "sm",
  full,
}: {
  label?: string;
  variant?: BtnProps["variant"];
  size?: BtnProps["size"];
  full?: boolean;
}) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => open()}
        className="flex items-center gap-[7px] rounded-full px-3 py-[7px]"
        style={{
          background: "rgba(22,163,74,0.12)",
          border: "1px solid rgba(22,163,74,0.3)",
        }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: 9999, background: "#4ade80" }}
        />
        <span style={{ font: `500 11px/1 ${MONO}`, color: "#4ade80" }}>
          {shortAddr(address)}
        </span>
      </button>
    );
  }

  return (
    <Btn variant={variant} size={size} full={full} onClick={() => open()}>
      {label}
    </Btn>
  );
}

/** Read-only address chip (assumes connected); falls back to nothing. */
export function WalletChip() {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return null;
  return (
    <div
      className="flex items-center gap-[7px] rounded-full px-3 py-[7px]"
      style={{
        background: "rgba(22,163,74,0.12)",
        border: "1px solid rgba(22,163,74,0.3)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: "#4ade80" }} />
      <span style={{ font: `500 11px/1 ${MONO}`, color: "#4ade80" }}>
        {shortAddr(address)}
      </span>
    </div>
  );
}
