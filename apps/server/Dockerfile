# Realtime game server (Railway). Built from the monorepo root as context.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Copy the whole workspace (see .dockerignore — foundry libs/web build excluded).
COPY . .

# Install workspace deps and build the server + its workspace deps (shared, contracts).
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ai-impostor/shared build \
 && pnpm --filter @ai-impostor/contracts build \
 && pnpm --filter @ai-impostor/server build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
