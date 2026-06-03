import { PROTOCOL_VERSION } from "@ai-impostor/shared";
import { config, httpPort, allowedOrigins } from "./config.js";
import { Gateway } from "./ws/gateway.js";
import { createInMemoryRepositories } from "./persistence/memory.js";
import { FakeLlmClient, type LlmClient } from "./ai/llm.js";
import { AnthropicLlmClient } from "./ai/claude.js";
import { makeChainService, type ChainService } from "./chain/ChainService.js";
import { createHttpServer } from "./http/server.js";

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

function main(): void {
  const port = httpPort();
  const repos = createInMemoryRepositories();
  const llm = buildLlm();

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

  const httpServer = createHttpServer({ chain });

  const gateway = new Gateway({
    repos,
    llm,
    httpServer,
    // Only run the on-chain demo flow when we have a live chain service.
    ...(chain.live ? { chain } : {}),
    ...(chain.live && hasSigner ? { serverSignerKey: signerKey as `0x${string}` } : {}),
  });
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
