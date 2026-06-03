# Progress

## Current state
- **Milestone:** M0 (scaffold) **complete**. Next up: **M1 — shared foundations** (the gate for all
  parallel subsystem work). Start by freezing `packages/shared` and adding the cross-language EIP712
  typehash test.
- **Repo:** pnpm monorepo at `/Users/jarrod/ai-impostor`, git initialized, single root lockfile.

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

## Known limitations / watch items
- Next 16 has breaking changes — implementers must read `apps/web/node_modules/next/dist/docs/`.
- M5 seam risk: `Settlement`/EIP712 typehash + rounding/dust agreement (pin in M1).
- 4-AI bloc balance + disconnect-penalty fairness are playtest tunables (`BLOC_COHESION`,
  `DISCONNECT_PENALTY_WAIVER`).
