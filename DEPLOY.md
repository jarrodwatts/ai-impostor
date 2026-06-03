# Deploy & Go-Live (remaining manual steps)

M0–M5 are complete and verified locally (all builds/tests green; the server↔contract settlement
seam is proven on a local EVM). The steps below need **credentials or live services** the build
environment doesn't have — run them when you have keys + accounts. Topology: **web → Vercel**,
**server + Postgres + Redis → Railway**, **contracts → Monad testnet**.

## 1. Deploy the escrow contract (Monad testnet)
```bash
cd contracts
export MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
export ADMIN=0x...          # owner (multisig later)
export GAME_MANAGER=0x...   # backend hot wallet (createGame/lock/abort/settle)
export SERVER_SIGNER=0x...  # EIP712 settlement signer (can differ from GAME_MANAGER)
export TREASURY=0x...       # house payouts land here
export BUY_IN=1000000000000000000   # 1 MON (wei)
# fund the deployer + GAME_MANAGER from the Monad testnet faucet first
forge script script/Deploy.s.sol:Deploy --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PK
```
Then publish the address: copy `address` from `contracts/deployments/10143.json` into
`packages/contracts/src/index.ts` (`ESCROW_ADDRESS`) and `pnpm --filter @ai-impostor/contracts build`.
The ABI is already generated there; the EIP712 typehash is pinned across TS/Solidity.

## 2. Server → Railway (server + Postgres + Redis)
Create a Railway project with 3 services: the Node server (root dir `apps/server`,
build `pnpm --filter @ai-impostor/server build`, start `pnpm --filter @ai-impostor/server start`),
a managed **Postgres**, and a managed **Redis**. Set env (see `apps/server/.env.example`):
`DATABASE_URL`, `REDIS_URL` (Railway-internal), `ANTHROPIC_API_KEY`, `GAME_MANAGER_PRIVATE_KEY`,
`SERVER_SIGNER_KEY`, `MONAD_TESTNET_RPC_URL`, `ESCROW_ADDRESS`, `WS_ALLOWED_ORIGINS` (the Vercel
domain), `PORT`. Use a watch-path so web-only changes don't redeploy the server.

> **Production-hardening still required before real money** (currently interface-stubbed with
> in-memory defaults so the app runs without external services): wire the concrete **Redis** queue
> store and **Postgres** repositories (interfaces + an in-memory impl + a pg skeleton exist in
> `apps/server/src/{matchmaking,persistence}`), and the **chain settlement submitter**
> (`SettlementSubmitter` interface + stub — EIP712 signing is already real). Finish
> **disconnect/grace → auto-eliminate** (deferred from M3). Bump `@anthropic-ai/sdk` so the
> adaptive-thinking/effort fields are typed (currently a documented loose cast).

## 3. Web → Vercel
Import `apps/web` (Next 16). Env: `NEXT_PUBLIC_WS_URL=wss://<railway-server-domain>`,
`NEXT_PUBLIC_REOWN_PROJECT_ID=<reown projectId>`, `NEXT_PUBLIC_CHAIN_ID=10143`, and the deployed
escrow address. With `NEXT_PUBLIC_WS_URL` set, the client uses the real zod-validating WebSocket;
without it, it falls back to the in-app mock emitter (great for demos). Replace the local ABI
fragment in `apps/web/lib/chain/escrow.ts` with the generated `escrowAbi` from
`@ai-impostor/contracts` once the address is live.

## 4. End-to-end validation on testnet
- Run a full game (queue → buy-in escrow → rounds → settlement) across all three subsystems.
- Reproduce SPEC §4 economic scenarios and confirm on-chain payouts match (perfect play, one
  misvote −10%, AI-win house-100%). The local anvil seam test
  (`apps/server pnpm test:integration`) already proves the signing/conservation path.
- Browser E2E / dogfooding pass (the `agent-browser` skill can drive the live web app).

## Verify locally (no credentials needed)
```bash
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test     # 33 shared + 84 server tests
cd contracts && forge test                              # 21 unit + 2 conservation invariants
# settlement seam on a local EVM (requires foundry's anvil on PATH):
pnpm --filter @ai-impostor/server test:integration       # 6/6
pnpm --filter web dev                                    # walk the full flow on the mock emitter
```
