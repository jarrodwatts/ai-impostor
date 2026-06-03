# AI Impostor

A real-money social-deduction game on the **Monad** blockchain. 10 players share a live chat; 1–4
are hidden **AI agents**. Humans win by voting out every AI before the AI reaches parity. Buy-ins
are escrowed in MON and split among surviving humans (the house keeps the pool if the AI win).

Built from the product spec in [`SPEC.md`](./SPEC.md) and a Claude Design hi-fi screen set
(see [`design-reference/`](./design-reference/)).

## Monorepo layout

```
apps/web/            Next.js (App Router, TS) front-end — shadcn + Tailwind v4 on Monad tokens
apps/server/         Node + TS realtime game server + LLM AI agent runner (WebSocket)
contracts/           Foundry — ImpostorEscrow.sol (Monad testnet, chain 10143)
packages/shared/     Authoritative WS event-schema + game types + Settlement type (the linchpin)
packages/contracts/  Generated ABI + deployed addresses + EIP712 types (imported by web + server)
design-reference/    Extracted Claude Design bundle (screens, colors_and_type.css, fonts, logos)
.agent/              Long-running-agent orchestrator state files (goal/plans/standards/implement/progress)
```

## Hosting

- **web → Vercel** · **server + Postgres + Redis → Railway** · **contracts → Monad testnet (Foundry)**

## Build plan

The full milestone breakdown (M0–M6), correctness invariants, and architecture live in `.agent/`.
This repo is scaffolded at **M0**; the long-running-agent orchestrator executes M1→M6.

## Getting started

```bash
pnpm install
pnpm -r build          # build all workspaces
pnpm --filter web dev  # run the front-end
cd contracts && forge build && forge test
```

Copy `.env.example` files in each app before running. See `.agent/standards.md` for conventions.
