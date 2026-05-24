FROM node:20-alpine AS base
WORKDIR /app
# Workspaces monorepo — only the root has a package-lock.json. The frontend
# build context doesn't include it, so use `npm install` (matches the
# backend Dockerfile). `npm ci` would fail with "missing package-lock.json".
COPY package.json ./
RUN npm install --no-audit --no-fund --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Accept API URL at build time — NEXT_PUBLIC_* vars are baked in at build, not runtime
ARG NEXT_PUBLIC_API_URL=https://api-production-26a7.up.railway.app
ARG NEXT_PUBLIC_SITE_URL=https://vibehub.com.tr
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
