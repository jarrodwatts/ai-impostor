# Standards & Conventions

## Tech stack (decided — do not substitute without logging a decision)
- **Monorepo:** pnpm workspaces (`apps/*`, `packages/*`) + Foundry `contracts/`. Node ≥ 20, pnpm 10.
- **Front-end (apps/web):** Next.js 16 (App Router) + React 19 + TypeScript, **Tailwind v4**
  (`@import "tailwindcss"` + `@theme`), **shadcn (new-york, cssVariables)**, Reown AppKit +
  `@reown/appkit-adapter-wagmi` + wagmi + viem, zustand (game state), TanStack Query (queue/REST).
  - ⚠️ **Next 16 has breaking changes vs. prior versions.** Read `apps/web/AGENTS.md` and the
    guides in `apps/web/node_modules/next/dist/docs/` before writing Next code.
  - **Clone, don't invent:** mirror `/Users/jarrod/monapp` for the wagmi/AppKit config
    (`config/{wagmi.ts,index.tsx}`, `context/index.tsx`), font loading (`app/[lang]/layout.tsx`,
    Britti Sans woff2), and the `@theme` token block (`app/globals.css`). Retarget to Monad
    **testnet (chain 10143**, RPC `https://testnet-rpc.monad.xyz`). Drop next-intl/Funkit/Contentful/Dune.
- **Server (apps/server):** Node + TS (ESM), `ws`, `ioredis`, `pg` (or Drizzle/Prisma), viem,
  `@anthropic-ai/sdk`, zod. Tests: vitest. Dev: tsx.
- **Contracts:** Foundry, solc 0.8.26, `via_ir`, optimizer 200, OZ AccessControl/ReentrancyGuard/
  EIP712/ECDSA. Conventions copied from `/Users/jarrod/clout/contracts`. Monad testnet 10143.

## Design fidelity
Dark "monapp" direction. Palette (from `design-reference/project/screens-shared.jsx`): bg `#0E100F`,
raise `#121212`, card `#161616`, line `rgba(255,255,255,.08)`, text `#FBFAF9`, muted `…,.62)`, faint
`…,.40)`; purple `#836EF9`/`#6E54FF` = you/safe, **berry `#A0055D`/`#E03A8B` = AI/danger/loss**.
Type: Britti Sans (display), Roboto Mono (uppercase labels, tracking .08–.16em), Inter (body).
Wire tokens via `apps/web/app/colors_and_type.css` → `@theme inline` (map shadcn semantic tokens
onto Monad palette so base components inherit the look). Build responsive mobile-first + `lg:`;
drop the literal Phone/Screen device frames.

## Load-bearing correctness invariants (HARD — never violate)
1. **Anti-leak by construction.** Server `apps/server/src/ws/broadcast.ts → projectStateForRecipient`
   is the ONLY path that emits state to a socket; it never sends aiCount/humanCount/AI identities/
   vote tallies/absolute MON mid-game. The web zustand store has no field to hold them. Pot Health =
   `%` only. Reveal only in the `settlement` event/screen. Add a property test asserting no
   projected payload (ALIVE_HUMAN/SPECTATOR) contains forbidden fields.
2. **Secret ballot.** Lock on first cast; no recast; no abstain control. Client never holds another
   player's vote; only `eliminatedSeatIds` is broadcast at resolve.
3. **Spectator no-reveal.** `PublicSeat` carries no `isAI` until settlement; spectators render the
   same chat via the same components.
4. **Resolution order** (`apps/server/src/game/resolution.ts`, pure + exhaustively unit-tested):
   remove eliminated → **win-check FIRST** → penalty. Human win `aliveAI==0`; AI win `aliveAI>=aliveHumans`;
   flat 10% pool per round a human is eliminated (waived if that round ends in a human win); AI vote-out = no penalty; ties = all tied out.
5. **House EV ≥ 0 on-chain.** AI never `join()`. `settle()` verifies EIP712 sig + conservation
   `Σpayouts+house == pool` + survivors-are-funders. Dust → house.
6. **AI realism = timing.** Generate message before showing typing; hold behind simulated
   think-delay + length-proportional typing duration so Claude latency never leaks. AI know
   teammates, collude, bloc-vote via the same `cast_vote` path. `BLOC_COHESION` tunable.

## The cross-subsystem contract
`packages/shared` (`events.ts`, `settlement.ts`) is the single source of truth for the WS protocol
and the `Settlement` struct. The Solidity `Settlement` struct + `SETTLEMENT_TYPEHASH` MUST match
`settlement.ts` byte-for-byte — pin with a cross-language typehash test in M1. Changing either side
without the other is a release blocker.

## Quality gates (per workspace, before any merge)
- `pnpm --filter <pkg> typecheck` + `lint` + `test` green; `pnpm -r build` green.
- Contracts: `forge build` + `forge test` (unit + invariant) green.
- TS strict + `noUncheckedIndexedAccess`. No `any` without justification. zod-validate all WS input.
- Match surrounding code; reuse `packages/shared` types; never duplicate the protocol.
- Each milestone ends with an architectural review before merge (see implement.md).

## Decision log convention
Record non-trivial decisions in `progress.md` as: topic · options · chosen · rationale · trade-offs.
