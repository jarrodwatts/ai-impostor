# Progress

## Current state
- **Milestones M0–M5 complete & reviewed; M6 = deploy-readiness documented.** The codebase builds,
  type-checks, and tests green end-to-end; the server↔contract settlement seam is proven on a local
  EVM. Remaining work is credential-gated go-live + production-hardening — see `DEPLOY.md`.
- **Repo:** pnpm monorepo at `/Users/jarrod/ai-impostor`, git on `main`, single root lockfile.
- **Verified at HEAD:** `pnpm -r build/typecheck/test` (33 shared + 84 server tests) + `forge test`
  (21 unit + 2 conservation invariants) all green.

## M2+M3+M4 delivered (reviewed: REQUEST CHANGES → fixed → merged)
- **M2 contracts:** full `ImpostorEscrow` (EIP712 settlement, strict `==` conservation, survivor-
  must-be-funder, replay guard, push-with-pull-fallback, Pausable); 21 unit tests + 2 Foundry
  conservation invariants (512k calls, 0 reverts = house-EV-≥0 proof); ABI regenerated into
  `packages/contracts`. Live testnet deploy is a documented manual step (needs funded key).
- **M3 server:** `ws` gateway + `projectStateForRecipient` anti-leak choke point (property-tested
  across roles/phases/scenarios), `Game` state machine, pure `resolution` (win-check-first, flat-10%
  penalty w/ human-win waiver, ties=all-out), matchmaking (aiCount=clamp(10−h,1,4), countdown,
  rollover), AI runner (persona/cadence/blocVote, `LlmClient` interface: real Anthropic + deterministic
  fake), EIP712 settlement signer (viem). Redis/Postgres/chain-submit behind interfaces w/ in-memory
  defaults; boots with no external services. 84 tests incl. headless full-game sim → valid Settlement.
- **M4 web:** providers (wagmi/Reown AppKit/TanStack Query on Monad testnet), leak-proof zustand
  store + `applyServerEvent`, mock WS emitter scripting a full game, all routes
  (home→connect→faucet→queue→lobby→`/play/[gameId]` phase-router→result→share) on the M1 primitives;
  `tsconfig` aligned to base (+noUncheckedIndexedAccess).
- **Review fix-cycle (3 important integration-drift items, all fixed):** FE `buyInWei()`→`buyIn()`;
  reject self-votes server-side + filter own seat in FE vote view; validate `SettlementReveal` at the
  store boundary (was an unvalidated cast).
- **Deferred (minor, logged):** cleanup of scratch code in `resolution.test.ts` + a dead local in
  `Game.ts`; strengthen the typehash pin to keccak-vs-`settlementTypehash()`; repo-wide eslint setup.

## M1 delivered (reviewed: APPROVE)
- `packages/shared`: finalized WS event-schema; added additive `GameConfig` DTO + `queue_state`
  event (anti-leak clean); `canonicalSettlementTypeString()` + `SETTLEMENT_TYPE_STRING`; 33 vitest
  tests (every ServerEvent/ClientEvent variant round-trips, exhaustive-by-construction; conservation
  cases; **cross-language EIP712 typehash pin** vs the Solidity literal). Test files excluded from
  build.
- `packages/contracts`: mirrored `SETTLEMENT_TYPE_STRING`; chain config final; ABI/address remain
  M2 placeholders.
- `apps/web`: `colors_and_type.css` Monad tokens → Tailwind v4 `@theme` (shadcn semantic tokens
  remapped onto the dark monapp palette); fonts (Britti Sans local + Inter/Roboto Mono via
  next/font); primitive library in `components/primitives/` (Btn/Avatar/PotHealth/Timer/RoundPill/
  Tag/ChatMsg/TypingRow/GridBG/Eyebrow/Brand) recreated byte-faithfully from `screens-shared.jsx`;
  `/styleguide` route. `turbopack.root` repointed to monorepo root (app-scoped root broke `next build`).
- **Verified centrally:** `pnpm -r build` + `-r typecheck` + `-r test` green; `forge test` green.

## What exists (M0)
- `apps/web` — Next 16 (App Router, Turbopack) + React 19 + Tailwind v4 + shadcn (new-york,
  cssVariables). Base components added: button, avatar, badge, dialog, progress, tooltip, sheet,
  scroll-area, sonner, skeleton, input. `typecheck` script added. `turbopack.root` pinned.
- `apps/server` — Node+TS ESM skeleton: `src/index.ts` (boot stub), `src/config.ts` (all game
  tunables), `.env.example`. Deps declared (ws, ioredis, pg, viem, @anthropic-ai/sdk, zod, vitest, tsx).
- `contracts` — Foundry (solc 0.8.26, via_ir, clout conventions), forge-std + OZ vendored.
  `src/ImpostorEscrow.sol` skeleton (lifecycle + EIP712 `Settlement` struct + typehash +
  conservation-ready), smoke tests + Deploy script. `forge build` + `forge test` green (2 pass).
- `packages/shared` — WS event-schema (`events.ts`) + `Settlement` type & EIP712 typed-data
  (`settlement.ts`) + `PROTOCOL_VERSION`. The cross-subsystem contract.
- `packages/contracts` — Monad testnet chain config (`chain.ts`) + ABI/address placeholders
  (regenerated in M2).
- `design-reference/` — extracted Claude Design bundle (screens-*.jsx, colors_and_type.css, Britti
  Sans woff2, Monad logos, chat transcript).
