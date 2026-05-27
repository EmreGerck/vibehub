# VibeHub

Merch marketplace for artists, bands, comedians, and influencers — with a companion fan app.

## Projects

| Project | Path | Stack | URL |
|---------|------|-------|-----|
| **VibeHub Web** | `frontend/` | Next.js 14, Tailwind, Zustand | vibehub.com.tr |
| **VibeHub Mobile** | `mobile/` | Expo SDK 52, NativeWind | Fan-only iOS/Android |
| **Backend API** | `backend/` | NestJS, Prisma, PostgreSQL, Redis | api.vibehub.com.tr |

The backend is shared — both the web frontend and the mobile app consume the same API.

---

## Monorepo Structure

```
VibeHub/
├── backend/          NestJS REST API (shared by web + mobile)
├── frontend/         Next.js web app
├── mobile/           Expo mobile app (fans only)
├── docs/             Architecture diagrams, preview HTML files
├── scripts/          Dev helper scripts
├── tools/            API test scripts (Python)
├── Figma/            Design system / token export workspace
├── docker-compose.yml  Postgres + Redis for local dev
├── package.json      Workspace root (backend + frontend)
└── SETUP.md          First-time setup guide
```

---

## Quick Start

> See [SETUP.md](SETUP.md) for full instructions.

```bash
# 1. Start Postgres + Redis
docker-compose up -d

# 2. Bootstrap backend
cd backend && npm install
npx prisma migrate dev --name init && npx prisma generate && npx prisma db seed
npm run start:dev       # http://localhost:3001

# 3. Start web frontend (new terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000

# 4. Start mobile app (new terminal)
cd mobile && npm install && npx expo start
```

**Swagger API docs:** http://localhost:3001/api/docs  
**GOD_USER:** `god@vibehub.com.tr` / `God@VibeHub2025!`

---

## Key URLs

| Environment | Backend | Frontend |
|-------------|---------|----------|
| Local | http://localhost:3001 | http://localhost:3000 |
| Production | https://api.vibehub.com.tr | https://vibehub.com.tr |

---

## Roles

| Role | Description |
|------|-------------|
| `GOD` | Super-admin, full access to everything |
| `ADMIN` | Platform admin |
| `VENDOR` | Merch seller (artist, band, etc.) |
| `USER` | Fan / buyer |

Vendor capabilities are further controlled by granular per-tenant permissions (`VendorPermission`).

---

## Development Commands

```bash
# From root
npm run dev:backend      # Start NestJS in watch mode
npm run dev:frontend     # Start Next.js dev server
npm run dev              # Both in parallel (via concurrently)
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed GOD_USER
npm run db:studio        # Open Prisma Studio

# Docker
npm run docker:up        # Start Postgres + Redis
npm run docker:down      # Stop containers

# One-shot dev startup
bash scripts/dev.sh
```

---

## VibeHub Web — Frontend

```
frontend/
├── app/                Next.js App Router pages
│   ├── auth/           Login, register, forgot-password, reset, verify
│   ├── cart/           Shopping cart
│   ├── checkout/       Checkout flow
│   ├── dashboard/      Admin + vendor dashboards
│   ├── messages/       DMs between users
│   ├── nfc/            NFC tag landing pages
│   ├── order-confirmation/  Post-purchase confirmation
│   ├── orders/         Order history
│   ├── product/        Product detail
│   ├── profile/        User profile (orders, wishlist, social, settings)
│   ├── shop/           Product listing
│   ├── store/          Vendor store page
│   ├── u/              Public user profile page
│   ├── vendors/        Vendor apply page
│   ├── kvkk/           KVKK (Turkish GDPR)
│   ├── privacy/        Privacy policy
│   └── terms/          Terms of service
├── components/
│   ├── auth/           OTP input component
│   ├── dashboard/      Sidebar
│   ├── layout/         Navbar, Footer
│   ├── product/        Filter sidebar
│   ├── providers/      ThemeProvider
│   ├── store/          StoreForum, StoreTabBar
│   ├── ui/             Shared UI (Alert, Input, Spinner, etc.)
│   └── vendor/         VendorGrid
├── hooks/              Custom React hooks (useAuth, useCart, etc.)
├── lib/
│   ├── api.ts          Axios instance + interceptors (auto-refresh on 401)
│   ├── format.ts       Currency / date formatters
│   └── i18n.ts         Locale store (tr/en)
├── store/              Zustand stores (auth, cart, theme, toast)
├── types/              Shared TypeScript types
├── middleware.ts        Route-level auth protection
└── public/             Static assets
```

### Missing / To-do (Frontend)

- [ ] `app/not-found.tsx` exists but needs styling consistency
- [ ] Vendor dashboard (`app/dashboard/vendor/`) — shell only, needs full implementation
- [ ] Admin dashboard (`app/dashboard/admin/`) — shell only
- [ ] `app/store/[slug]/` — StoreForum component needs WebSocket / polling

---

## VibeHub Mobile

```
mobile/
├── app/
│   ├── (auth)/         Login, register, forgot-password
│   ├── (tabs)/         Bottom tab navigator
│   │   ├── home/       Feed / discover
│   │   ├── shop/       Product listing + cart
│   │   ├── scan/       QR/NFC scanner
│   │   ├── forum/      Community forums
│   │   └── profile/    Fan profile, orders, wishlist, settings
│   ├── forum/          Channel, topic, DM detail screens
│   ├── product/[id]    Product detail
│   ├── vendor/[slug]   Vendor store
│   ├── order/[id]      Order detail
│   └── checkout.tsx    Checkout screen
├── assets/             App icons, splash
└── ...config files     babel, metro, eas, expo
```

### Mobile Backend Tasks (open)

- [ ] Payment gateway decision (Iyzico web-based vs native SDK)
- [ ] Push notification device token registration (`/devices`)
- [ ] Deep link handling for NFC tags

---

## Backend API Modules

| Module | Path prefix | Notes |
|--------|-------------|-------|
| Auth | `/auth` | JWT, OTP, device tokens, refresh |
| Users / Profile | `/profile`, `/u` | Public profiles, social |
| Products | `/products` | CRUD, variants, reviews |
| Orders | `/orders` | Place, track, status updates |
| Cart | `/cart` | Per-user cart items |
| Wishlist | `/wishlist` | |
| Vendors | `/vendors` | Apply, approve, update |
| Forum | `/forum` | Channels, topics, DMs |
| Messages | `/messages` | Direct messages |
| NFC | `/nfc` | Tag registration and redirect |
| Media | `/media` | S3 upload via signed URL |
| Payments | `/payment` | Iyzico integration |
| Payouts | `/payout` | Vendor payout requests |
| Notifications | `/notifications` | In-app notifications |
| Push | — | Expo push (internal service) |
| Admin | `/admin` | God/admin-only operations |
| Feed | `/feed` | Activity feed |
| Events | `/admin/events` | Concert/event management |
| Banners | `/banners` | Homepage banners |
| App Config | `/app-config` | Runtime config flags |
| Audit | — | Internal audit log service |

---

## Tools

`tools/api_test.py` — smoke test against production API (NFC, Forum, Media, Events)  
`tools/api_test_full.py` — full auth + endpoint coverage test

```bash
pip install requests
python tools/api_test.py
python tools/api_test_full.py
```
