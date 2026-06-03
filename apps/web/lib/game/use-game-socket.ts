"use client";

/**
 * Mounts a GameSocket for the lifetime of a /play session and feeds every
 * validated server event into the zustand store via the pure reducer. The
 * transport is chosen by `lib/ws/factory.createGameSocket`: a real
 * `WebSocketGameSocket` when `NEXT_PUBLIC_WS_URL` is set (M5 live server),
 * otherwise the scripted mock emitter (the local/demo default).
 *
 * Returns a `send` function so screens can cast votes / send messages through
 * the same socket. Secret ballot is enforced at the store + the mock: the client
 * only ever transmits its OWN `cast_vote`.
 */
import { useEffect, useMemo } from "react";
import type { ClientEvent } from "@ai-impostor/shared";
import { createGameSocket } from "@/lib/ws/factory";
import { useGameStore } from "./store";

export function useGameSocket(): { send: (ev: ClientEvent) => void } {
  const apply = useGameStore((s) => s.apply);
  const setConnected = useGameStore((s) => s.setConnected);
  const reset = useGameStore((s) => s.reset);

  // Create the socket once per mount (a fresh game each time /play mounts).
  // Live WS when NEXT_PUBLIC_WS_URL is set; scripted mock otherwise.
  const socket = useMemo(() => createGameSocket(), []);

  useEffect(() => {
    reset();
    const offEvent = socket.onEvent((ev) => apply(ev));
    const offConn = socket.onConnection((c) => setConnected(c));
    socket.connect();
    return () => {
      offEvent();
      offConn();
      socket.disconnect();
    };
  }, [socket, apply, setConnected, reset]);

  return {
    send: (ev: ClientEvent) => socket.send(ev),
  };
}
