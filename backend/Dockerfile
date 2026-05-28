FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
# Copy package manifest AND prisma schema before install — the postinstall
# script runs `prisma generate` and needs prisma/schema.prisma to exist.
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build && ls -la dist/

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001
# One-time recovery (2026-05-28): the previous deploy attempted a migration that
# used CREATE INDEX CONCURRENTLY inside Prisma's auto-transaction (SQLSTATE 25001).
# The migration is now fixed (plain CREATE INDEX), but Prisma's _prisma_migrations
# table still has a FAILED row that blocks all future migrations (error P3009).
# `resolve --rolled-back` clears that row; `|| true` makes it a no-op once cleared.
# REMOVE THIS LINE in a follow-up commit once the next deploy succeeds.
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back '20260528040000_add_hot_path_indexes' 2>/dev/null || true; npx prisma migrate deploy && node dist/main"]
