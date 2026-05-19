#!/usr/bin/env bash
# VibeHub — one-shot dev startup
# Usage: bash scripts/dev.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Starting Postgres + Redis..."
docker compose up -d postgres redis

echo "▶ Waiting for Postgres..."
until docker exec vibehub_postgres pg_isready -U vibehub > /dev/null 2>&1; do
  sleep 1
done

echo "▶ Installing backend deps..."
cd "$ROOT/backend"
npm install

echo "▶ Running Prisma migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Seeding GOD_USER..."
npx prisma db seed 2>/dev/null || true

echo "▶ Installing frontend deps..."
cd "$ROOT/frontend"
npm install

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ready! Open two terminals and run:"
echo ""
echo "  Terminal 1 (backend):   cd backend && npm run start:dev"
echo "  Terminal 2 (frontend):  cd frontend && npm run dev"
echo ""
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo "  Swagger:  http://localhost:3001/api/docs"
echo ""
echo "  GOD_USER: god@vibehub.com.tr / God@VibeHub2025!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
