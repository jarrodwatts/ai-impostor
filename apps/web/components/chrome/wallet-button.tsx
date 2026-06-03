"use client";

/**
 * Wallet connect button + connected-address chip, backed by plain wagmi with the
 * injected (MetaMask) connector — NO WalletConnect / Reown projectId. Connects
 * via `useConnect` against the injected connector; when connected shows the short
 * address chip. If connected on the wrong chain, offers to switch to Monad
 * testnet via `useSwitchChain`.
 */
import { useConnect, useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { Btn, type BtnProps, MONO } from "@/components/primitives";
import { monadTestnet } from "@/lib/wagmi";

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
  const { connect, connectors, isPending } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const onConnect = () => {
    const connector =
      connectors.find((c) => c.type === "injected") ?? connectors[0];
    connect({ connector: connector ?? injected() });
  };

  if (isConnected && address) {
    const wrongChain = chainId !== monadTestnet.id;
    if (wrongChain) {
      return (
        <Btn
          variant="berry"
          size={size}
          full={full}
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: monadTestnet.id })}
        >
          {isSwitching ? "SWITCHING…" : "SWITCH TO MONAD"}
        </Btn>
      );
    }
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect"
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
    <Btn
      variant={variant}
      size={size}
      full={full}
      disabled={isPending}
      onClick={onConnect}
    >
      {isPending ? "CONNECTING…" : label}
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
