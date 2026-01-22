# -----------------------------------------
# Stage 1: Builder
# -----------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# 1. Install Bun (just to use as a package manager)
RUN npm install -g bun

# 2. Install build tools required for 'better-sqlite3'
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# 3. Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# 4. Copy source and Build
COPY . .
# Force Nuxt to build specifically for Node (creates .output/server/index.mjs)
ENV NITRO_PRESET=node-server
RUN bun run build

# -----------------------------------------
# Stage 2: Runtime
# -----------------------------------------
FROM node:22-slim

# We use /app consistently to avoid path confusion
WORKDIR /app

ENV NODE_ENV=production

# 1. Copy the build output from the builder stage
#    We allow 'node' user to own it immediately
COPY --from=builder --chown=node:node /app/.output /app/.output

# 2. Switch to the non-root 'node' user for security
USER node

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# 3. Use the ABSOLUTE path to avoid "Module not found" errors
CMD ["node", "/app/.output/server/index.mjs"]