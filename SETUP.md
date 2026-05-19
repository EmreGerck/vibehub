# MerchStage — Setup Guide

## Prerequisites
- Node.js 20+ (`nvm install 20` or https://nodejs.org)
- Docker Desktop (for Postgres + Redis)

## First-time setup

```bash
# 1. Start the database and Redis
docker-compose up -d

# 2. Install backend deps
cd backend
npm install

# 3. Copy env file
cp .env.example .env
# Edit .env if you need custom values (defaults work with docker-compose as-is)

# 4. Run database migration and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# 5. Seed GOD_USER
npx prisma db seed

# 6. Start backend (http://localhost:3001)
npm run start:dev

# In a new terminal — frontend
cd ../frontend
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

## Swagger API Docs
http://localhost:3001/api/docs

## Auth flow quick test (httpie or curl)
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Refresh (uses httpOnly cookie)
curl -X POST http://localhost:3001/auth/refresh -b cookies.txt -c cookies.txt

# Me (pass Bearer token from login response)
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## GOD_USER credentials (seeded)
- Email: `god@merchstage.io`  
- Password: `God@MerchStage2025!`  
(override via GOD_USER_EMAIL / GOD_USER_PASSWORD in .env before first seed)
