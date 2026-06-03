"use client";

/**
 * Wallet hooks for the escrow buy-in (LIVE on Monad testnet).
 *
 * - `useBuyIn()` reads the on-chain `buyIn()` (display fallback for the buy-in
 *   amount when the server's lobby_open hasn't arrived yet).
 * - `useJoin()` wraps the payable `join(gameId)` write against a given escrow
 *   address (from the server's `lobby_open`) and exposes the tx hash so the
 *   caller can wait for the receipt before confirming payment to the server.
 *
 * Uses the full generated `escrowAbi` from @ai-impostor/contracts.
 */
import { useCallback } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { monadTestnet } from "@/lib/wagmi";
import { escrowAbi, escrowAddress } from "./escrow";

export function useBuyIn() {
  const query = useReadContract({
    abi: escrowAbi,
    address: escrowAddress,
    functionName: "buyIn",
    chainId: monadTestnet.id,
  });

  return {
    buyInWei: (query.data as bigint | undefined) ?? null,
    isLoading: query.isLoading,
  };
}

export function useJoin() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  /**
   * Send the payable `join(gameId)` buy-in to `address` with `value: valueWei`.
   * Returns the tx hash; the caller waits for the receipt then confirms to the
   * server. `address` defaults to the deployed escrow but should be the one
   * from `lobby_open`.
   */
  const join = useCallback(
    async (
      gameId: bigint,
      valueWei: bigint,
      address: `0x${string}` = escrowAddress,
    ) => {
      return writeContractAsync({
        abi: escrowAbi,
        address,
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
