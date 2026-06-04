"use client";

/**
 * Guest lobby join (the demo flow). No wallet, no chain, no buy-in.
 *
 * Mounts on the shared app-session socket (owned by SocketProvider) and drives:
 *
 *   1. on connect → send `request_join {address:"guest"}`
 *   2. server (demo mode) seats us immediately → `lobby_open` / `game_started`
 *   3. on `game_started` the caller routes into the game
 *
 * `join_rejected {reason}` is surfaced via the store; the caller shows it + a
 * retry that re-sends `request_join`. There is no payment step, no MON, and no
 * on-chain read anywhere in this path.
 */
import { useCallback, useEffect } from "react";
import { useSocket } from "@/lib/ws/socket-provider";
import { useGameStore } from "./store";

const GUEST_ADDRESS = "guest";

export type JoinStatus =
  | "connecting" // socket not yet open
  | "joining" // sent request_join, awaiting lobby/seating
  | "lobby" // lobby_open received; filling
  | "seated"; // game_started — proceed into the game

export function useLobbyJoin() {
  const { send } = useSocket();
  const clearJoinRejected = useGameStore((s) => s.clearJoinRejected);

  const connected = useGameStore((s) => s.connected);
  const lobby = useGameStore((s) => s.lobby);
  const gameId = useGameStore((s) => s.gameId);
  const rosterCount = useGameStore((s) => s.roster.length);
  const joinRejectedReason = useGameStore((s) => s.joinRejectedReason);

  // The socket + store are owned by SocketProvider (one connection for the whole
  // session). This hook does NOT create or tear down a socket; it only sends the
  // guest join over the shared `send`, so navigating queue → /play keeps the same
  // connection (and the seat/roster it earned) alive.

  // Request a guest seat whenever the (shared) socket is connected. The provider
  // may have connected before this screen mounted, so we fire on
  // mount-if-already-connected AND on any reconnect. The handshake is idempotent
  // server-side, so a repeat request_join is harmless.
  useEffect(() => {
    if (!connected) return;
    send({ t: "request_join", address: GUEST_ADDRESS });
  }, [connected, send]);

  // Retry after a rejection: clear the reason + re-request a seat.
  const retry = useCallback(() => {
    clearJoinRejected();
    send({ t: "request_join", address: GUEST_ADDRESS });
  }, [clearJoinRejected, send]);

  // Derive status purely from store inputs — no setState-in-effect.
  const seated = gameId != null && rosterCount > 0;
  const status: JoinStatus = seated
    ? "seated"
    : lobby
      ? "lobby"
      : connected
        ? "joining"
        : "connecting";

  return {
    status,
    joinRejectedReason,
    lobby,
    gameId,
    retry,
  };
}
