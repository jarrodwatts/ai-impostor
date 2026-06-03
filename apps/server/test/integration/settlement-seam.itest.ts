/**
 * Integration test — the server↔contract settlement seam, validated on a LOCAL
 * anvil chain (plans.md M5 risk #1/#2: EIP712 struct/typehash + rounding/dust).
 *
 * This proves the riskiest cross-subsystem seam end-to-end: that the SERVER's
 * viem EIP712 signing (`signSettlement` in src/settlement/settle.ts) produces a
 * signature the DEPLOYED Solidity `ImpostorEscrow` accepts, and that the SERVER's
 * `buildSettlement`/`splitPool` conservation + dust-to-house split agrees with
 * the contract's on-chain `Σpayouts + house == pool` check, with real value
 * actually moving on a real EVM.
 *
 * It is gated as `*.itest.ts` (excluded from the default unit suite) and skips
 * gracefully if `anvil` is not on PATH. No new dependencies: viem (already a
 * server dep) + node built-ins only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { escrowAbi } from "@ai-impostor/contracts";
import { buildSettlement, signSettlement } from "../../src/settlement/settle.js";
import type { GameState, SeatRecord } from "../../src/game/types.js";

// ── anvil availability gate ───────────────────────────────────────────────
function anvilOnPath(): boolean {
  const r = spawnSync("anvil", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}
const HAVE_ANVIL = anvilOnPath();
const describeIf = HAVE_ANVIL ? describe : describe.skip;

// anvil default funded accounts (deterministic, well-known dev keys).
const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // #0
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // #1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // #2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // #3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // #4
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // #5
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // #6
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // #7
] as const satisfies readonly Hex[];

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/server/test/integration → repo root contracts artifact.
const ARTIFACT_PATH = resolve(
  __dirname,
  "../../../../contracts/out/ImpostorEscrow.sol/ImpostorEscrow.json",
);

const BUY_IN = parseEther("1"); // 1 MON per seat

/** Spawn anvil on a random port; resolve once the RPC answers. */
async function startAnvil(port: number): Promise<ChildProcess> {
  // No --block-time: anvil auto-mines a block per transaction (instant), which
  // is exactly what the test wants. (--block-time 0 is rejected by anvil 1.x.)
  const proc = spawn("anvil", ["--port", String(port), "--silent"], {
    stdio: "ignore",
  });
  proc.on("error", () => {
    /* surfaced by the readiness poll timing out */
  });
  // Poll the RPC until it responds (anvil starts in well under a second).
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() > deadline) {
      proc.kill("SIGKILL");
      throw new Error("anvil did not become ready within 15s");
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return proc;
}

