import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this app (the monorepo lockfile lives at the repo root).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
