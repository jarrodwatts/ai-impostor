# Goal — AI Impostor

## Outcome
Ship the full product in `SPEC.md` (at repo root): a real-money
social-deduction game on Monad. 10 players share a live chat; 1–4 are hidden LLM AI agents. Humans
win by voting out every AI; the AI side wins at parity. Buy-ins are escrowed in MON on Monad
testnet and split among surviving humans (house keeps the pool on an AI win).

Three subsystems in one pnpm monorepo:
- **apps/web** — Next.js (App Router) front-end, shadcn + Tailwind v4 on the Monad design tokens,
  recreating the hi-fi screens in `design-reference/` pixel-faithfully.
- **apps/server** — Node + TS realtime game server (WebSocket) + LLM AI agent runner.
- **contracts** — Foundry `ImpostorEscrow.sol` on Monad testnet (escrow + EIP712 settlement).

## Acceptance criteria
1. A full game runs end-to-end on Monad testnet: queue → buy-in escrow → lobby → rounds (prompt →
   discussion → vote → resolve) → settlement payout, across all three subsystems.
2. **Anti-leak holds:** no mid-game client payload ever contains AI count, human count, AI
   identities, vote tallies, or absolute MON. Pot Health is a `%` only. AI identities + real MON
   appear only at settlement. (Property-tested on the server's projection function.)
3. **Economics correct & house EV ≥ 0:** AI never escrow; surviving humans split the remaining
   pool; 10% pool cut per misvote round (waived on human win); house takes 100% on AI win. The
   contract enforces `Σpayouts + houseAmount == pool` and survivors-must-be-funders.
4. **Game rules correct:** secret ballot (locked on first cast, no abstain); ties = all tied out;
   resolution order = remove → win-check FIRST → penalty; human win when `aliveAI==0`; AI win at
   parity `aliveAI >= aliveHumans`.
5. **AI is convincing:** uniform identity; human-like language; realistic typing cadence (latency
   hidden behind simulated think+type delay); AI collude and bloc-vote.
6. Screens match `design-reference/` on desktop + mobile; spectator view reveals nothing.
7. All workspaces: `pnpm -r build`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` green;
   `forge test` (unit + invariant) green; deployed to testnet.

## Non-goals (v1 / out of scope — see SPEC §9)
Mainnet launch; multiple buy-in tiers; provable integrity (commit-reveal of AI assignment,
verifiable audit logs — but don't paint the contract into a corner: `resultRoot` is reserved);
rich chat (replies/mentions/reactions); report/block + human moderation; match history/stats;
native mobile apps; spectator betting/side-pots.

## Source of truth
- Product spec: `SPEC.md` (repo root)
- Design: `design-reference/` (read `chats/chat1.md` for intent, `project/screens-*.jsx` +
  `project/colors_and_type.css` for exact visuals).
- Architecture + correctness invariants: `standards.md`. Milestones: `plans.md`.
