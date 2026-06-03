# Plans — Milestones

**Critical path:** `M0 (done) → M1 shared foundations → [M2 contracts ∥ M3 server+AI ∥ M4 web] →
M5 integration → M6 hardening`. The gate for all parallel work is M1's frozen event-schema +
`Settlement` struct (`packages/shared`).

Legend: **[P]** parallelizable across subagents · **[S]** sequential. Max 5 parallel worktrees.

---

## M0 — Monorepo scaffold ✅ DONE (this session)
pnpm workspace; `apps/web` (Next 16 + shadcn + Tailwind v4, base components added); `apps/server`
(Node+TS skeleton: `src/index.ts`, `src/config.ts`); `contracts` (Foundry, clout conventions,
`ImpostorEscrow.sol` skeleton — builds + smoke tests pass); `packages/shared` (events + settlement
schema) + `packages/contracts` (Monad testnet chain + ABI/address placeholders); `design-reference/`
extracted; root tooling + README. **Acceptance met:** `forge build`/`forge test` green; build wiring
verified in M0 close-out (see progress.md).

## M1 — Shared foundations **[S gate]** (A/B/C run **[P]**, ALL must land before M2–M4)
- **A · `packages/shared`** — finalize the WS event-schema (`events.ts`) and `Settlement`
  (`settlement.ts`) already stubbed; add a round-trip (de)serialize test for every event; expand
  game/seat/lobby types as needed. Freeze the contract.
- **B · Design tokens + UI primitives (`apps/web`)** — author `app/colors_and_type.css` + `@theme`
  mapping (incl. shadcn semantic tokens); load fonts (Britti Sans local woff2 from
  `design-reference/project/fonts/`, Inter + Roboto Mono via next/font); build the primitive library
  from `design-reference/project/screens-shared.jsx`: `Btn`(CVA variants), `Avatar`(swatch+monogram,
  dead), `PotHealth`(%-only, cannot receive MON), `Timer`, `RoundPill`, `Tag`, `ChatMsg`,
  `TypingRow`, `GridBG`, `Eyebrow`, `Brand`.
- **C · Chain config + escrow interface (`packages/contracts`)** — finalize Monad testnet config;
  export the `ImpostorEscrow` ABI/interface stub + EIP712 typehash so web/server code against it.
- **Acceptance:** shared types importable everywhere; event round-trip test; **cross-language test
  asserts the EIP712 typehash matches between TS (`settlement.ts`) and Solidity (`settlementTypehash()`).**

## M2 — Contracts **[P]** — depends M1(A,C)
Implement `ImpostorEscrow.sol` bodies (currently skeleton): `join`/`lock`/`abort`/`refund`/`settle`/
`withdraw`; EIP712 verify; conservation `==`; survivors-are-funders; replay guard; push-with-pull
fallback; AccessControl + `nonReentrant`. Unit tests (happy, AI-win=house 100%, misvote cut, abort/
refund, double-join, exact-buyin, bad-sig, non-funder survivor, replay) + **`test/Conservation.invariant.t.sol`**
(`Σpayouts+house ≤ Σescrowed`). `script/Deploy.s.sol` → deploy testnet → write `deployments/10143.json`
→ regenerate `packages/contracts` ABI/address.
- **Acceptance:** all forge tests pass; deployed to testnet; live `join→lock→settle` and
  `join→abort→refund` via cast/viem.

## M3 — Realtime server + AI agents **[P]** — depends M1(A)
`apps/server`: `ws/gateway.ts` (auth, heartbeat, routing) + `ws/broadcast.ts` (**anti-leak
projection — security choke point**); `game/Game.ts` state machine + per-game `phaseEndsAt` timers;
`game/resolution.ts` (pure: tally/tie/win-check-first/penalty/pot-health); `game/prompts.ts`
(escalating); `matchmaking/queue.ts` (Redis FIFO, 6-human countdown, `aiCount=clamp(10−humans,1,4)`,
surplus rollover); AI runner `ai/{AgentRunner,persona,cadence,blocVote,claude}.ts` (**prompt caching**
per the claude-api skill — cached persona+rules prefix + incrementally-cached transcript;
think+typing cadence; bloc-vote); disconnect/grace → auto-eliminate; `settlement/settle.ts` (build +
EIP712 sign, stubbed to M1(C) until M2); Postgres append-only event/vote/settlement log.
- **Acceptance:** headless full-game sim → valid `Settlement`; resolution unit tests cover every
  win/tie/penalty/waiver combo; property test: no projected payload leaks forbidden fields; AI
  produce reactive, human-cadenced chat.

## M4 — Front-end screens **[P]** — depends M1(A,B,C)
`apps/web`: pre/post-game routes; **in-game = one `/play/[gameId]` phase-router** off authoritative
server state (never client-advanced). Clone monapp wagmi/AppKit (testnet). zustand `useGameStore`
fed by one typed WebSocket (`lib/ws/`); derive timers from `phaseEndsAt`. Build every screen from
`design-reference/` against a **mock WS emitter + mock chain reads** behind M1 interfaces. Wallet
`join()` buy-in tx; settlement read at end-game only. Screens: Home, Connect, Faucet, Queue, Lobby,
Discussion, Vote, Vote-locked, Elimination, Spectator, End-win (reveal+settlement), End-loss, Share.
- **Acceptance:** all screens render from mocked events on desktop + mobile; HUD anti-leak verified
  (no MON/headcount mid-game); `join()` works vs M2 testnet contract when available.

## M5 — Integration **[S — risky seams]** — depends M2, M3, M4
1. FE↔server live WS (events, typing, votes, reconnect/grace resync).
2. server↔contract: real EIP712 `Settlement` to live testnet contract; on-chain conservation must
   accept the server split. **Highest risk: struct/typehash or rounding/dust mismatch.**
3. FE↔contract: real `buyIn` read on queue; settlement tx hash + payout in the reveal.
- **Acceptance:** one full game start→settle across all three on testnet; abort→refund works;
  pot-health never leaks MON; AI-win pays house 100%, human-win splits with dust-to-house.

## M6 — End-to-end hardening **[S, final]** — depends M5
Multi-game soak (queue→play→settle→play-again); reconnect/grace + auto-eliminate penalty E2E; edge
economics (4-AI bloc, tie eliminations, mixed-tie penalty waiver) reproduced on testnet matching
SPEC §4; gas/latency on Monad sub-second blocks; faucet/new-user check; share card + OG image;
**deploy: web→Vercel, server+Postgres+Redis→Railway** (env per README/standards; Railway watch-path
so web-only changes don't redeploy the server).
- **Acceptance:** N consecutive games settle correctly with zero stranded funds; all SPEC §4
  economic scenarios match the worked example; both apps deployed.

---

## Risky integration points (watch)
1. `Settlement` / EIP712 typehash agreement — pin with the M1 cross-language test.
2. Rounding/dust rule identical on server and contract (dust → house).
3. FE must never read on-chain `pool` mid-game (Pot Health comes only from server events).
4. Server hot-wallet nonce/gas under Monad sub-second blocks (settlement tx reliability).
5. 4-AI bloc balance (playtest `BLOC_COHESION`); disconnect-penalty fairness (tunable waiver).
