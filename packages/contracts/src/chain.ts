/**
 * Monad testnet chain config (viem `defineChain` shape). chain_id 10143.
 * Consumed by the web app (wagmi) and the server (viem walletClient).
 */
export const monadTestnet = {
  id: 10_143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
} as const;
