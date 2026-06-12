# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/behavioural-sdk/package.json ./packages/behavioural-sdk/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/behavioural-sdk/node_modules ./packages/behavioural-sdk/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Copy workspace config and base tsconfig
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./

# Copy shared-types source and build it first (dependency of behavioural-sdk)
COPY packages/shared-types ./packages/shared-types
RUN pnpm --filter @sessionguard/shared-types build

# Copy behavioural-sdk source and build it (dependency of frontend)
COPY packages/behavioural-sdk ./packages/behavioural-sdk
RUN pnpm --filter @sessionguard/behavioural-sdk build

# Copy frontend source and build the Next.js app
COPY apps/frontend ./apps/frontend

# Accept NEXT_PUBLIC_* env vars at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter @sessionguard/frontend build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets (directory may be empty but must exist for Next.js)
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/frontend/server.js"]
