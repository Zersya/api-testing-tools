# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Install Python and build tools required for better-sqlite3 compilation
RUN apt-get update && \
    apt-get install -y python-is-python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb ./

# Now this will succeed because Python and make are available
RUN bun install --frozen-lockfile

COPY . .

ENV NITRO_PRESET=bun

RUN bun run build

# Stage 2: Production
FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=bun:bun /app/.output /app/.output

USER bun

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD ["bun", "run", "/app/.output/server/index.mjs"]