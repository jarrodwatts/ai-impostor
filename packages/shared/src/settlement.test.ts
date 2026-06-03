import { describe, expect, it } from "vitest";
import {
  canonicalSettlementTypeString,
  conservationHolds,
  OnchainSettlement,
  SETTLEMENT_TYPE_STRING,
  SettlementReveal,
} from "./settlement.js";

const base: OnchainSettlement = {
  gameId: 42n,
  survivors: ["0x1111111111111111111111111111111111111111"],
  payouts: [90n],
  houseAmount: 10n,
  resultRoot: `0x${"0".repeat(64)}`,
};

describe("conservationHolds", () => {
  it("true when payouts + house == pool", () => {
    expect(conservationHolds(base, 100n)).toBe(true);
  });

  it("false when the sum is short of the pool (would strand funds)", () => {
    expect(conservationHolds(base, 101n)).toBe(false);
  });

  it("false when the sum overspends the pool", () => {
    expect(conservationHolds(base, 99n)).toBe(false);
  });

  it("AI_WIN: empty survivors, whole pool to house", () => {
    const aiWin: OnchainSettlement = {
      gameId: 7n,
      survivors: [],
      payouts: [],
      houseAmount: 600n,
      resultRoot: `0x${"0".repeat(64)}`,
    };
    expect(conservationHolds(aiWin, 600n)).toBe(true);
    expect(conservationHolds(aiWin, 599n)).toBe(false);
  });

  it("multi-survivor split conserves", () => {
    const split: OnchainSettlement = {
      gameId: 1n,
      survivors: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
      payouts: [250n, 250n],
      houseAmount: 0n,
      resultRoot: `0x${"0".repeat(64)}`,
    };
    expect(conservationHolds(split, 500n)).toBe(true);
  });
});

/**
 * CROSS-LANGUAGE TYPEHASH PIN (M1 risk #1).
 *
 * The string below is the EXACT keccak256 input of SETTLEMENT_TYPEHASH in
 * contracts/src/ImpostorEscrow.sol. The derived TS canonical type string must
 * equal it byte-for-byte, or the EIP712 struct hashes diverge and settlement
 * signatures fail on-chain. If a future field reorder/rename/retype changes the
 * TS schema, this test breaks first — update contracts/src/ImpostorEscrow.sol
 * (SETTLEMENT_TYPEHASH) and packages/contracts/src/index.ts to match.
 */
const SOLIDITY_TYPEHASH_STRING =
  "Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)";

describe("EIP712 cross-language pin", () => {
  it("derived canonical type string equals the Solidity SETTLEMENT_TYPEHASH literal", () => {
    expect(canonicalSettlementTypeString()).toBe(SOLIDITY_TYPEHASH_STRING);
  });

  it("exported SETTLEMENT_TYPE_STRING constant matches the derivation", () => {
    expect(SETTLEMENT_TYPE_STRING).toBe(SOLIDITY_TYPEHASH_STRING);
  });
});

describe("SettlementReveal", () => {
  it("parses a representative reveal payload (the only place AI + absolute MON surface)", () => {
    const reveal = {
      outcome: "HUMAN_WIN" as const,
      roster: [
        {
          seatId: "s1",
          codename: "Falcon",
          avatarColor: "#836EF9",
          wasAI: false,
          survived: true,
        },
      ],
      aiReveal: ["s3"],
      pool: {
        buyIn: "100000000000000000",
        startPool: "600000000000000000",
        houseTake: "60000000000000000",
        finalPool: "540000000000000000",
      },
      myPayout: "540000000000000000",
      txHash: "0xdeadbeef",
    };
    expect(SettlementReveal.parse(reveal)).toEqual(reveal);
  });
});
