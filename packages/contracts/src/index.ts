/**
 * @ai-impostor/contracts — chain config + generated ABI/address artifacts.
 *
 * The ABI + deployed address are regenerated in M2 from the Foundry build and
 * `contracts/deployments/10143.json`. The placeholders below keep web/server
 * type-checking before the contract is deployed; M2 replaces them.
 */
export * from "./chain.js";

/**
 * Canonical EIP712 type string for the `Settlement` struct the ImpostorEscrow
 * contract signs/verifies. Mirrored here so server/web can reference the escrow
 * EIP712 contract without importing the Solidity source.
 *
 * MUST stay byte-for-byte identical to:
 *   - packages/shared/src/settlement.ts → SETTLEMENT_TYPE_STRING
 *     (derived from SETTLEMENT_EIP712_TYPES; pinned by settlement.test.ts)
 *   - contracts/src/ImpostorEscrow.sol → SETTLEMENT_TYPEHASH (the keccak256 input)
 * Changing field order/names/types in any one without the others is a release blocker.
 */
export const SETTLEMENT_TYPE_STRING =
  "Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)" as const;

/**
 * Deployed singleton address — live on Monad testnet (chain 10143).
 * Source: contracts/deployments/10143.json (M2 deploy).
 */
export const ESCROW_ADDRESS: `0x${string}` =
  "0x25c4966C497F5E633a110314Dc284942C284ebc1";

/**
 * ImpostorEscrow ABI — generated from the Foundry build artifact in M2.
 * Regenerate `src/abi.ts` after any contract change (see M2 ABI-generation step).
 */
export { escrowAbi } from "./abi.js";
