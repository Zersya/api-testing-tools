# Build stage
FROM node:23-alpine AS builder

WORKDIR /app

# Install dependencies for Bun installer
RUN apk add --no-cache bash curl

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    rm -rf /root/.bun/install

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM node:23-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy Bun from builder
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun

COPY --from=builder --chown=nodejs:nodejs /app/.output /app/.output

USER nodejs

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Ensure the path corresponds to the actual build output
CMD ["bun", ".output/server/index.mjs"]