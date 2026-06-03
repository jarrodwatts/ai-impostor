/**
 * Escrow contract bindings for the web app — the LIVE ImpostorEscrow on Monad
 * testnet. Re-exports the full generated `escrowAbi` + deployed `ESCROW_ADDRESS`
 * from @ai-impostor/contracts so the on-chain join/buyIn calls use the real ABI.
 */
import { ESCROW_ADDRESS, escrowAbi } from "@ai-impostor/contracts";

export const escrowAddress = ESCROW_ADDRESS;
export { escrowAbi };
