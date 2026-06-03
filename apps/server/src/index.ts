import { PROTOCOL_VERSION } from "@ai-impostor/shared";
import { config } from "./config.js";
import { Gateway } from "./ws/gateway.js";
import { createInMemoryRepositories } from "./persistence/memory.js";
import { FakeLlmClient, type LlmClient } from "./ai/llm.js";
import { AnthropicLlmClient } from "./ai/claude.js";

/**
 * Realtime game server bootstrap (M3).
 *
 * Constructs the WS gateway with in-memory deps by default so `pnpm start`
 * runs with NO external services. If ANTHROPIC_API_KEY is set we use the real
 * Claude-backed LlmClient; otherwise the deterministic fake. Redis (queue) and
 * Postgres (audit log) both default to their in-memory impls; swapping to the
 * live backends is a one-line change in M5/M6.
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
  const port = Number(process.env.PORT ?? 8080);
  const repos = createInMemoryRepositories();
  const llm = buildLlm();
  const gateway = new Gateway({ port, repos, llm });
  gateway.listen();
  // eslint-disable-next-line no-console
  console.log(
    `[ai-impostor server] listening on ws://localhost:${port} — protocol v${PROTOCOL_VERSION}, chain ${config.CHAIN_ID}, ${config.SEATS} seats`,
  );
}

main();
