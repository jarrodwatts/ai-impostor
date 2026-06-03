import {
  conservationHolds,
  type OnchainSettlement,
  type Outcome,
  SETTLEMENT_EIP712_TYPES,
  SETTLEMENT_PRIMARY_TYPE,
  type SettlementReveal,
  settlementDomain,
} from "@ai-impostor/shared";
import { monadTestnet } from "@ai-impostor/contracts";
import { privateKeyToAccount } from "viem/accounts";
import type { GameState, SeatRecord } from "../game/types.js";

/**
 * Settlement builder + EIP712 signer (plans.md M3, SPEC §6).
 *
 * Builds the OnchainSettlement the ImpostorEscrow contract verifies and the
 * richer SettlementReveal broadcast to clients (the ONLY place AI identities +
 * absolute MON surface). Signs EIP712 with the server signer key against the
 * shared domain/types + Monad testnet chain.
 *
 * Submitting the tx is behind the SettlementSubmitter interface — the default
 * impl is a stub (no live chain needed). Conservation `Σpayouts + house ==
 * pool` is asserted here before signing (HARD invariant, standards.md §5).
 */

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/** Outcome of building a settlement for a finished game. */
export interface BuiltSettlement {
  onchain: OnchainSettlement;
  reveal: SettlementReveal;
  /** The original pool used for the conservation check (wei). */
  pool: bigint;
}

/**
 * Compute the equal split of `pool` among `n` survivors, sending the remainder
 * (dust) to the house (HARD invariant: dust → house, standards.md §5).
 */
export function splitPool(
  pool: bigint,
  n: number,
): { each: bigint; dust: bigint } {
  if (n <= 0) return { each: 0n, dust: pool };
  const each = pool / BigInt(n);
  const dust = pool - each * BigInt(n);
  return { each, dust };
}

/**
 * Build the OnchainSettlement + SettlementReveal from final game state.
 *
 * HUMAN_WIN: surviving humans split the remaining pool equally; misvote cuts
 *   already accrued to houseWei during resolution; dust → house.
 * AI_WIN: house takes 100% of the remaining pool; survivors/payouts empty.
 *
 * @param viewerSeatId optional — if provided and the viewer is a surviving
 *   human, myPayout is filled in for the reveal payload.
 */
export function buildSettlement(
  game: GameState,
  outcome: Outcome,
  viewerSeatId?: string,
): BuiltSettlement {
  const seats: SeatRecord[] = game.seatOrder.map((id) => game.seats.get(id)!);
  const survivingHumans = seats.filter((s) => s.alive && !s.isAI);

  const pool = game.pool;
  let survivors: `0x${string}`[] = [];
  let payouts: bigint[] = [];
  // houseWei already holds misvote cuts accrued during the game.
  let houseAmount = game.houseWei;

  const payoutBySeat = new Map<string, bigint>();

  if (outcome === "AI_WIN") {
    // House takes 100% of the remaining pool. No payouts.
    houseAmount += pool;
  } else {
    // HUMAN_WIN: split remaining pool among surviving humans; dust → house.
    const funders = survivingHumans.filter((s) => s.funderAddress);
    const { each, dust } = splitPool(pool, funders.length);
    for (const s of funders) {
      survivors.push(s.funderAddress as `0x${string}`);
      payouts.push(each);
      payoutBySeat.set(s.seatId, each);
    }
    houseAmount += dust;
  }

  const onchain: OnchainSettlement = {
    gameId: game.gameIdNum,
    survivors,
    payouts,
    houseAmount,
    resultRoot: ZERO_BYTES32,
  };

  // Conservation MUST hold: Σpayouts + house == original pool (game.startPool
  // minus nothing — misvote cuts are inside houseWei, the remaining pool is in
  // either payouts (human win) or houseAmount (ai win)). The invariant the
  // contract enforces is against the *escrowed* pool = startPool.
  if (!conservationHolds(onchain, game.startPool)) {
    throw new Error(
      `settlement conservation violated: payouts+house != startPool ` +
        `(start=${game.startPool} house=${houseAmount})`,
    );
  }

  // Build the reveal (first + only place AI + absolute MON surface).
  const reveal: SettlementReveal = {
    outcome,
    roster: seats.map((s) => ({
      seatId: s.seatId,
      codename: s.codename,
      avatarColor: s.avatarColor,
      wasAI: s.isAI,
      survived: s.alive,
    })),
    aiReveal: seats.filter((s) => s.isAI).map((s) => s.seatId),
    pool: {
      buyIn: game.buyInWei.toString(),
      startPool: game.startPool.toString(),
      houseTake: houseAmount.toString(),
      finalPool: pool.toString(),
    },
    myPayout:
      viewerSeatId && payoutBySeat.has(viewerSeatId)
        ? payoutBySeat.get(viewerSeatId)!.toString()
        : null,
    txHash: null,
  };

  return { onchain, reveal, pool };
}

/** EIP712 typed-data sign of an OnchainSettlement using the server signer. */
export async function signSettlement(
  onchain: OnchainSettlement,
  serverSignerKey: `0x${string}`,
  verifyingContract: `0x${string}`,
  chainId: number = monadTestnet.id,
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(serverSignerKey);
  const signature = await account.signTypedData({
    domain: settlementDomain(chainId, verifyingContract),
    types: SETTLEMENT_EIP712_TYPES,
    primaryType: SETTLEMENT_PRIMARY_TYPE,
    message: {
      gameId: onchain.gameId,
      survivors: onchain.survivors as `0x${string}`[],
      payouts: onchain.payouts,
      houseAmount: onchain.houseAmount,
      resultRoot: onchain.resultRoot as `0x${string}`,
    },
  });
  return signature;
}

// ── On-chain submission (stubbed behind an interface) ──────────────────
export interface SubmitResult {
  txHash: string | null;
}

export interface SettlementSubmitter {
  submit(
    onchain: OnchainSettlement,
    signature: `0x${string}`,
  ): Promise<SubmitResult>;
}

/**
 * Default submitter — does NOT touch a live chain. M2 deploys the contract and
 * M5 wires a viem walletClient here. Until then we just acknowledge with a null
 * tx hash so the headless sim + tests run with no chain.
 */
export class StubSettlementSubmitter implements SettlementSubmitter {
  async submit(
    _onchain: OnchainSettlement,
    _signature: `0x${string}`,
  ): Promise<SubmitResult> {
    return { txHash: null };
  }
}
