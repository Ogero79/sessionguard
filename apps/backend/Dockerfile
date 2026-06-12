# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/
COPY prisma/package.json ./prisma/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend
COPY prisma ./prisma

# Build shared types first, then backend
RUN pnpm --filter @sessionguard/shared-types build
RUN pnpm --filter @sessionguard/backend exec prisma generate --schema=../../prisma/schema.prisma
RUN pnpm --filter @sessionguard/backend build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/
COPY prisma/package.json ./prisma/

# Production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy build artefacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client in runner stage
RUN pnpm --filter @sessionguard/backend exec prisma generate --schema=../../prisma/schema.prisma

EXPOSE 4000
CMD ["node", "apps/backend/dist/index.js"]
