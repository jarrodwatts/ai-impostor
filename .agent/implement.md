# Implement — subagent workflow

You are an implementer subagent working one task from `plans.md` in an isolated git worktree.

## Before you code
1. **Read `goal.md`, `standards.md`, and your task in `plans.md`.** Re-read `progress.md` for current
   architecture state and prior decisions — do not re-litigate settled choices.
2. **Read the contract first:** `packages/shared` (`events.ts`, `settlement.ts`) is authoritative.
   Build against those types; never invent a parallel protocol. For UI, read the matching
   `design-reference/project/screens-*.jsx` and `colors_and_type.css` for exact values.
3. **Reuse existing code:** clone patterns from `/Users/jarrod/monapp` (web wagmi/AppKit/fonts/theme)
   and `/Users/jarrod/clout/contracts` (Foundry/EIP712 settlement). Don't reinvent.

## While coding
- Honor every hard invariant in `standards.md` (anti-leak, secret ballot, resolution order, house
  EV, AI timing). These are not optional.
- TS strict + `noUncheckedIndexedAccess`; zod-validate all inbound WS messages; ESM imports.
- Write tests as you go (vitest for TS, forge for Solidity). The money/leak/resolution logic is
  test-first: `game/resolution.ts` and `ws/broadcast.ts` need exhaustive + property tests.
- Keep changes scoped to your task. If you discover new scope, add a task to `plans.md` rather than
  ballooning the current one.

## Before you finish
- Run the gates for your workspace: `pnpm --filter <pkg> typecheck && lint && test` (and
  `pnpm -r build` if you touched shared); `forge build && forge test` for contracts.
- Self-review your diff against `standards.md`. Commit with a clear message; do not merge with
  failing tests or red types.
- Report what changed, what you verified, and any decision worth logging.

## Orchestration rules (for the coordinator)
- Dispatch one implementer per parallel task; ≤ 5 worktrees at once to limit merge conflicts.
- Sequential tasks: complete prerequisite → merge → branch the dependent from updated main.
- After each milestone: dispatch an **architectural reviewer** on the merged diff (checks invariants,
  test coverage, protocol drift, naming). Route findings to fix subagents; re-review until APPROVE
  or 3 iterations (then log a deferral and proceed).
- Verify (tests/lint/types/forge) before every merge. Handle merge conflicts immediately.
- Update `progress.md` after every meaningful action; never let it go stale.
- Don't over-delegate trivial edits; don't skip reviews after milestones.
