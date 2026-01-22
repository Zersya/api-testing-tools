# Stage 1: Build (Use Node.js, but install Bun for lockfile support)
FROM node:22-slim AS builder

WORKDIR /app

# Install Bun (only used for package installation here)
RUN npm install -g bun

# Install build tools for better-sqlite3 compilation
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb ./

# Install dependencies using Bun, but they compile for Node.js
RUN bun install --frozen-lockfile

COPY . .

# Tell Nuxt to build for Node.js specifically
ENV NITRO_PRESET=node-server

RUN bun run build

# Stage 2: Production (Run on Node.js)
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production

# Copy the built output
COPY --from=builder /app/.output /app/.output

# Create user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# RUN WITH NODE (Not Bun)
CMD ["node", ".output/server/index.mjs"]