# Build stage - install dependencies and build
FROM node:23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache bash curl

RUN curl -fsSL https://bun.sh/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    rm -rf /root/.bun/install

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage - minimal runtime
FROM node:23-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache bash

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun

USER nodejs

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD ["bun", ".output/server/index.mjs"]
