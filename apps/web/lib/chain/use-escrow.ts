"use client";

/**
 * Wallet hooks for the escrow buy-in.
 *
 * - `useBuyIn()` reads the on-chain `buyIn()` (queue screen). Falls back to a
 *   mock value when no contract is deployed (M4: ESCROW_ADDRESS is the zero
 *   address until M2), so the queue screen renders without a live chain.
 * - `useJoin()` wraps a wagmi write of the payable `join(gameId)` buy-in. Wired
 *   against monadTestnet; need not execute against a live chain in M4 (M5).
 *
 * Uses the LOCAL ABI fragment (lib/chain/escrow.ts) — see its TODO re: M2.
 */
import { useCallback } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { monadTestnet } from "@/lib/wagmi";
import { escrowAbiFragment, escrowAddress } from "./escrow";

const ZERO = "0x0000000000000000000000000000000000000000";
/** Demo buy-in shown when no contract is deployed yet (5 MON). */
const MOCK_BUY_IN_WEI = 5_000_000_000_000_000_000n;

export function useBuyIn() {
  const deployed = escrowAddress.toLowerCase() !== ZERO;
  const query = useReadContract({
    abi: escrowAbiFragment,
    address: escrowAddress,
    functionName: "buyIn",
    chainId: monadTestnet.id,
    query: { enabled: deployed },
  });

  const buyInWei = deployed
    ? ((query.data as bigint | undefined) ?? null)
    : MOCK_BUY_IN_WEI;

  return {
    buyInWei,
    isMock: !deployed,
    isLoading: deployed ? query.isLoading : false,
  };
}

export function useJoin() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const join = useCallback(
    async (gameId: bigint, valueWei: bigint) => {
      return writeContractAsync({
        abi: escrowAbiFragment,
        address: escrowAddress,
        functionName: "join",
        args: [gameId],
        value: valueWei,
        chainId: monadTestnet.id,
      });
    },
    [writeContractAsync],
  );

  return { join, isPending, error };
}

/** Format wei → human MON string (e.g. 5000000000000000000n -> "5.00"). */
export function formatMon(wei: bigint | null, dp = 2): string {
  if (wei == null) return "—";
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = ((wei % base) * 10n ** BigInt(dp)) / base;
  return `${whole}.${frac.toString().padStart(dp, "0")}`;
}
