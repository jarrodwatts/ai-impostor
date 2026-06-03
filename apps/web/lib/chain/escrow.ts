/**
 * Local ImpostorEscrow ABI fragment for the calls the web app makes in M4:
 * `join(uint256 gameId)` payable and `buyIn()` view. This is intentionally a
 * SMALL local fragment, not the full generated ABI.
 *
 * TODO: replace with @ai-impostor/contracts `escrowAbi` after M2 publishes the
 * generated ABI. We avoid importing it now so a placeholder/empty ABI during the
 * concurrent M2 work cannot break web's type-checking or these hooks.
 */
import { ESCROW_ADDRESS } from "@ai-impostor/contracts";

export const escrowAddress = ESCROW_ADDRESS;

/** Minimal ABI fragment — superset-compatible with the real escrow. */
export const escrowAbiFragment = [
  {
    type: "function",
    name: "join",
    stateMutability: "payable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buyIn",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint128" }],
  },
] as const;
