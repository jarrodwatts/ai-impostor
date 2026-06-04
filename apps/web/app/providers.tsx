"use client";

/**
 * App-wide client providers: plain wagmi (Monad testnet, injected wallet) +
 * TanStack Query. No Reown AppKit, no WalletConnect projectId — the wallet is
 * the browser-injected provider (MetaMask) connected via wagmi's `injected()`.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { SocketProvider } from "@/lib/ws/socket-provider";
import { AudioProvider } from "@/lib/audio/audio-provider";
import { SoundToggle } from "@/components/chrome/sound-toggle";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <AudioProvider>
            {children}
            <SoundToggle />
          </AudioProvider>
        </SocketProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
