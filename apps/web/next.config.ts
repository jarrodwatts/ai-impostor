import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the Turbopack/workspace root to the monorepo root, where the
  // pnpm-lock.yaml lives and where `next` is hoisted in node_modules/.pnpm.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
    // @wagmi/core's "tempo" connector lazily `import('accounts')` (the optional
    // Tempo wallet SDK, not installed). Alias it to an empty stub so the bundler
    // doesn't fail on the unresolvable optional dependency.
    resolveAlias: {
      accounts: "./lib/empty-module.js",
    },
  },
};

export default nextConfig;
