"use client";

/**
 * App-wide client providers: wagmi (Monad testnet) + Reown AppKit modal +
 * TanStack Query. Cloned from /Users/jarrod/monapp/context/index.tsx, retargeted
 * to Monad testnet and stripped of Funkit. AppKit is initialized once at module
 * load (outside the render cycle) per the Reown pattern.
 */
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { type Config, WagmiProvider } from "wagmi";
import { REOWN_PROJECT_ID, monadTestnet, wagmiAdapter, wagmiConfig } from "@/lib/wagmi";

const metadata = {
  name: "AI Impostor",
  description:
    "AI Impostor — a social deduction game on Monad. Spot the AI before it spots you.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://aiimpostor.xyz",
  icons: ["/monad-logo-mark.svg"],
};

// Initialize AppKit once, outside the React render cycle.
createAppKit({
  adapters: [wagmiAdapter],
  projectId: REOWN_PROJECT_ID,
  networks: [monadTestnet],
  defaultNetwork: monadTestnet,
  metadata,
  themeMode: "dark",
  features: { analytics: false, email: false, socials: [] },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
