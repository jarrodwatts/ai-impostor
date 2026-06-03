import { z } from "zod";

/**
 * Settlement contract — the cross-subsystem linchpin (M1 risk #1).
 *
 * `OnchainSettlement` is the EXACT struct the server EIP712-signs and the
 * ImpostorEscrow contract verifies. Its field order + types MUST match the
 * Solidity struct and EIP712 typehash byte-for-byte (pinned by a cross-language
 * test in M1). `SettlementReveal` is the richer payload broadcast to clients in
 * the `settlement` event — the only place AI identities + absolute MON surface.
 */

export const OUTCOME = z.enum(["HUMAN_WIN", "AI_WIN"]);
export type Outcome = z.infer<typeof OUTCOME>;

/** Signed + verified on-chain. survivors/payouts are parallel arrays. */
export const OnchainSettlement = z.object({
  gameId: z.bigint(),
  survivors: z.array(z.string()), // 0x addresses; empty on AI_WIN
  payouts: z.array(z.bigint()), // wei; parallel to survivors
  houseAmount: z.bigint(), // misvote cuts + (AI_WIN ? remaining pool : 0); absorbs dust
  resultRoot: z.string(), // reserved for post-MVP commit-reveal; 0x00..0 in v1
});
export type OnchainSettlement = z.infer<typeof OnchainSettlement>;

/** EIP712 typed-data definition — keep in lockstep with ImpostorEscrow's typehash. */
export const SETTLEMENT_EIP712_TYPES = {
  Settlement: [
    { name: "gameId", type: "uint256" },
    { name: "survivors", type: "address[]" },
    { name: "payouts", type: "uint256[]" },
    { name: "houseAmount", type: "uint256" },
    { name: "resultRoot", type: "bytes32" },
  ],
} as const;

export const SETTLEMENT_PRIMARY_TYPE = "Settlement" as const;

/**
 * Derive the canonical EIP712 type string from {@link SETTLEMENT_EIP712_TYPES}.
 * For the single-struct `Settlement` type this yields exactly:
 *   `Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)`
 *
 * This is the precise string the Solidity contract keccak256-hashes into
 * SETTLEMENT_TYPEHASH. A cross-language test pins the two together — see
 * settlement.test.ts and contracts/src/ImpostorEscrow.sol (SETTLEMENT_TYPEHASH).
 * Any reorder/rename/retype of fields here MUST be mirrored in the Solidity
 * struct, or the pin test fails (release blocker).
 */
export function canonicalSettlementTypeString(): string {
  const fields = SETTLEMENT_EIP712_TYPES[SETTLEMENT_PRIMARY_TYPE]
    .map((f) => `${f.type} ${f.name}`)
    .join(",");
  return `${SETTLEMENT_PRIMARY_TYPE}(${fields})`;
}

/**
 * The canonical EIP712 type string, precomputed. Exported so server/web can
 * reference the contract's signing type without importing the Solidity source.
 */
export const SETTLEMENT_TYPE_STRING = canonicalSettlementTypeString();

export function settlementDomain(chainId: number, verifyingContract: `0x${string}`) {
  return {
    name: "AI Impostor",
    version: "1",
    chainId,
    verifyingContract,
  } as const;
}

/** Conservation invariant the contract enforces with `==`: payouts + house == pool. */
export function conservationHolds(s: OnchainSettlement, pool: bigint): boolean {
  const paid = s.payouts.reduce((a, b) => a + b, 0n);
  return paid + s.houseAmount === pool;
}

// ── Broadcast reveal (client `settlement` event) ───────────────────
export const RevealSeat = z.object({
  seatId: z.string(),
  codename: z.string(),
  avatarColor: z.string(),
  wasAI: z.boolean(), // revealed for the FIRST time here
  survived: z.boolean(),
});
export type RevealSeat = z.infer<typeof RevealSeat>;

export const SettlementReveal = z.object({
  outcome: OUTCOME,
  roster: z.array(RevealSeat),
  aiReveal: z.array(z.string()), // seatIds that were AI
  pool: z.object({
    buyIn: z.string(), // stringified wei (MON) — first time absolute amounts are shown
    startPool: z.string(),
    houseTake: z.string(),
    finalPool: z.string(),
  }),
  myPayout: z.string().nullable(), // wei for this viewer, if a surviving human
  txHash: z.string().nullable(),
});
export type SettlementReveal = z.infer<typeof SettlementReveal>;
