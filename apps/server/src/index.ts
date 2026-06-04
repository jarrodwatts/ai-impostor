import { PROTOCOL_VERSION } from "@ai-impostor/shared";
import { config, httpPort, allowedOrigins, DEMO_MODE } from "./config.js";
import { Gateway } from "./ws/gateway.js";
import { createInMemoryRepositories } from "./persistence/memory.js";
import { FakeLlmClient, type LlmClient } from "./ai/llm.js";
import { AnthropicLlmClient } from "./ai/claude.js";
import { makeChainService, FakeChainService, type ChainService } from "./chain/ChainService.js";
import { createHttpServer } from "./http/server.js";
import type { Repositories } from "./persistence/types.js";

/**
 * Realtime game server bootstrap.
 *
 * Boots an HTTP server (/healthz + /faucet) and attaches the WS gateway to it.
 * If GAME_MANAGER_PRIVATE_KEY + ESCROW_ADDRESS are set, the gateway runs the
 * real on-chain demo lobby (player-funded buy-ins, on-chain createGame/lockGame
 * /settle, faucet drips) with the live ViemChainService; otherwise it falls
 * back to the FakeChainService (no chain) so `node dist/index.js` runs with NO
 * external services. ANTHROPIC_API_KEY (optional) selects real Claude vs the
 * deterministic fake. The GAME_MANAGER private key is NEVER logged.
 */
function buildLlm(): LlmClient {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicLlmClient();
  }
  // eslint-disable-next-line no-console
  console.log("[ai-impostor server] no ANTHROPIC_API_KEY — using FakeLlmClient");
  return new FakeLlmClient();
}

/**
 * GUEST DEMO bootstrap (DEMO_MODE=1). No chain, no wallet, no money: the gateway
 * runs the no-wallet guest lobby (instant seating, AI-backfill, rolling ~10s
 * countdown, single 90s round → secret vote → who-was-who reveal). The
 * ChainService is NOT constructed/used; an in-memory FakeChainService is handed
 * to the HTTP server purely so /healthz (and an inert /faucet) keep working —
 * no RPC, no key, no tx. Uses the real Anthropic LLM when ANTHROPIC_API_KEY is
 * set, else the deterministic fake.
 */
function mainDemo(port: number, repos: Repositories, llm: LlmClient): void {
  // Inert no-chain service for the HTTP front-door only (faucet won't be used).
  const chain = new FakeChainService();

  // Construct gateway BEFORE the http server so /metrics can read live state.
  // Gateway needs an http server to attach the WS upgrade handler — we create
  // the http server with a metricsSource closure that resolves the (later-set)
  // gateway reference.
  let gatewayRef: Gateway | null = null;
  const httpServer = createHttpServer({
    chain,
    metricsSource: () =>
      gatewayRef ? gatewayRef.metricsSnapshot() : "# gateway not yet ready\n",
  });

  const gateway = new Gateway({
    repos,
    llm,
    httpServer,
    demo: true, // no chain: guest lobby + single-round demo game
  });
  gatewayRef = gateway;
  gateway.listen();

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[ai-impostor server] GUEST DEMO MODE — HTTP+WS on :${port}, protocol v${PROTOCOL_VERSION}, ` +
        `${config.SEATS} seats, rolling countdown ${config.DEMO_COUNTDOWN_MS}ms`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[ai-impostor server] demo: NO chain/wallet/money, ` +
        `discussion=${config.DISCUSSION_MS}ms vote=${config.VOTE_MS}ms, ` +
        `llm=${process.env.ANTHROPIC_API_KEY ? "anthropic" : "fake"}, ` +
        `origins=${allowedOrigins().join(",")}`,
    );
  });
}

function main(): void {
  const port = httpPort();
  const repos = createInMemoryRepositories();
  const llm = buildLlm();

  if (DEMO_MODE) {
    mainDemo(port, repos, llm);
    return;
  }

  const chain: ChainService = makeChainService({
    ...(process.env.GAME_MANAGER_PRIVATE_KEY
      ? { GAME_MANAGER_PRIVATE_KEY: process.env.GAME_MANAGER_PRIVATE_KEY }
      : {}),
    ...(process.env.ESCROW_ADDRESS ? { ESCROW_ADDRESS: process.env.ESCROW_ADDRESS } : {}),
    ...(process.env.MONAD_TESTNET_RPC_URL
      ? { MONAD_TESTNET_RPC_URL: process.env.MONAD_TESTNET_RPC_URL }
      : {}),
  });

  // The GAME_MANAGER key doubles as the EIP712 server signer (per task spec).
  const signerKey = process.env.GAME_MANAGER_PRIVATE_KEY?.trim();
  const hasSigner = !!signerKey && /^0x[0-9a-fA-F]{64}$/.test(signerKey);

  const httpServer = createHttpServer({
    chain,
    metricsSource: () =>
      gatewayRef ? gatewayRef.metricsSnapshot() : "# gateway not yet ready\n",
  });

  let gatewayRef: Gateway | null = null;
  const gateway = new Gateway({
    repos,
    llm,
    httpServer,
    // Only run the on-chain demo flow when we have a live chain service.
    ...(chain.live ? { chain } : {}),
    ...(chain.live && hasSigner ? { serverSignerKey: signerKey as `0x${string}` } : {}),
  });
  gatewayRef = gateway;
  gateway.listen();

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[ai-impostor server] HTTP+WS on :${port} — protocol v${PROTOCOL_VERSION}, chain ${config.CHAIN_ID}, ` +
        `${config.SEATS} seats, minHumans ${config.MIN_HUMANS}`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[ai-impostor server] chain=${chain.live ? "live (viem)" : "fake (no chain)"}, ` +
        `escrow=${chain.escrowAddress}, buyInWei=${config.BUY_IN_WEI.toString()}, ` +
        `faucetDripWei=${config.FAUCET_DRIP_WEI.toString()}, ` +
        `llm=${process.env.ANTHROPIC_API_KEY ? "anthropic" : "fake"}, ` +
        `origins=${allowedOrigins().join(",")}`,
    );
    if (chain.live && !hasSigner) {
      // eslint-disable-next-line no-console
      console.warn(
        "[ai-impostor server] chain live but no valid signer key — settlements will NOT be submitted on-chain",
      );
    }
  });
}

main();
