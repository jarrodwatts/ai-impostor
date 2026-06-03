"use client";

import { useEffect, useState } from "react";

/**
 * A 1Hz clock used to derive countdown timers from `phaseEndsAt`. Returns the
 * current epoch-ms, re-rendering once per `intervalMs`. Centralized so timers
 * never advance the authoritative phase — they only display remaining time.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
