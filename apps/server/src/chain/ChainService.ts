import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { escrowAbi, monadTestnet } from "@ai-impostor/contracts";
import type { OnchainSettlement } from "@ai-impostor/shared";

/**
 * ChainService — the server's ONLY seam to the ImpostorEscrow contract on Monad
 * testnet (SPEC §6). The demo lobby drives the on-chain game lifecycle through
 * this interface:
 *
 *   createGame(gameId)         — open an escrow game (GAME_MANAGER)
 *   getDeposit(gameId, addr)   — read a player's escrowed buy-in (gates seating)
 *   lockGame(gameId)           — freeze the roster at countdown end (GAME_MANAGER)
 *   submitSettlement(s, sig)   — settle() the EIP712-signed payout split
 *
 * Two impls behind the interface: ViemChainService (real wallet + RPC) and
 * FakeChainService (in-memory, no chain) so unit tests + local runs without a
 * key still work. Selection is by presence of GAME_MANAGER_PRIVATE_KEY +
 * ESCROW_ADDRESS — see makeChainService() / index.ts bootstrap.
 *
 * The GAME_MANAGER private key is supplied at runtime via env and is NEVER
 * logged or persisted (standards.md secret-handling).
 */
export interface ChainService {
  /** Open a new escrow game keyed by the numeric on-chain gameId. */
  createGame(gameId: bigint): Promise<{ txHash: string | null }>;
  /** Lock the game (no further joins) once the roster is frozen. */
  lockGame(gameId: bigint): Promise<{ txHash: string | null }>;
  /** Read an address's escrowed deposit (wei) for a game. */
  getDeposit(gameId: bigint, address: string): Promise<bigint>;
  /** Submit the EIP712-signed settlement; returns the settle() tx hash. */
  submitSettlement(
    onchain: OnchainSettlement,
    signature: `0x${string}`,
  ): Promise<{ txHash: string | null }>;
  /** Native MON balance of an address (wei). Used by the faucet safety cap. */
  getBalance(address: string): Promise<bigint>;
  /** Send native MON from the demo wallet to `to`. Faucet drip. */
  faucetSend(to: string, wei: bigint): Promise<{ txHash: string | null }>;
  /** The escrow address clients must pay into (stringified for the protocol). */
  readonly escrowAddress: string;
  /** Whether this is a live on-chain service (vs the in-memory fake). */
  readonly live: boolean;
}

/** Real viem-backed service: walletClient (GAME_MANAGER account) + publicClient. */
export class ViemChainService implements ChainService {
  readonly live = true;
  readonly escrowAddress: string;
  private readonly escrow: `0x${string}`;
  private readonly account: Account;
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;

  constructor(opts: {
    privateKey: `0x${string}`;
    escrowAddress: `0x${string}`;
    rpcUrl?: string;
  }) {
    this.escrow = opts.escrowAddress;
    this.escrowAddress = opts.escrowAddress;
    this.account = privateKeyToAccount(opts.privateKey);
    const transport = http(opts.rpcUrl ?? monadTestnet.rpcUrls.default.http[0]);
    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport,
    }) as PublicClient;
    this.walletClient = createWalletClient({
      account: this.account,
      chain: monadTestnet,
      transport,
    });
  }

  async createGame(gameId: bigint): Promise<{ txHash: string | null }> {
    const txHash = await this.walletClient.writeContract({
      address: this.escrow,
      abi: escrowAbi,
      functionName: "createGame",
      args: [gameId],
      account: this.account,
      chain: monadTestnet,
    });
    return { txHash };
  }

  async lockGame(gameId: bigint): Promise<{ txHash: string | null }> {
    const txHash = await this.walletClient.writeContract({
      address: this.escrow,
      abi: escrowAbi,
      functionName: "lockGame",
      args: [gameId],
      account: this.account,
      chain: monadTestnet,
    });
    return { txHash };
  }

  async getDeposit(gameId: bigint, address: string): Promise<bigint> {
    const dep = await this.publicClient.readContract({
      address: this.escrow,
      abi: escrowAbi,
      functionName: "deposit",
      args: [gameId, address as `0x${string}`],
    });
    return dep as bigint;
  }

  async submitSettlement(
    onchain: OnchainSettlement,
    signature: `0x${string}`,
  ): Promise<{ txHash: string | null }> {
    const txHash = await this.walletClient.writeContract({
      address: this.escrow,
      abi: escrowAbi,
      functionName: "settle",
      args: [
        {
          gameId: onchain.gameId,
          survivors: onchain.survivors as `0x${string}`[],
          payouts: onchain.payouts,
          houseAmount: onchain.houseAmount,
          resultRoot: onchain.resultRoot as `0x${string}`,
        },
        signature,
      ],
      account: this.account,
      chain: monadTestnet,
    });
    return { txHash };
  }

  async getBalance(address: string): Promise<bigint> {
    return this.publicClient.getBalance({ address: address as `0x${string}` });
  }

  async faucetSend(to: string, wei: bigint): Promise<{ txHash: string | null }> {
    const txHash = await this.walletClient.sendTransaction({
      account: this.account,
      chain: monadTestnet,
      to: to as `0x${string}`,
      value: wei,
    });
    return { txHash };
  }
}