// ── server-side settlement helpers (reuse the REAL builder) ────────────────
function seat(
  i: number,
  isAI: boolean,
  alive: boolean,
  funder: Address | null,
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

function gameWith(
  gameIdNum: bigint,
  seats: SeatRecord[],
  pool: bigint,
  startPool: bigint,
  houseWei: bigint,
): GameState {
  const map = new Map<string, SeatRecord>();
  const order: string[] = [];
  for (const s of seats) {
    map.set(s.seatId, s);
    order.push(s.seatId);
  }
  return {
    gameId: `g${gameIdNum}`,
    gameIdNum,
    phase: "SETTLEMENT",
    round: 3,
    phaseEndsAt: 0,
    seats: map,
    seatOrder: order,
    votes: new Map(),
    buyInWei: BUY_IN,
    startPool,
    pool,
    houseWei,
    outcome: null,
    seq: 0,
  };
}

describeIf("settlement seam · server viem EIP712 ↔ deployed ImpostorEscrow (anvil)", () => {
  const port = 8545 + Math.floor(Math.random() * 2000);
  const rpcUrl = `http://127.0.0.1:${port}`;
  const chainId = 31337; // anvil default

  let anvil: ChildProcess;
  let pub: PublicClient;
  // account #0 doubles as deployer / GAME_MANAGER / serverSigner.
  const deployer = privateKeyToAccount(KEYS[0]);
  const treasury = privateKeyToAccount(KEYS[7]).address;
  let managerWallet: WalletClient;
  let escrow: Address;
  let bytecode: Hex;

  beforeAll(async () => {
    anvil = await startAnvil(port);
    const transport = http(rpcUrl);
    pub = createPublicClient({ transport });
    managerWallet = createWalletClient({ account: deployer, transport });

    const artifact = require(ARTIFACT_PATH) as {
      abi: Abi;
      bytecode: { object: Hex };
    };
    bytecode = artifact.bytecode.object;

    // Deploy: constructor(admin, gameManager, serverSigner, treasury, buyIn).
    const hash = await managerWallet.deployContract({
      abi: escrowAbi as Abi,
      bytecode,
      account: deployer,
      chain: null,
      args: [deployer.address, deployer.address, deployer.address, treasury, BUY_IN],
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    expect(rcpt.contractAddress).toBeTruthy();
    escrow = rcpt.contractAddress as Address;
  }, 30_000);

  afterAll(() => {
    anvil?.kill("SIGKILL");
  });

  /** Drive createGame + 6 funded joins + lockGame; return the funder addresses. */
  async function openLockedGame(gameId: bigint, funderCount = 6): Promise<Address[]> {
    await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "createGame",
      args: [gameId],
      account: deployer,
      chain: null,
    });

    // Fund with accounts #1..#funderCount — account #0 is the deployer/manager
    // (it pays gas for createGame/lockGame/settle, so it must NOT be a survivor
    // whose post-settle balance delta we assert) and #7 is the treasury.
    const funders: Address[] = [];
    for (let i = 0; i < funderCount; i++) {
      const acct = privateKeyToAccount(KEYS[i + 1]!);
      const w = createWalletClient({ account: acct, transport: http(rpcUrl) });
      const h = await w.writeContract({
        address: escrow,
        abi: escrowAbi as Abi,
        functionName: "join",
        args: [gameId],
        value: BUY_IN,
        account: acct,
        chain: null,
      });
      await pub.waitForTransactionReceipt({ hash: h });
      funders.push(acct.address);
    }

    const lock = await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "lockGame",
      args: [gameId],
      account: deployer,
      chain: null,
    });
    await pub.waitForTransactionReceipt({ hash: lock });
    return funders;
  }

  async function bal(addr: Address): Promise<bigint> {
    return pub.getBalance({ address: addr });
  }

  async function escrowBal(): Promise<bigint> {
    return pub.getBalance({ address: escrow });
  }

  function settleArgs(onchain: {
    gameId: bigint;
    survivors: string[];
    payouts: bigint[];
    houseAmount: bigint;
    resultRoot: string;
  }) {
    return {
      gameId: onchain.gameId,
      survivors: onchain.survivors as Address[],
      payouts: onchain.payouts,
      houseAmount: onchain.houseAmount,
      resultRoot: onchain.resultRoot as Hex,
    };
  }

  it("HUMAN_WIN: server-signed settlement is accepted; survivors+treasury paid, escrow drains to 0", async () => {
    const gameId = 1n;
    const funders = await openLockedGame(gameId, 6);
    const pool = BUY_IN * 6n;
    expect(await escrowBal()).toBe(pool);

    // Build a HUMAN_WIN with dust-to-house using the REAL server builder.
    // 5 surviving human funders + 1 eliminated human funder + (AI seats fund $0,
    // but here we model 6 funders and survive 5 to force an uneven split → dust).
    // pool = 6 MON, 5 survivors → 1.2 MON each, dust 0 (6/5 divides cleanly in wei
    // only if divisible; 6e18 / 5 = 1.2e18 exactly), so use 4 survivors to get dust.
    const survivorAddrs = funders.slice(0, 4);
    const seats: SeatRecord[] = [
      ...survivorAddrs.map((a, i) => seat(i, false, true, a)),
      seat(4, false, false, funders[4]!), // eliminated human funder
      seat(5, false, false, funders[5]!), // eliminated human funder
    ];
    // startPool == pool (no misvote cut accrued before build); split 6 MON / 4.
    const game = gameWith(gameId, seats, pool, pool, 0n);
    const built = buildSettlement(game, "HUMAN_WIN");

    // Sanity: 6e18 / 4 = 1.5e18 each, dust 0; verify split + conservation.
    const each = pool / 4n;
    expect(built.onchain.payouts).toEqual([each, each, each, each]);
    expect(built.onchain.houseAmount).toBe(pool - each * 4n); // dust → house (0 here)
    const paid = built.onchain.payouts.reduce((a, b) => a + b, 0n);
    expect(paid + built.onchain.houseAmount).toBe(pool);

    const sig = await signSettlement(built.onchain, KEYS[0], escrow, chainId);

    const before = await Promise.all(survivorAddrs.map(bal));
    const treBefore = await bal(treasury);

    const h = await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "settle",
      args: [settleArgs(built.onchain), sig],
      account: deployer,
      chain: null,
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash: h });
    expect(rcpt.status).toBe("success");

    // Survivors received exactly `each`; treasury received the house amount.
    const after = await Promise.all(survivorAddrs.map(bal));
    for (let i = 0; i < survivorAddrs.length; i++) {
      expect(after[i]! - before[i]!).toBe(each);
    }
    expect((await bal(treasury)) - treBefore).toBe(built.onchain.houseAmount);
    // Escrow fully drained.
    expect(await escrowBal()).toBe(0n);
  }, 30_000);

  it("HUMAN_WIN with uneven split: dust goes to the house and escrow drains to 0", async () => {
    const gameId = 2n;
    const funders = await openLockedGame(gameId, 6);
    const pool = BUY_IN * 6n; // 6e18 wei

    // 7 survivors is impossible; use a deliberately non-dividing count: 6e18 / 7
    // is not clean, but we only have 6 funders. Instead model a prior misvote cut
    // so the remaining pool is uneven across the survivors: take 1 wei to house
    // first is not how the builder works — instead pick survivor count that leaves
    // dust: 6e18 / 4 is clean. Use 5 survivors of a 6 MON pool minus 1 wei? The
    // builder splits `pool` among survivors. 6e18 / 5 = 1.2e18 clean too.
    // Force dust with a non-round pool: simulate startPool=pool but pool reduced by
    // 1 wei sitting in houseWei (a misvote-style cut), 5 survivors of (6e18 - 1).
    const reducedPool = pool - 1n;
    const survivorAddrs = funders.slice(0, 5);
    const seats: SeatRecord[] = [
      ...survivorAddrs.map((a, i) => seat(i, false, true, a)),
      seat(5, false, false, funders[5]!),
    ];
    // houseWei carries the 1 wei already cut; remaining pool reducedPool split / 5.
    const game = gameWith(gameId, seats, reducedPool, pool, 1n);
    const built = buildSettlement(game, "HUMAN_WIN");

    const each = reducedPool / 5n;
    const dust = reducedPool - each * 5n;
    expect(built.onchain.payouts).toEqual([each, each, each, each, each]);
    // houseAmount = prior cut (1) + dust.
    expect(built.onchain.houseAmount).toBe(1n + dust);
    // Conservation against the full escrowed pool.
    const paid = built.onchain.payouts.reduce((a, b) => a + b, 0n);
    expect(paid + built.onchain.houseAmount).toBe(pool);

    const sig = await signSettlement(built.onchain, KEYS[0], escrow, chainId);
    const treBefore = await bal(treasury);
    const h = await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "settle",
      args: [settleArgs(built.onchain), sig],
      account: deployer,
      chain: null,
    });
    expect((await pub.waitForTransactionReceipt({ hash: h })).status).toBe("success");
    expect((await bal(treasury)) - treBefore).toBe(built.onchain.houseAmount);
    expect(await escrowBal()).toBe(0n);
  }, 30_000);

  it("AI_WIN: house takes 100%; treasury gets the whole pool, no survivor payouts", async () => {
    const gameId = 3n;
    const funders = await openLockedGame(gameId, 6);
    const pool = BUY_IN * 6n;

    // AI_WIN — all human funders eliminated; survivors are AI ($0 funders) → none
    // on-chain. House takes the remaining pool.
    const seats: SeatRecord[] = [
      ...funders.map((a, i) => seat(i, false, false, a)),
      seat(6, true, true, null),
      seat(7, true, true, null),
    ];
    const game = gameWith(gameId, seats, pool, pool, 0n);
    const built = buildSettlement(game, "AI_WIN");
    expect(built.onchain.survivors).toEqual([]);
    expect(built.onchain.payouts).toEqual([]);
    expect(built.onchain.houseAmount).toBe(pool);

    const sig = await signSettlement(built.onchain, KEYS[0], escrow, chainId);
    const treBefore = await bal(treasury);
    const h = await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "settle",
      args: [settleArgs(built.onchain), sig],
      account: deployer,
      chain: null,
    });
    expect((await pub.waitForTransactionReceipt({ hash: h })).status).toBe("success");
    expect((await bal(treasury)) - treBefore).toBe(pool);
    expect(await escrowBal()).toBe(0n);
  }, 30_000);

  it("NEGATIVE: a tampered payout (conservation violated) reverts", async () => {
    const gameId = 4n;
    const funders = await openLockedGame(gameId, 6);
    const pool = BUY_IN * 6n;
    const survivorAddrs = funders.slice(0, 3);
    const seats: SeatRecord[] = [
      ...survivorAddrs.map((a, i) => seat(i, false, true, a)),
      seat(3, false, false, funders[3]!),
      seat(4, false, false, funders[4]!),
      seat(5, false, false, funders[5]!),
    ];
    const game = gameWith(gameId, seats, pool, pool, 0n);
    const built = buildSettlement(game, "HUMAN_WIN");

    // Tamper: inflate one payout by 1 wei so Σpayouts + house != pool. Re-sign so
    // the signature is valid but conservation now fails — must hit the contract's
    // ConservationViolated, not BadSignature.
    const tampered = {
      ...built.onchain,
      payouts: [built.onchain.payouts[0]! + 1n, ...built.onchain.payouts.slice(1)],
    };
    const sig = await signSettlement(tampered, KEYS[0], escrow, chainId);

    // The escrow is a singleton accumulating deposits across games, so assert the
    // failed settle leaves the *contract balance unchanged* (delta), not absolute.
    const escBefore = await escrowBal();
    await expect(
      managerWallet.writeContract({
        address: escrow,
        abi: escrowAbi as Abi,
        functionName: "settle",
        args: [settleArgs(tampered), sig],
        account: deployer,
        chain: null,
      }),
    ).rejects.toThrow(/ConservationViolated|revert/i);
    // Game stays Locked; escrow untouched (no value moved).
    expect(await escrowBal()).toBe(escBefore);
    // Per-game pool storage still holds this game's full escrow.
    const g = (await pub.readContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "games",
      args: [gameId],
    })) as readonly [number, bigint, bigint, number, bigint, bigint];
    expect(g[2]).toBe(pool); // games[gameId].pool
  }, 30_000);

  it("NEGATIVE: a settlement signed by the wrong key reverts (BadSignature)", async () => {
    const gameId = 5n;
    const funders = await openLockedGame(gameId, 6);
    const pool = BUY_IN * 6n;
    const survivorAddrs = funders.slice(0, 6);
    const seats: SeatRecord[] = survivorAddrs.map((a, i) => seat(i, false, true, a));
    const game = gameWith(gameId, seats, pool, pool, 0n);
    const built = buildSettlement(game, "HUMAN_WIN");

    // Sign with account #1 (NOT the configured serverSigner = account #0).
    const wrongSig = await signSettlement(built.onchain, KEYS[1], escrow, chainId);

    const escBefore = await escrowBal();
    await expect(
      managerWallet.writeContract({
        address: escrow,
        abi: escrowAbi as Abi,
        functionName: "settle",
        args: [settleArgs(built.onchain), wrongSig],
        account: deployer,
        chain: null,
      }),
    ).rejects.toThrow(/BadSignature|revert/i);
    // Rejected before any value moved (delta unchanged on the singleton escrow).
    expect(await escrowBal()).toBe(escBefore);
  }, 30_000);

  it("abort → refund returns each funder's deposit", async () => {
    const gameId = 6n;
    const escAtStart = await escrowBal();
    // createGame + 3 joins (still Open), then abortGame → funders refund.
    await managerWallet.writeContract({
      address: escrow,
      abi: escrowAbi as Abi,
      functionName: "createGame",
      args: [gameId],
      account: deployer,
      chain: null,
    });
    const funders: Address[] = [];
    for (let i = 0; i < 3; i++) {
      const acct = privateKeyToAccount(KEYS[i + 1]!); // #1..#3 (not the manager #0)
      const w = createWalletClient({ account: acct, transport: http(rpcUrl) });
      await pub.waitForTransactionReceipt({
        hash: await w.writeContract({
          address: escrow,
          abi: escrowAbi as Abi,
          functionName: "join",
          args: [gameId],
          value: BUY_IN,
          account: acct,
          chain: null,
        }),
      });
      funders.push(acct.address);
    }
    // This game's 3 deposits added to the singleton escrow balance.
    expect((await escrowBal()) - escAtStart).toBe(BUY_IN * 3n);

    await pub.waitForTransactionReceipt({
      hash: await managerWallet.writeContract({
        address: escrow,
        abi: escrowAbi as Abi,
        functionName: "abortGame",
        args: [gameId],
        account: deployer,
        chain: null,
      }),
    });

    // Each funder pulls their deposit back.
    for (let i = 0; i < 3; i++) {
      const acct = privateKeyToAccount(KEYS[i + 1]!);
      const w = createWalletClient({ account: acct, transport: http(rpcUrl) });
      const before = await bal(acct.address);
      const rcpt = await pub.waitForTransactionReceipt({
        hash: await w.writeContract({
          address: escrow,
          abi: escrowAbi as Abi,
          functionName: "refund",
          args: [gameId],
          account: acct,
          chain: null,
        }),
      });
      const gas = rcpt.gasUsed * rcpt.effectiveGasPrice;
      const after = await bal(acct.address);
      // net delta = +BUY_IN - gas.
      expect(after - before + gas).toBe(BUY_IN);
    }
    // All 3 deposits left the escrow; its balance returns to where this game started.
    expect(await escrowBal()).toBe(escAtStart);
  }, 30_000);
});
