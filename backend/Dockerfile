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
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
