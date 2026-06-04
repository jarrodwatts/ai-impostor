"use client";

/**
 * Legacy faucet / balance screen — REMOVED from the demo flow (no MON, no buy-in).
 * Any stale link to /faucet bounces straight to the guest join screen.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FaucetPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/queue");
  }, [router]);
  return null;
}
