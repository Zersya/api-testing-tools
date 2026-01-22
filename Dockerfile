# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Force the Nitro preset to 'bun' to guarantee .mjs output
ENV NITRO_PRESET=bun

# Build the app
RUN bun run build

# Stage 2: Production
FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=production

# Copy the built output from builder
# We switch to the 'bun' user (standard in this image) to avoid permission errors
COPY --from=builder --chown=bun:bun /app/.output /app/.output

# Switch to non-root user
USER bun

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Use the absolute path to be 100% safe
CMD ["bun", "run", "/app/.output/server/index.mjs"]