- Root: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.gitignore`, `README.md`.

## Verified (M0 close-out)
- `pnpm install` clean (single root lockfile; esbuild + unrs-resolver build scripts approved).
- `pnpm -r build` green across all 5 workspaces (web `next build`, server/shared/contracts `tsc`).
- `forge build` + `forge test` green.

## Architecture summary
Monorepo with `packages/shared` as the authoritative protocol (WS events + `Settlement` struct).
Server is authoritative over game logic + AI; only money is on-chain (trust-the-server MVP). Web
consumes a typed WS via a leak-proof zustand store + wagmi/AppKit for Monad testnet. Contract is a
singleton escrow keyed by gameId enforcing money conservation. Hosting: web→Vercel,
server+Postgres+Redis→Railway, contracts→Monad testnet. See `standards.md` for hard invariants.

## Decision log
### Decision: monorepo vs sibling repos
- Options: pnpm monorepo · separate repos for web/server/contracts.
- Chose: **pnpm monorepo**.
- Rationale: the WS event-schema + `Settlement` struct must be identical across all three
  subsystems; `packages/shared` as one source of truth + `packages/contracts` for ABI is far safer
  than syncing across repos.
- Trade-offs: slightly heavier root tooling; Railway/Vercel need monorepo-aware build roots.

### Decision: hosting topology
- Options: all-Railway · Vercel(web)+Railway(backend) · Vercel+Fly.
- Chose: **Vercel (web) + Railway (server + Postgres + Redis)**; contracts on Monad testnet.
- Rationale: Vercel is purpose-built for Next.js (previews/ISR/edge); the WS server needs a
  long-lived stateful process Vercel can't host; Railway bundles server + managed Postgres + Redis.
- Trade-offs: two dashboards; web↔server over public wss:// (needs WS-origin/CORS config).

### Decision: contract trusts server split, enforces conservation
- Options: contract recomputes game economics · contract enforces conservation only.
- Chose: **conservation only** (`Σpayouts + houseAmount == pool`, survivors must be funders).
- Rationale: encoding round-by-round penalty math on-chain adds trusted inputs + gas for no added
  safety; the conservation check already guarantees House EV ≥ 0. Dust → house.
- Trade-offs: server is trusted for the split correctness (acceptable for v1 trust-the-server MVP;
  `resultRoot` reserved for future commit-reveal).

### Decision: in-game UI is one route, not per-phase routes
- Chose: single `/play/[gameId]` phase-router off authoritative server state.
- Rationale: avoids tearing down the WS/anti-leak guards on navigation; server-driven phase only.

### Decision: orchestration adapted to this harness (no per-agent worktrees)
- Options: per-implementer git worktrees with orchestrator branch-merge (skill default) · parallel
  implementers on `main` with disjoint path ownership + central verify/commit.
- Chose: **disjoint-path-on-main**. Implementers get strict non-overlapping paths, are told not to
  touch deps/lockfile or commit; the orchestrator runs the full verify suite then commits ("merge"),
  dispatches the reviewer, and updates progress.
- Rationale: worktree-isolated agent commits can't be reliably merged back in this harness (branch
  not controllable). Disjoint paths give the same conflict-safety; central verify+commit is the merge.
- Trade-offs: parallel tracks must be path-disjoint (they are, per milestone); no per-agent commit
  granularity.

## M5 delivered (integration, infra-free parts)
- **Settlement seam proven on a local `anvil` EVM:** an integration test deploys `ImpostorEscrow`
  and drives the real money flow with viem, signing via the SERVER's actual `signSettlement`.
  HUMAN_WIN split / dust-to-house / AI_WIN house-100% all pay out exactly (Σpayouts+house==pool,
  escrow→0); tampered payout → `ConservationViolated`, wrong signer → `BadSignature`, abort→refund
  works. 6/6, gated as `*.itest.ts` (`pnpm --filter @ai-impostor/server test:integration`).
- **FE live-server wiring:** `createGameSocket()` uses the real zod-validating WebSocket when
  `NEXT_PUBLIC_WS_URL` is set, else the mock emitter (default).

## Final status (M6)
Complete & locally verified: M0 scaffold · M1 protocol+tokens+primitives · M2 escrow+invariants ·
M3 server+AI+anti-leak · M4 full web flow · M5 settlement-seam proof + live wiring. Go-live steps
(testnet deploy, Railway/Vercel, real Redis/Postgres/Anthropic, browser E2E) are in `DEPLOY.md`.

## Known limitations / watch items
- Next 16 has breaking changes — implementers must read `apps/web/node_modules/next/dist/docs/`.
- **Production-hardening before real money (interface-stubbed today, run without external services):**
  concrete Redis queue store + Postgres repositories (interfaces + in-memory impl + pg skeleton
  exist); chain `SettlementSubmitter` (interface + stub; EIP712 signing is real); disconnect/grace →
  auto-eliminate (deferred from M3). All have clean seams — no rearchitecting needed.
- Repo-wide eslint config not set up (web lints; server/packages lack eslint) — `pnpm -r lint` is
  not a working gate yet. `@anthropic-ai/sdk@0.39.0` predates the adaptive-thinking/effort request
  types (documented loose cast). Minor test/dead-code cleanups noted in the M2/M3/M4 review.
- **M4 prep (from M1 review, minor):** `apps/web/tsconfig.json` doesn't extend `tsconfig.base.json`
  and lacks `noUncheckedIndexedAccess` (a standards gate). Align at the start of M4 before screen
  code piles up (forcing it now risks churn in scaffolded code). Also: shared `*.test.ts` aren't
  covered by `tsc --noEmit` (excluded from build config) — acceptable; runtime suite still guards.
- M5 seam risk: `Settlement`/EIP712 typehash + rounding/dust agreement (pin in M1).
- 4-AI bloc balance + disconnect-penalty fairness are playtest tunables (`BLOC_COHESION`,
  `DISCONNECT_PENALTY_WAIVER`).
