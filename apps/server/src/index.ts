import { PROTOCOL_VERSION } from "@ai-impostor/shared";
import { config } from "./config.js";

/**
 * Realtime game server bootstrap (M0 stub).
 *
 * M3 fills this in: ws gateway (src/ws/gateway.ts), anti-leak broadcast
 * (src/ws/broadcast.ts), game state machine (src/game/Game.ts), resolution
 * (src/game/resolution.ts), matchmaking (src/matchmaking/queue.ts), the AI
 * agent runner (src/ai/*), and settlement (src/settlement/settle.ts).
 *
 * See .agent/plans.md (milestone M3) and the load-bearing correctness rules.
 */
function main(): void {
  // eslint-disable-next-line no-console
  console.log(
    `[ai-impostor server] boot stub — protocol v${PROTOCOL_VERSION}, chain ${config.CHAIN_ID}, ${config.SEATS} seats`,
  );
}

main();
