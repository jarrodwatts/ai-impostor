"use client";

/**
 * Thin accessor for the /play screens: returns a `send` bound to the SINGLE
 * app-session socket created by `SocketProvider` (see `lib/ws/socket-provider`).
 *
 * Previously this hook mounted its OWN socket per /play mount and called
 * `reset()` — on the live server that opened a fresh connection the server didn't
 * associate with the seated player and wiped the seat/roster received during the
 * lobby join. The socket + store now live above the routes, so /play reuses the
 * same connection and state with no reset and no re-mount.
 *
 * Secret ballot is still enforced at the store + the mock: the client only ever
 * transmits its OWN `cast_vote` through this `send`.
 */
import type { ClientEvent } from "@ai-impostor/shared";
import { useSocket } from "@/lib/ws/socket-provider";

export function useGameSocket(): { send: (ev: ClientEvent) => void } {
  return useSocket();
}
