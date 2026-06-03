import { describe, expect, it } from "vitest";
import { conservationHolds } from "@ai-impostor/shared";
import {
  buildSettlement,
  signSettlement,
  splitPool,
  StubSettlementSubmitter,
} from "./settle.js";
import type { GameState, SeatRecord } from "../game/types.js";

function seat(
  i: number,
  isAI: boolean,
  alive: boolean,
  funder: string | null,
): SeatRecord {
  return {
    seatId: `s${i}`,
    codename: `N${i}`,
    avatarColor: "#836EF9",
    isAI,
    alive,
    funderAddress: funder,
    personaKey: isAI ? "joker" : null,
  };
}

function gameWith(seats: SeatRecord[], pool: bigint, startPool: bigint, houseWei: bigint): GameState {
  const map = new Map<string, SeatRecord>();
  const order: string[] = [];
  for (const s of seats) {
    map.set(s.seatId, s);
    order.push(s.seatId);
  }
  return {
    gameId: "g",
    gameIdNum: 99n,
    phase: "SETTLEMENT",
    round: 3,
    phaseEndsAt: 0,
    seats: map,
    seatOrder: order,
    votes: new Map(),
    buyInWei: 1_000_000_000_000_000_000n,
    startPool,
    pool,
    houseWei,
    outcome: null,
    seq: 0,
  };
}

describe("splitPool — equal split, dust to house", () => {
  it("splits evenly with no remainder", () => {
    expect(splitPool(900n, 3)).toEqual({ each: 300n, dust: 0n });
  });
  it("sends the remainder (dust) to the house", () => {
    expect(splitPool(100n, 3)).toEqual({ each: 33n, dust: 1n });
  });
  it("zero survivors → entire pool is dust", () => {
    expect(splitPool(100n, 0)).toEqual({ each: 0n, dust: 100n });
  });
});

describe("buildSettlement — HUMAN_WIN", () => {
  it("splits the remaining pool among surviving funders; dust → house", () => {
    // 3 humans funded, all survive; 1 AI eliminated. startPool=3, no misvote.
    const B = 1_000_000_000_000_000_000n;
    const seats = [
      seat(0, false, true, "0x" + "1".padStart(40, "0")),
      seat(1, false, true, "0x" + "2".padStart(40, "0")),
      seat(2, false, true, "0x" + "3".padStart(40, "0")),
      seat(3, true, false, null),
    ];
    const game = gameWith(seats, 3n * B, 3n * B, 0n);
    const { onchain, reveal } = buildSettlement(game, "HUMAN_WIN");
    expect(onchain.survivors.length).toBe(3);
    expect(onchain.payouts.every((p) => p === B)).toBe(true);
    expect(onchain.houseAmount).toBe(0n);
    expect(conservationHolds(onchain, game.startPool)).toBe(true);
    expect(reveal.outcome).toBe("HUMAN_WIN");
    expect(reveal.aiReveal).toEqual(["s3"]);
  });

  it("dust from an uneven split accrues to the house", () => {
    // pool=100 wei, 3 survivors → 33 each, 1 dust → house.
    const seats = [
      seat(0, false, true, "0x" + "a".padStart(40, "0")),
      seat(1, false, true, "0x" + "b".padStart(40, "0")),
      seat(2, false, true, "0x" + "c".padStart(40, "0")),
      seat(3, true, false, null),
    ];
    const game = gameWith(seats, 100n, 100n, 0n);
    const { onchain } = buildSettlement(game, "HUMAN_WIN");
    const paid = onchain.payouts.reduce((a, b) => a + b, 0n);
    expect(paid).toBe(99n);
    expect(onchain.houseAmount).toBe(1n);
    expect(conservationHolds(onchain, game.startPool)).toBe(true);
  });

  it("carries prior misvote cuts in houseWei into the final house amount", () => {
    // startPool=1000, one misvote cut 100 already in houseWei, pool now 900,
    // 2 survivors split 900 (450 each), dust 0.
    const seats = [
      seat(0, false, true, "0x" + "1".padStart(40, "0")),
      seat(1, false, true, "0x" + "2".padStart(40, "0")),
      seat(2, false, false, "0x" + "3".padStart(40, "0")), // eliminated human
      seat(3, true, false, null),
    ];
    const game = gameWith(seats, 900n, 1000n, 100n);
    const { onchain } = buildSettlement(game, "HUMAN_WIN");
    expect(onchain.survivors.length).toBe(2);
    expect(onchain.payouts).toEqual([450n, 450n]);
    expect(onchain.houseAmount).toBe(100n);
    expect(conservationHolds(onchain, game.startPool)).toBe(true);
  });
});

describe("buildSettlement — AI_WIN", () => {
  it("house takes 100% of the remaining pool; no payouts", () => {
    const seats = [
      seat(0, false, true, "0x" + "1".padStart(40, "0")),
      seat(1, false, false, "0x" + "2".padStart(40, "0")),
      seat(2, true, true, null),
      seat(3, true, true, null),
    ];
    // startPool 1000, one misvote cut already 100, pool 900.
    const game = gameWith(seats, 900n, 1000n, 100n);
    const { onchain, reveal } = buildSettlement(game, "AI_WIN");
    expect(onchain.survivors).toEqual([]);
    expect(onchain.payouts).toEqual([]);
    expect(onchain.houseAmount).toBe(1000n); // 100 prior + 900 pool
    expect(conservationHolds(onchain, game.startPool)).toBe(true);
    expect(reveal.aiReveal.sort()).toEqual(["s2", "s3"]);
  });
});

describe("signSettlement — EIP712 with the server signer", () => {
  it("produces a 65-byte hex signature against the Monad domain", async () => {
    const seats = [
      seat(0, false, true, "0x" + "1".padStart(40, "0")),
      seat(1, true, false, null),
    ];
    const game = gameWith(seats, 1n, 1n, 0n);
    const { onchain } = buildSettlement(game, "HUMAN_WIN");
    // Throwaway test key (anvil account #0).
    const key =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
    const verifying = ("0x" + "0".repeat(40)) as `0x${string}`;
    const sig = await signSettlement(onchain, key, verifying);
    expect(sig).toMatch(/^0x[0-9a-fA-F]{130}$/);
  });
});

describe("StubSettlementSubmitter", () => {
  it("acknowledges with a null tx hash (no live chain)", async () => {
    const res = await new StubSettlementSubmitter().submit(
      { gameId: 1n, survivors: [], payouts: [], houseAmount: 0n, resultRoot: "0x" + "0".repeat(64) },
      ("0x" + "0".repeat(130)) as `0x${string}`,
    );
    expect(res.txHash).toBeNull();
  });
});
