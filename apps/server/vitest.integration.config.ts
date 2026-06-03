import { defineConfig } from "vitest/config";

/**
 * Integration suite — the anvil-backed `*.itest.ts` specs under test/integration.
 * Kept separate from the default unit config (which EXCLUDES `*.itest.ts` so
 * `pnpm test` needs no foundry). Run via `pnpm test:integration`. These specs
 * skip gracefully if `anvil` is not on PATH.
 */
export default defineConfig({
  test: {
    include: ["test/integration/**/*.itest.ts"],
    // anvil spawn + on-chain round-trips take longer than the unit defaults.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
