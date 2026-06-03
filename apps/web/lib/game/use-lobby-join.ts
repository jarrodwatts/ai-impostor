"use client";

/**
 * On-chain lobby join handshake (the core live demo flow).
 *
 * Mounts a GameSocket (live WS when NEXT_PUBLIC_WS_URL is set; scripted mock
 * otherwise), feeds every event into the zustand store, and drives:
 *
 *   1. on connect → send `request_join {address}`
 *   2. server → `lobby_open {gameId, escrowAddress, buyInWei, minHumans,
 *      humansSeated, ...}` (persisted in the store)
 *   3. user clicks "Pay buy-in & join" → wagmi `join(BigInt(gameId))` with
 *      `value: buyInWei` against the escrowAddress from lobby_open
 *   4. wait for the tx receipt → send `confirm_payment {gameId, address, txHash}`
 *   5. server seats us → `game_started` → caller routes into the game
 *
 * `join_rejected {reason}` is surfaced via the store; the caller shows it + a
 * retry that re-sends `request_join`.
 *
 * Anti-leak: this only touches PRE-GAME lobby state (fixed buy-in B + lobby-fill
 * progress). No mid-game fields are read or held here.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { isLiveSocket } from "@/lib/ws/factory";
import { useSocket } from "@/lib/ws/socket-provider";
import { useJoin } from "@/lib/chain/use-escrow";
import { useGameStore } from "./store";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MOCK_TX_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export type JoinStatus =
  | "connecting" // socket not yet open
  | "waiting_lobby" // sent request_join, awaiting lobby_open
  | "ready" // lobby_open received; CTA available
  | "paying" // join() tx submitted, awaiting receipt
  | "confirming" // receipt in; confirm_payment sent, awaiting seating
  | "seated"; // game_started — proceed into the game

/** Local progression past "ready", tracked imperatively from user actions. */
type Stage = "idle" | "paying" | "confirming";

export function useLobbyJoin() {
  const { address } = useAccount();
  const { send } = useSocket();
  const clearJoinRejected = useGameStore((s) => s.clearJoinRejected);
  const { join } = useJoin();

  const connected = useGameStore((s) => s.connected);
  const lobby = useGameStore((s) => s.lobby);
  const gameId = useGameStore((s) => s.gameId);
  const rosterCount = useGameStore((s) => s.roster.length);
  const joinRejectedReason = useGameStore((s) => s.joinRejectedReason);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // The socket + store are owned by SocketProvider (one connection for the whole
  // session). This hook does NOT create or tear down a socket; it only drives the
  // join handshake over the shared `send`, so navigating queue → /play keeps the
  // same connection (and the seat/roster it earned) alive.

  // Keep the latest address available to the connect handler without reading a
  // ref during render.
  const addressRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Request a lobby seat whenever the (shared) socket is connected. The provider
  // may have connected before this screen mounted, so we fire on mount-if-already
  // -connected AND on any reconnect. lobby_open is idempotent in the reducer, so a
  // repeat request_join is harmless (re-advertises the same open lobby).
  useEffect(() => {
    if (!connected) return;
    send({ t: "request_join", address: addressRef.current ?? ZERO_ADDRESS });
  }, [connected, send]);

  // Wait for the buy-in tx receipt; confirm payment to the server exactly once.
  const { isSuccess: receiptOk, isError: receiptErr } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined,
      query: { enabled: txHash != null },
    });

  const confirmedRef = useRef(false);
  useEffect(() => {
    if (receiptOk && txHash && !confirmedRef.current) {
      const l = useGameStore.getState().lobby;
      if (!l) return;
      confirmedRef.current = true;
      // External sync: tell the server the on-chain buy-in landed.
      send({
        t: "confirm_payment",
        gameId: l.gameId,
        address: addressRef.current ?? ZERO_ADDRESS,
        txHash,
      });
    }
  }, [receiptOk, txHash, send]);

  // Pay buy-in & join: write join(gameId) with value=buyInWei to the escrow
  // address from lobby_open, then wait for the receipt (above).
  const payAndJoin = useCallback(async () => {
    const l = useGameStore.getState().lobby;
    if (!l) return;
    setError(null);
    confirmedRef.current = false;

    // Mock/demo path (no live WS): no real chain — skip the wallet write and
    // confirm with a placeholder tx so the join flow proceeds end-to-end.
    if (!isLiveSocket()) {
      setStage("confirming");
      send({
        t: "confirm_payment",
        gameId: l.gameId,
        address: address ?? ZERO_ADDRESS,
        txHash: MOCK_TX_HASH,
      });
      return;
    }

    if (!address) {
      setError("Connect a wallet to pay the buy-in.");
      return;
    }
    setStage("paying");
    try {
      const hash = await join(
        BigInt(l.gameId),
        BigInt(l.buyInWei),
        l.escrowAddress as `0x${string}`,
      );
      setTxHash(hash);
    } catch (err) {
      setStage("idle");
      setError(
        err instanceof Error ? err.message : "Could not submit the buy-in.",
      );
    }
  }, [address, join, send]);

  // Retry after a rejection: clear the reason + re-request a lobby seat.
  const retry = useCallback(() => {
    clearJoinRejected();
    setError(null);
    setTxHash(null);
    setStage("idle");
    confirmedRef.current = false;
    send({ t: "request_join", address: address ?? ZERO_ADDRESS });
  }, [clearJoinRejected, address, send]);

  // Derive the externally-visible status from the store + local stage. No
  // setState-in-effect: the status is a pure function of inputs. A failed
  // receipt drops us back to "ready" so the CTA stays usable.
  const seated = gameId != null && rosterCount > 0;
  const receiptFailed = receiptErr && txHash != null;
  const status: JoinStatus = seated
    ? "seated"
    : receiptFailed
      ? "ready"
      : stage === "confirming" || (receiptOk && txHash != null)
        ? "confirming"
        : stage === "paying"
          ? "paying"
          : lobby
            ? "ready"
            : connected
              ? "waiting_lobby"
              : "connecting";

  return {
    status,
    error: error ?? (receiptFailed ? "Buy-in transaction failed on-chain." : null),
    joinRejectedReason,
    lobby,
    gameId,
    payAndJoin,
    retry,
    // Live path needs a connected wallet to pay; the mock/demo path does not.
    canPay:
      status === "ready" && lobby != null && (!isLiveSocket() || address != null),
  };
}
