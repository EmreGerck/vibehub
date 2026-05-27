# VibeHub — Setup Guide

## Repos

| Proje | GitHub |
|-------|--------|
| Web + Backend (monorepo) | https://github.com/EmreGerck/vibehub |
| Mobile (Expo) | https://github.com/EmreGerck/vibehub-mobile |

---

## Fork & Clone

```bash
# Web + Backend
git clone https://github.com/EmreGerck/vibehub.git
cd vibehub

# Mobile (ayrı klasöre)
git clone https://github.com/EmreGerck/vibehub-mobile.git
```

---

## Prerequisites
- Node.js 20+ (`nvm install 20` veya https://nodejs.org)
- Docker Desktop (local Postgres + Redis için — opsiyonel, cloud bağlantıları da çalışır)

---

## Backend Setup

```bash
cd backend

# 1. Bağımlılıkları yükle
npm install

# 2. Env dosyasını kopyala
cp .env.example .env
# .env içindeki DATABASE_URL ve REDIS_* değerlerini doldur
# (Neon.tech ve Upstash ücretsiz hesaplarıyla çalışır)

# 3. Migrasyon + Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. GOD_USER seed
npx prisma db seed

# 5. Başlat (http://localhost:3001)
npm run start:dev
```

**Swagger:** http://localhost:3001/api/docs

---

## Frontend Setup

```bash
cd frontend

npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001

npm run dev   # http://localhost:3000
```

---

## Mobile Setup

```bash
cd vibehub-mobile

npm install
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3001

npx expo start
```

---

## Hepsi Birden (Web)

```bash
# Root'tan tek komutla her ikisini başlat
npm install
npm run dev
```

veya tek seferlik script:

```bash
bash scripts/dev.sh
```

---

## Gerekli Env Değişkenleri

### backend/.env

```env
DATABASE_URL=postgresql://...       # Neon.tech connection string
REDIS_HOST=...                      # Upstash host
REDIS_PORT=6379
REDIS_PASSWORD=...                  # Upstash password
REDIS_TLS=true
JWT_ACCESS_SECRET=<min 32 char>
JWT_REFRESH_SECRET=<min 32 char>
FRONTEND_URL=http://localhost:3000
```

### frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### mobile/.env

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## GOD_USER (Admin Hesabı)

```
Email:    god@vibehub.com.tr
Password: God@VibeHub2025!
```

Özelleştirmek için `.env`'e seed'den önce ekle:
```env
GOD_USER_EMAIL=admin@yourdomain.com
GOD_USER_PASSWORD=YourSecurePassword123!
```

---

## Hızlı API Testi

```bash
# Kayıt
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","termsAccepted":true,"privacyAccepted":true}'

# Giriş
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

---

## Production

| Servis | URL |
|--------|-----|
| Backend (VPS) | https://api.vibehub.com.tr |
| Frontend (VPS) | https://vibehub.com.tr |
| Swagger | https://api.vibehub.com.tr/api/docs |
