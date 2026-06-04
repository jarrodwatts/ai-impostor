"use client";

/**
 * Legacy connect screen — REMOVED from the demo flow (no wallet). Any stale link
 * to /connect bounces straight to the guest join screen.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/queue");
  }, [router]);
  return null;
}
