/**
 * Plain wagmi config for the live player-funded demo — injected (MetaMask)
 * wallet ONLY. No WalletConnect / Reown projectId anywhere.
 *
 * Chain: Monad testnet (id 10143), config mirrored from @ai-impostor/contracts
 * `monadTestnet`. The RPC may be overridden via NEXT_PUBLIC_MONAD_TESTNET_RPC.
 */
import { createConfig, http, injected } from "wagmi";
import { defineChain } from "viem";
import { monadTestnet as monadTestnetConfig } from "@ai-impostor/contracts";

/**
 * Monad testnet as a viem `Chain`. Values mirror packages/contracts
 * `monadTestnet` (id 10143, MON, testnet RPC + explorer).
 */
export const monadTestnet = defineChain({
  id: monadTestnetConfig.id,
  name: monadTestnetConfig.name,
  nativeCurrency: monadTestnetConfig.nativeCurrency,
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC ??
          monadTestnetConfig.rpcUrls.default.http[0],
      ],
    },
  },
  blockExplorers: monadTestnetConfig.blockExplorers,
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
});
