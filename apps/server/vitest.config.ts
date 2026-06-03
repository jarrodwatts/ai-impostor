import { defineConfig } from "vitest/config";

/**
 * Default `test` run = the fast, infra-free unit suite (src/**\/*.test.ts).
 * Integration tests (`test/integration/**\/*.itest.ts`) need foundry (anvil) on
 * PATH and are excluded here; run them explicitly via `pnpm test:integration`.
 */
export default defineConfig({
  test: {
    // Unit-suite excludes integration specs so `pnpm test` needs no foundry.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.itest.ts"],
  },
});
