# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm via npm (more resilient than corepack on flaky networks)
RUN apk add --no-cache openssl && npm install -g pnpm@9.1.0

# Copy ALL workspace manifests so pnpm lockfile matches
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/behavioural-sdk/package.json ./packages/behavioural-sdk/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/ml-service/package.json ./apps/ml-service/
COPY prisma/package.json ./prisma/

# Install all workspace deps (including devDependencies for compilation)
RUN pnpm install --frozen-lockfile

# Copy source needed for the backend build
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend
COPY prisma ./prisma

# Build shared types first, then generate Prisma client, then build backend
RUN pnpm --filter @sessionguard/shared-types build
RUN pnpm --filter @sessionguard/backend exec prisma generate --schema=../../prisma/schema.prisma
RUN pnpm --filter @sessionguard/backend build

# Compile the seed script so it can run without ts-node in production
RUN cd prisma && npx tsc --project tsconfig.json

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl curl && npm install -g pnpm@9.1.0

# Copy ALL workspace manifests so pnpm lockfile matches
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/behavioural-sdk/package.json ./packages/behavioural-sdk/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/ml-service/package.json ./apps/ml-service/
COPY prisma/package.json ./prisma/

# Production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy build artefacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/dist ./prisma/dist

# Generate Prisma client in runner stage
RUN pnpm --filter @sessionguard/backend exec prisma generate --schema=../../prisma/schema.prisma

EXPOSE 4000
CMD ["node", "apps/backend/dist/index.js"]
