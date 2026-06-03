"use client";

/**
 * App-level single-socket provider. ONE `GameSocket` is created for the whole
 * client session (mounted high in `app/providers.tsx`), connected once, and
 * shared across every screen: connect → queue/lobby → /play → /result all speak
 * through the SAME socket and the SAME zustand store.
 *
 * Why a single socket: on the live server the WebSocket connection identifies the
 * seated player. Previously the queue screen and the /play screen each mounted
 * their own socket (and /play also called `reset()`), so navigating queue → /play
 * opened a fresh connection the server didn't associate with the seated player and
 * wiped the seat/roster received during join. Hoisting one socket above the routes
 * fixes both: navigation never tears down the connection, and state survives.
 *
 * Transport is chosen by {@link createGameSocket}: a live `WebSocketGameSocket`
 * when `NEXT_PUBLIC_WS_URL` is set, otherwise the scripted mock. Either way it is
 * created exactly once here and disconnected only on unmount (i.e. when the whole
 * app tears down), never on route changes.
 *
 * Anti-leak / secret-ballot invariants are untouched: this provider only pumps
 * validated `ServerEvent`s into `useGameStore.apply` (the pure reducer) and exposes
 * a `send` for validated `ClientEvent`s — it holds no game state of its own.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { ClientEvent } from "@ai-impostor/shared";
import { createGameSocket } from "@/lib/ws/factory";
import { useGameStore } from "@/lib/game/store";

type SocketContextValue = { send: (ev: ClientEvent) => void };

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const apply = useGameStore((s) => s.apply);
  const setConnected = useGameStore((s) => s.setConnected);
  const reset = useGameStore((s) => s.reset);

  // ONE socket for the entire client session. Live WS when NEXT_PUBLIC_WS_URL is
  // set; scripted mock otherwise.
  const socket = useMemo(() => createGameSocket(), []);

  useEffect(() => {
    // Fresh session: clear any stale state from a prior game before the first
    // events arrive. This is the single, minimal reset — done once when the
    // provider first connects, NOT on every /play mount (which used to wipe the
    // seat/roster the join handshake had already populated).
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

  const value = useMemo<SocketContextValue>(
    () => ({ send: (ev: ClientEvent) => socket.send(ev) }),
    [socket],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

/** Access the shared app-session socket's `send`. Must be under SocketProvider. */
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}
