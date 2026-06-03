import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the Turbopack/workspace root to the monorepo root, where the
  // pnpm-lock.yaml lives and where `next` is hoisted in node_modules/.pnpm.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
