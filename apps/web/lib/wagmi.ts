/**
 * wagmi + Reown AppKit configuration, retargeted to Monad testnet (chain 10143).
 * Cloned/adapted from /Users/jarrod/monapp (config/wagmi.ts + config/index.tsx),
 * dropping Funkit/mainnet and pointing at the testnet config exported by
 * @ai-impostor/contracts (monadTestnet).
 *
 * The Reown projectId comes from NEXT_PUBLIC_REOWN_PROJECT_ID with a safe
 * placeholder fallback so `next build` never fails when the env var is absent
 * (wallet connect simply won't be functional until a real id is provided —
 * acceptable for M4, where chain writes are wired but not required to execute).
 */
import { defineChain } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http } from "wagmi";
import { monadTestnet as monadTestnetConfig } from "@ai-impostor/contracts";

/** Reown AppKit project id (safe fallback keeps the build green pre-config). */
export const REOWN_PROJECT_ID =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "ai-impostor-dev-placeholder";

/**
 * Monad testnet as an AppKit `CaipNetwork`. Field values mirror
 * packages/contracts `monadTestnet` (id 10143, MON, testnet RPC).
 */
export const monadTestnet = defineChain({
  id: monadTestnetConfig.id,
  caipNetworkId: `eip155:${monadTestnetConfig.id}`,
  chainNamespace: "eip155",
  testnet: true,
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
});

export const wagmiAdapter = new WagmiAdapter({
  projectId: REOWN_PROJECT_ID,
  networks: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