/**
 * In-memory fake — no chain. Tracks created games + lets tests/local runs seed
 * deposits so the demo deposit-gate path can be exercised without an RPC.
 */
export class FakeChainService implements ChainService {
  readonly live = false;
  readonly escrowAddress: string;
  private deposits = new Map<string, bigint>();
  private created = new Set<string>();

  constructor(escrowAddress = "0x0000000000000000000000000000000000000000") {
    this.escrowAddress = escrowAddress;
  }

  private key(gameId: bigint, address: string): string {
    return `${gameId.toString()}:${address.toLowerCase()}`;
  }

  /** Test/dev helper: pretend `address` deposited `wei` into `gameId`. */
  seedDeposit(gameId: bigint, address: string, wei: bigint): void {
    this.deposits.set(this.key(gameId, address), wei);
  }

  async createGame(gameId: bigint): Promise<{ txHash: string | null }> {
    this.created.add(gameId.toString());
    return { txHash: null };
  }

  async lockGame(_gameId: bigint): Promise<{ txHash: string | null }> {
    return { txHash: null };
  }

  async getDeposit(gameId: bigint, address: string): Promise<bigint> {
    return this.deposits.get(this.key(gameId, address)) ?? 0n;
  }

  async submitSettlement(
    _onchain: OnchainSettlement,
    _signature: `0x${string}`,
  ): Promise<{ txHash: string | null }> {
    return { txHash: null };
  }

  async getBalance(_address: string): Promise<bigint> {
    return 0n;
  }

  async faucetSend(
    _to: string,
    _wei: bigint,
  ): Promise<{ txHash: string | null }> {
    // No chain → no real drip. Return a null tx hash so the demo doesn't crash.
    return { txHash: null };
  }
}

/**
 * Build the live ViemChainService when both GAME_MANAGER_PRIVATE_KEY and
 * ESCROW_ADDRESS are set; otherwise the FakeChainService (no chain). Returns the
 * service plus a flag so the bootstrap can log the chosen mode (never the key).
 */
export function makeChainService(env: {
  GAME_MANAGER_PRIVATE_KEY?: string;
  ESCROW_ADDRESS?: string;
  MONAD_TESTNET_RPC_URL?: string;
}): ChainService {
  const key = env.GAME_MANAGER_PRIVATE_KEY?.trim();
  const escrow = env.ESCROW_ADDRESS?.trim();
  const hasKey = !!key && /^0x[0-9a-fA-F]{64}$/.test(key);
  const hasEscrow =
    !!escrow &&
    /^0x[0-9a-fA-F]{40}$/.test(escrow) &&
    escrow !== "0x0000000000000000000000000000000000000000";
  if (hasKey && hasEscrow) {
    return new ViemChainService({
      privateKey: key as `0x${string}`,
      escrowAddress: escrow as `0x${string}`,
      ...(env.MONAD_TESTNET_RPC_URL ? { rpcUrl: env.MONAD_TESTNET_RPC_URL } : {}),
    });
  }
  return new FakeChainService(hasEscrow ? escrow : undefined);
}
