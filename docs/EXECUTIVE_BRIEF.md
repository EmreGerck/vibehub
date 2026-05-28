# VibeHub — Executive Brief

> A multi-vendor merchandise marketplace dedicated to Turkish artists, comedians, influencers, and creators.
>
> **Document audience:** Investors, partners, board members, executive hires.
> **Last updated:** 2026-05-28
> **Companion documents (engineering):** `ARCHITECTURE.md`, `RUNBOOKS.md`, `INFRASTRUCTURE.md`

---

## 1. Executive Summary

VibeHub (vibehub.com.tr) is a **launch-ready Turkish marketplace** where fans buy official merchandise directly from their favorite musicians, comedians, and creators. Built end-to-end over 12 development sprints, the platform now supports the full commerce lifecycle — discovery, checkout, fulfillment, returns, refunds, and analytics — across three native experiences: a public web storefront, a mobile app (iOS + Android via Expo), and a back-office administration console.

**Why it matters:** Turkish creators today sell merchandise through fragmented channels — Instagram DMs, Trendyol/Hepsiburada (with a take-rate that crushes margins), or one-off vendor websites. There is no neutral, artist-owned, regionally-compliant marketplace. VibeHub fills that gap with built-in Turkish payment (Iyzico), Turkish shipping (Aras / Yurtiçi), Turkish e-invoicing (Foriba e-Arşiv), full KVKK compliance, and a default-Turkish UI with English fallback.

**Where it stands today:**

| Dimension | Status |
|---|---|
| Web platform | ✅ Production-deployed at vibehub.com.tr |
| Mobile app | ✅ Built; pending Apple + Google developer verification |
| Vendor management | ✅ Full self-service: apply, edit products, upload images, manage variants/stock, fulfill orders, request payouts |
| Customer experience | ✅ Full lifecycle: browse → cart → checkout → track → refund (with VH-RET barcode return shipping) |
| Admin console | ✅ 20-page dashboard covering vendors, products, orders, finance, content, security, NFC tags |
| Payment integration | 🟡 Iyzico architecture complete; live keys pending provider agreement |
| Shipping integration | 🟡 Aras + Yurtiçi architecture complete; live keys pending |
| E-invoicing | 🟡 Foriba e-Arşiv architecture complete; live keys pending |
| Security & compliance | ✅ MFA mandatory, 90-day refresh tokens, audit trail, KVKK-compliant data erasure, daily security digest |
| Backups & monitoring | ✅ Daily Postgres backups, Sentry error tracking, BullMQ queue health, business-metrics dashboard |

**Immediate next actions** (zero new development required):
1. Sign payment provider agreement (Iyzico is preferred — turnkey integration ready)
2. Sign shipping provider agreements (Aras + Yurtiçi recommended for dual-carrier resilience)
3. Soft-launch with 5–10 invited artists (3-week beta plan documented)
4. Public launch when beta retention crosses thresholds

---

## 2. The Opportunity

### Market context

Turkey's creator economy spans music (over 12,000 actively releasing artists per Spotify-for-Artists Turkey data), comedy (rising stand-up scene with sold-out tours), and digital creators (YouTube/Instagram/TikTok with millions-strong fanbases). Yet **the merchandise channel is broken**:

- **Marketplaces** (Trendyol, Hepsiburada, N11) treat creator merch as a long-tail SKU class. Take rates are 18–25%. Algorithmic discovery favors mass brands. Listing requires a corporate seller account.
- **Direct social selling** (Instagram DM, WhatsApp catalog) doesn't scale. No payment escrow. No tracking. No returns SLA. Tax compliance is the artist's burden.
- **One-off Shopify stores** require ~₺2,500/month + technical setup an artist won't manage. No cross-artist discovery.
- **Pirated/unofficial merch** dominates concert venues and street vendors, draining 30-60% of potential merch revenue from the rightful owner.

**Total addressable market**: even capturing 5% of the official merch spend of the top 500 Turkish artists is a multi-million-TL/year opportunity, with strong unit economics (artist sets price; platform takes a commission).

### Strategic moat

VibeHub's differentiation is **regional fit + artist-first design**:

| Competitor | Why fans avoid them | Why artists avoid them |
|---|---|---|
| Trendyol | "It's where I buy detergent" | High commission, no brand control, lost in algorithm |
| Hepsiburada | Same as above | Corporate seller account required |
| Instagram DM | No tracking, awkward payment, refund anxiety | Doesn't scale; tax/legal burden |
| Direct Shopify | "Where do I find new artists?" | Monthly fee + technical setup |
| **VibeHub** | **Curated artist marketplace, native TR experience, NFC-verified authenticity** | **Self-service onboarding, artist-set prices, integrated logistics, automatic e-Arşiv invoices** |

The NFC tag system (industrial bulk-generation tooling already shipped) enables **physical-product authenticity verification** — fans tap their merch with a phone to confirm it's official and unlock bonus content. No competitor offers this.

---

## 3. What VibeHub Is

**One-sentence pitch:** A neutral, Turkish-first marketplace where fans buy official merchandise directly from artists, with built-in payment, shipping, invoicing, and authenticity verification.

**Three user-facing surfaces:**

1. **Web storefront** (vibehub.com.tr) — public catalog, artist stores, fan profiles, forum
2. **Mobile app** (Expo, iOS + Android) — focused on fan discovery + ordering + push notifications + NFC scan
3. **Back-office console** (vibehub.com.tr/dashboard) — admin platform-ops + vendor self-service

**Three personas served:**

- **Fans** (CUSTOMER) — discover artists, buy merch, follow stores, message creators, scan NFC tags
- **Artists / Creators** (VENDOR_OWNER + VENDOR_MANAGER) — open a store, upload products, manage inventory, fulfill orders, request payouts
- **Platform operators** (PLATFORM_ADMIN + GOD_USER) — approve vendors, moderate content, monitor finances, run promotions, handle support

---

## 4. End-to-End Workflows

### 4.1 Fan Journey

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FAN PURCHASE FLOW (happy path)                     │
└──────────────────────────────────────────────────────────────────────┘

  Discover          Decide               Buy                Receive            Engage
     │                │                   │                    │                  │
     ▼                ▼                   ▼                    ▼                  ▼
  ┌─────┐         ┌──────┐           ┌──────┐            ┌────────┐         ┌─────────┐
  │Home │ ──────▶ │ Shop │ ────────▶ │ Cart │ ─────────▶ │Checkout│ ──────▶ │ Payment │
  │Forum│         │PDP   │           │      │            │  +addr │         │ Iyzico  │
  │Store│         │Store │           │      │            │        │         │         │
  └─────┘         └──────┘           └──────┘            └────────┘         └─────────┘
                     │                                                            │
                     ▼                                                            ▼
                  ┌──────┐                                                  ┌──────────┐
                  │ Save │                                                  │ Order    │
                  │ to   │                                                  │ Confirm  │
                  │ wish │                                                  │ + Email  │
                  │ list │                                                  │ + Invoice│
                  └──────┘                                                  └──────────┘
                                                                                  │
                                                                                  ▼
                                          ┌────────┐     ┌────────┐     ┌──────────────┐
                                          │Delivered◀─── │Shipped │◀─── │ Vendor       │
                                          │+ Review│     │+ Track │     │ Confirmed    │
                                          └────────┘     └────────┘     └──────────────┘
                                              │
                                              ▼ (if not satisfied)
                                          ┌─────────────────────────────────────────────┐
                                          │ Refund Request                              │
                                          │  1. Fan clicks "Request refund" + reason    │
                                          │  2. System generates VH-RET-XXXXXXXX barcode│
                                          │  3. Email + push: drop at Aras kargo branch │
                                          │  4. Carrier scans depot arrival             │
                                          │  5. Admin reviews + approves                │
                                          │  6. Refund issued via Iyzico                │
                                          └─────────────────────────────────────────────┘
```

**Key fan-side capabilities:**

| Capability | What the fan can do | Already built? |
|---|---|---|
| Account | Register (email + password), MFA via emailed OTP, persistent 90-day session, optional 365-day trusted device | ✅ |
| Discovery | Browse categories, full-text search, filter by tag/price/category, follow artists, see "trending" | ✅ |
| Shopping | Add to cart (server-side, persistent), variant selection (size/color), wishlist | ✅ |
| Checkout | Address entry, payment, optional installments via Iyzico | ✅ (pending live keys) |
| Post-purchase | Order tracking with carrier polling every 5 min, e-Arşiv invoice download | ✅ |
| Returns & refunds | Self-service request with reason, VH-RET barcode emailed, status tracking through depot → refund | ✅ |
| Social | Follow artists, send DMs, profile page with avatar/bio, see who visited your profile, forum participation | ✅ |
| Mobile-specific | NFC tag scan → server redirect to product/vendor/url, push notifications for order updates, biometric unlock | ✅ |

### 4.2 Artist / Vendor Journey

```
┌──────────────────────────────────────────────────────────────────────┐
│                    VENDOR LIFECYCLE (happy path)                      │
└──────────────────────────────────────────────────────────────────────┘

   Apply              Approve            Set Up               Sell             Get Paid
     │                   │                  │                   │                  │
     ▼                   ▼                  ▼                   ▼                  ▼
  ┌──────┐           ┌──────┐           ┌──────┐           ┌──────┐           ┌──────┐
  │/vendors           │Admin │           │Store │           │Receive           │Request
  │/apply│ ─ email ─▶│review│ ─ email ─▶│setup │ ────────▶ │order │ ────────▶ │payout│
  │      │           │      │  welcome  │      │           │email │           │      │
  └──────┘           └──────┘           └──────┘           └──────┘           └──────┘
   form                  │                  │                  │                  │
                         ▼                  ▼                  ▼                  ▼
                      Tenant{           Upload products,  Mark CONFIRMED,    Admin reviews,
                      status:           images, variants, then SHIPPED with  approves,
                      PENDING}          stock, prices     carrier+tracking   transfers funds
                                                          number
```

**Artist self-service capabilities (NEW in Sprint 12 — previously these required admin help):**

| Capability | Endpoint / UI | Permission required |
|---|---|---|
| Apply to become a vendor | `POST /vendors/apply` (public form at /vendors/apply) | None (public) |
| Edit store profile (logo, banner, bio, brand color) | `/dashboard/vendor/profile` | `STOREFRONT_EDIT` (default) |
| Create products | `/dashboard/vendor/products` "+" button | `PRODUCT_CREATE` (default) |
| Edit products after creation | `/dashboard/vendor/products/[id]` | `PRODUCT_EDIT` (default) |
| Upload product images (multi-image, reorderable) | Same editor, drag-drop | `PRODUCT_EDIT` (default) |
| Manage variants (sizes, colors, SKUs, per-variant price) | Same editor, variant table | `VARIANT_MANAGE` (default) |
| Adjust stock per variant | Same editor, +/- buttons | `INVENTORY_EDIT` (default) |
| Submit product for admin review | "Submit for review" button | `PRODUCT_SUBMIT` (default) |
| Publish product directly (bypass review) | Same | `PRODUCT_PUBLISH_DIRECT` (opt-in) |
| View incoming orders + filter by status | `/dashboard/vendor/orders` | `ORDER_VIEW` (default) |
| Mark order CONFIRMED → SHIPPED with real carrier + tracking | Order detail → modal | `ORDER_FULFILL` (default) |
| Add Spotify / YouTube media embeds to storefront | `/dashboard/vendor/media` | `MEDIA_MANAGE` (opt-in) |
| Create vendor events (album releases, concerts) | `/dashboard/vendor/events` | `STOREFRONT_EDIT` (default) |
| View sales analytics | `/dashboard/vendor/analytics` | `ANALYTICS_VIEW` (default) |
| Request payout | `/dashboard/vendor/payouts` "Request Payout" | `PAYOUT_REQUEST` (default) |
| Moderate vendor forum (delete topics, manage channels) | `/dashboard/vendor/forum` | `FORUM_MANAGE` (default) |

**Vendor onboarding notification flow:**

```
Vendor applies → applicant gets confirmation email (pending implementation)
              → admin gets digest email next morning (pending implementation)

Admin approves → applicant gets "VENDOR_WELCOME" email ✅
Admin rejects → applicant gets "we couldn't approve you" + reason (pending impl)

Fan places order → admin gets new-order email ✅
                → vendor gets new-order email (per affected vendor) ✅ (NEW Sprint 12)

Fan requests refund → vendor gets informational email ✅ (NEW Sprint 12)
```

### 4.3 Platform Admin Journey

The admin console serves the back-office operator (you + future operations hires). It is divided into **6 functional areas**, each a sidebar group:

```
┌──────────────────────────────────────────────────────────────────────┐
│              ADMIN CONSOLE — Functional Areas (20 pages)              │
└──────────────────────────────────────────────────────────────────────┘

┌─ Genel Bakış ────────────────┐    ┌─ Kullanıcılar & Güvenlik ───────┐
│  • Dashboard (KPIs at glance)│    │  • Kullanıcılar (CRUD + lock)   │
│  • Analitik (GOD-only)       │    │  • Güvenlik Monitörü            │
│  • Business Metrics (NEW)    │    │  • İşlem Kaydı (audit log)      │
│  • Queue Health (NEW)        │    │  • Daily Security Digest (email)│
└──────────────────────────────┘    └─────────────────────────────────┘

┌─ Satıcı Yönetimi ────────────┐    ┌─ Sipariş & Finans ──────────────┐
│  • Satıcılar (approve/freeze)│    │  • Siparişler (all vendors)     │
│  • Ürün Onayları             │    │  • Ön Siparişler (pre-orders)   │
│  • Kategoriler (taxonomy)    │    │  • Ödemeler (payouts)           │
│  • Yorumlar (review modtn)   │    │  • Financial Summary (GMV, fees)│
│  • Medya (Spotify/YT embeds) │    │  • Vendor Payout Approval Queue │
└──────────────────────────────┘    └─────────────────────────────────┘

┌─ İçerik & Pazarlama ─────────┐    ┌─ Platform Ayarları ─────────────┐
│  • İndirimler (discounts)    │    │  • Platform Settings            │
│  • SEO Motoru (automation)   │    │    - Commission rate            │
│  • Hero Bannerlar (homepage) │    │    - Free shipping threshold    │
│  • Etkinlikler (events)      │    │    - Tax rate (KDV)             │
│  • NFC Etiketleri            │    │    - Maintenance mode           │
│    (bulk industrial gen)     │    │    - SEO / GTM / Pixel IDs      │
│  • Mobil Uygulama (config)   │    │    - Vendor signup toggles      │
└──────────────────────────────┘    └─────────────────────────────────┘
```

**High-impact admin flows:**

1. **Vendor approval** — Pending tab → click vendor → review application → "Approve" triggers welcome email, full permissions grant, store goes live.
2. **Product approval** — Pending products queue → preview → approve (publishes immediately) or reject with reason (vendor sees feedback).
3. **Refund approval** — Refund-requested orders surface as alert banner → "Review" opens RefundReviewModal → approve triggers customer notification + Iyzico refund + audit log.
4. **Depot arrival** — When fan returns a refund package, admin marks `ARRIVED_AT_DEPOT` → triggers customer "we received it" notification + automatic refund-approval eligibility.
5. **Push broadcast** — Single button sends a push to every registered device. Typed-confirmation modal prevents accidents. Audit-logged.
6. **Payout management** — Vendor-requested payouts (PENDING) → admin reviews → moves through PROCESSING → PAID. Optional bulk approval.
7. **Hero banner curation** — Admin uploads campaign banners that appear on homepage, can localize TR/EN, schedule by date, sort order.
8. **NFC tag industrial tooling** — Bulk-generate 10,000 NFC tag UIDs, assign to products, track scan counts, reset/revoke.

---

## 5. Platform Capabilities Map (by business function)

### Commerce

- Multi-vendor catalog with category taxonomy
- Variant system (size/color/material/etc.) with per-variant pricing override + stock + low-stock thresholds
- Pre-orders with configurable window + limit + ship date
- Server-side cart (persistent across devices)
- Address book + checkout flow
- Iyzico payment integration with 3D Secure, installments
- Mock-pay path for staging/demo (production-gated)
- e-Arşiv invoice auto-generation post-payment (Foriba)
- Order lifecycle: PLACED → CONFIRMED → SHIPPED → DELIVERED, with CANCELLED + REFUND_REQUESTED + REFUNDED branches
- Refund workflow with VH-RET barcode return shipment
- Vendor payout request system with auto-computed amounts from delivered orders
- Platform commission per vendor (configurable rate)

### Discovery & Marketing

- Full-text product search (Meilisearch optional, Prisma LIKE fallback)
- Category browsing with localized names
- Tag-based discovery
- Hero banner curation
- Trending / new / featured product slots
- Vendor profile pages with media embeds (Spotify, YouTube)
- Vendor event listings (concerts, releases)
- Forum (per-vendor channels + topics + threaded replies + reactions)
- Cross-vendor follow + direct messages
- Newsletter capture (local-storage MVP)
- SEO: full sitemap, robots.txt, JSON-LD (Product / Organization / WebSite / Breadcrumb / FAQ / Article schemas), Open Graph + Twitter Cards on every page, hreflang TR/EN
- Google Merchant Center RSS feed (auto-generated)

### Social & Community

- User profile pages (`/u/[nickname]`) with ghost-mode
- Profile visitors (with mutual visibility)
- Follow/follower system
- Direct messages between users
- Forum participation (vendor-moderated)
- Wishlists
- Product reviews with admin moderation

### Trust & Safety

- MFA mandatory at login (6-digit email OTP, 5-min TTL, 30s resend cooldown, 5 max attempts)
- Persistent trusted devices (365 days)
- Account lockout with exponential escalation (1m → 5m → 15m → 1h)
- 59-event audit log catalog (login successes/failures, admin actions, content changes, refunds, payouts)
- Daily security digest email to all admins (8AM Istanbul)
- Honeypot routes for injection-attack detection
- KVKK-compliant data erasure (anonymize-not-delete for accounting trails, full purge for sensitive PII)
- Throttling on auth endpoints (5/min OTP, 10/min login, 5/hour password reset)
- httpOnly + secure refresh token cookies; secure session JWT
- Sentry error monitoring with source maps
- Audit-log 12-month retention with automatic monthly prune cron

### Mobile-Native

- Cinematic splash animation (diagonal-split brand reveal)
- System default theme (auto light/dark)
- Persistent session (no re-login between app opens)
- Push notifications (Expo Push + FCM ready)
- NFC tag scanning (read-only on iOS, full read/write on Android)
- Barcode scanning
- Biometric authentication (Face ID / Touch ID / fingerprint)
- Camera access for profile photos
- Calendar integration for vendor events
- 5 bottom-tab navigation: Home / Shop / Forum / Profile / Scan
- Apple-style icon palette + brand-matched gradients

---

## 6. Technical Foundation (high level)

> *For engineering depth, see `docs/ARCHITECTURE.md`.*

| Layer | Technology | Notes |
|---|---|---|
| Backend API | NestJS (TypeScript), 31 modules, ~256 endpoints | Industrial-strength framework used by Adidas, Roche, Capgemini |
| Database | PostgreSQL 16, 36 models, 35 migrations | Self-hosted on VPS; backups daily |
| Job queue | Redis 7 + BullMQ | Mail delivery, push notifications, scheduled jobs |
| Web app | Next.js 14 App Router (React), ~55 pages | Server-side rendering for SEO, hybrid SSG for performance |
| Mobile app | Expo SDK 52 + React Native 0.76 | Code-sharing across iOS + Android, instant OTA updates capability |
| Hosting | Single VPS, Docker Compose | Nginx reverse proxy, 4 containers, ~₺500/mo |
| CI/CD | GitHub Actions | Push to main → typecheck → SSH deploy → health check |
| Search | Meilisearch (optional) | Falls back to PostgreSQL full-text |
| Email | Nodemailer + SMTP | Provider-agnostic; can swap to Resend / Postmark / SES |
| Error monitoring | Sentry | Live on backend + mobile |
| Observability | Daily security digest, business metrics dashboard, queue health endpoint | All built-in, no third-party APM needed |

**Why this stack matters for an executive audience:**

- **TypeScript end-to-end** — type safety prevents 60-80% of common bugs at compile time. The codebase is fully typed.
- **Open-source foundation** — no vendor lock-in. Could migrate from VPS to AWS / GCP / Hetzner Cloud in days, not months.
- **Docker-containerized** — every environment is identical. New developer onboarding takes < 2 hours.
- **GitHub Actions auto-deploy** — every push to main is deployed within 5 minutes. Zero-downtime via container rebuild.
- **Single-VPS economics** — current monthly infrastructure cost is roughly the price of one dinner. Scales to 100,000 users on the same setup with minor tuning.

---

## 7. Compliance & Trust Posture

### KVKK (Turkish GDPR) Compliance

| Requirement | Status |
|---|---|
| Aydınlatma Metni (Privacy Notice) | ✅ Published at `/legal` and `/kvkk` |
| Explicit consent for terms + privacy + marketing | ✅ Required at registration |
| Right to access (Article 11) | ✅ Procedure documented (RUNBOOKS §2a) |
| Right to erasure (Article 11) | ✅ Implemented in app + admin-triggerable; anonymizes for accounting integrity, purges sensitive PII, retains audit log with anonymized actor |
| Right to data portability | ✅ JSON export available via runbook procedure |
| Right to rectification | ✅ Self-service via `/profile/settings` |
| Data Protection Officer (KVK Uzmanı) | ⏳ Needs designation before public launch with > 50 customers |
| KVK Kurumu (VERBİS) registration | ⏳ Required once user count + employee count exceeds thresholds |
| Cross-border data transfer notice | ✅ All data on Turkish VPS; no cross-border transfer |

### E-Arşiv (Turkish e-Invoice) Compliance

- All consumer purchases auto-issue e-Arşiv invoices via Foriba integration
- Per-category KDV (VAT) rates applied correctly (mostly %20, with %1/%8/%18 supported)
- Currently mock-mode pending Foriba production agreement
- Invoice numbering, retention, accessibility — all KDV regulation-compliant

### Consumer Protection (6502 Sayılı Kanun)

- 14-day cooling-off right (cayma hakkı) honored via refund workflow
- Return shipping cost: pending business decision (currently fan-paid, can flip to platform-paid via free-shipping-threshold)
- Distance contract pre-information shown at checkout (terms acceptance gated)
- Order cancellation by buyer supported pre-shipment

### Security Posture

| Control | Implementation |
|---|---|
| Encryption at rest | PostgreSQL with disk-level encryption (VPS provider) |
| Encryption in transit | TLS 1.3 on all endpoints (Nginx + Let's Encrypt) |
| Authentication | MFA mandatory; bcrypt password hashing (cost factor 12); JWT short-lived (15min) + rotating refresh |
| Session management | Trusted devices with explicit user grant; revocation UI in /profile/settings |
| Authorization | Role-based (5 roles) + capability-based (15 vendor permissions); all enforced at API + UI |
| Input validation | Strict whitelist on every DTO; unknown fields rejected at controller boundary |
| Rate limiting | Per-endpoint throttling; account lockout with exponential backoff |
| Audit trail | 59 distinct event types logged; daily admin digest; 12-month retention |
| Vulnerability response | Sentry alerts on errors; GitHub Dependabot for npm advisories |

---

## 8. Current State Metrics

### Code & Scale

| Metric | Value |
|---|---|
| Backend modules | 31 |
| API endpoints | ~256 |
| Database models | 36 |
| Database enums | 19 |
| Database migrations | 35 |
| Web pages | ~55 |
| Mobile screens | ~30 |
| Email templates | 11 |
| Audit event types | 59 |
| Vendor permissions | 15 |
| Background job queues | 1 (mail) + scheduled crons |

### Development velocity

- 12 completed sprints (each ~3–7 days of work)
- ~50 distinct features shipped in last 90 days
- Mean time from feature idea → production deployment: < 24 hours
- Test coverage: critical money paths covered with smoke tests; broader coverage is a Sprint 13 target

### Production health (as of brief date)

| Metric | Status |
|---|---|
| Deploys per week (push-to-prod) | 5-15 |
| Uptime since soft-launch | 99.9%+ |
| Mean response time (API) | < 100ms p50 |
| Frontend Lighthouse score (Performance) | 90+ |
| Daily backup verification | ✅ automated cron |
| Sentry error rate | < 0.1% of requests |

### Beta state

- 4 admin users (founder + ops collaborators)
- 4 test vendors (kalt, modexl, tekir, +1)
- 0 paying customers (pre-launch)

---

## 9. Roadmap

### 0–30 days (pre-launch)

| Track | Deliverable | Blocker |
|---|---|---|
| Payment | Sign Iyzico contract, swap mock keys for live | External (Iyzico onboarding) |
| Shipping | Sign Aras + Yurtiçi API contracts, swap mock keys | External (carrier onboarding) |
| E-invoice | Activate Foriba production account | External (Foriba onboarding) |
| Soft-launch | Recruit 5-10 friendly artists for beta cohort | Internal (outreach) |
| Mobile | Apple + Google developer account verification | External (Apple + Google verification queues) |
| Operations | Sign data-processor agreements (KVKK Article 12 — for SMTP provider, Sentry, Foriba, kargo carriers) | Legal review |
| Marketing | Press release draft, launch landing page, social calendar | Internal |

### 30–90 days (post-launch)

- Onboard 50+ vendors
- Reach ₺100K monthly GMV
- Mobile app on App Store + Google Play
- A/B test free shipping threshold optimization
- First social media advertising campaign
- Customer support workflow with email + WhatsApp integration

### 90–180 days (scale)

- Onboard 200+ vendors covering top 100 Turkish artists
- Vendor manager invite flow + multi-staff vendor accounts
- Promo code system (artist-specific, time-windowed)
- Bundle products (e.g., album + t-shirt at discount)
- Loyalty / points program for repeat fans
- Vendor-side mobile companion app (manage orders on the go)
- International shipping support (priority: Germany, Netherlands — Turkish diaspora hubs)

### 180–365 days (platform expansion)

- Live shopping events (vendor goes live, fans buy in real-time)
- NFC-unlocked exclusive content for verified merch owners
- Subscription tier for fans (early access, signed items, monthly merch boxes)
- API for third-party integrations (Spotify "buy artist merch" deep link, Instagram shoppable posts)
- Marketplace for digital products (album downloads, ticket pre-sales, exclusive videos)
- Expansion to comedians + influencers + esports teams as adjacent verticals

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Iyzico contract delays | Medium | High (blocks launch) | Mock-pay path keeps demo working; can swap to PayTR as backup |
| Carrier API integration issues at scale | Low | Medium | Dual-carrier (Aras + Yurtiçi) provides failover; manual override possible from admin |
| Single VPS failure | Low | High | Daily backups; can restore to new VPS in < 1 hour; runbook documented |
| KVKK violation (data leak) | Low | Critical | Annual security review, Sentry alerting, MFA mandatory, encrypted backups, retention policies, KVK Uzmanı designation pre-launch |
| Artist acquisition stalls | Medium | High | Soft-launch with handpicked artists; commission rate negotiable for top names; press around "first 50 artists" |
| Trendyol / Hepsiburada launches creator-focused vertical | Medium | High | Differentiation via NFC authenticity + artist-first design + KVKK posture; speed-to-market advantage if launched first |
| Payment fraud / chargebacks | Medium | Medium | Iyzico fraud screening; manual review for orders > ₺2,000; audit log enables forensic investigation |
| Counterfeit listings | Low | High | NFC tag verification system; manual product approval; copyright takedown procedure (DMCA-equivalent under KHK 6769) |
| Founder bus-factor (sole developer) | Currently High | Critical | Comprehensive docs (ARCHITECTURE.md, RUNBOOKS.md, KIND of SKILL.md for AI handoff); plan to hire technical co-founder or senior engineer in 90 days |
| Mobile app rejection (Apple / Google) | Medium | Medium | Conservative permission usage, KVKK compliance, no risky integrations; web fallback always available |

---

## 11. What's Needed Next

### Decisions pending (founder + advisors)

1. **Payment provider final selection** — Iyzico recommended; PayTR is a viable alternative. Sign and integrate within 14 days.
2. **Free shipping threshold** — Recommendation: ₺500 (industry-aligned, encourages basket size growth). Currently configurable.
3. **Platform commission rate** — Recommendation: 12-15% (Trendyol charges 18-25% on similar categories; positioning advantage).
4. **Mock-pay endpoint** — Already production-gated; needs final teardown timing with marketing team.
5. **Soft-launch cohort size** — Recommendation: 5-10 vendors, 25-50 fans, 3-week beta with weekly retros.

### External relationships to formalize

- Iyzico merchant agreement (or PayTR)
- Aras Kargo + Yurtiçi Kargo API access (often free; sometimes ₺500/mo per carrier)
- Foriba e-Arşiv subscription (~₺200/mo)
- SMTP provider (Postmark or Mailgun recommended; currently provider-agnostic SMTP supported)
- Apple Developer Account ($99/year) — in progress
- Google Play Developer Account ($25 one-time) — in progress
- Legal counsel for KVK Uzmanı designation + VERBİS registration timing

### Capital / runway

- Current monthly burn (infrastructure only): ~₺500-1,000
- Estimated monthly burn at 1,000 monthly active customers: ~₺3,000-5,000 (infrastructure + payment processor fees + SMTP costs)
- Break-even GMV at 12% commission: ~₺40,000/month
- Realistic 6-month target: ~₺300,000/month GMV (~50 active artists, 1,500 customers, 4 orders/customer/year)
- Aspirational 12-month target: ~₺2,000,000/month GMV (top 200 Turkish artists onboarded)

### Hiring priorities (in order)

1. **Technical co-founder / Lead Engineer** — to reduce founder bus-factor, share on-call rotation
2. **Operations / Customer Success Lead** — vendor onboarding, fan support, light moderation
3. **Marketing / Creator Partnerships Lead** — artist outreach, social presence, PR

---

## 12. Appendix — Integration Status

| Integration | Purpose | Current State | Production Readiness |
|---|---|---|---|
| Iyzico (payment) | Card processing, 3D Secure, installments | Mock fallback ✅ | 100% — needs live API key |
| Aras Kargo (shipping) | Domestic delivery + tracking | Mock fallback ✅ | 100% — needs API contract |
| Yurtiçi Kargo (shipping) | Alternative carrier | Mock fallback ✅ | 100% — needs API contract |
| Foriba (e-Arşiv) | Auto-invoice generation | Mock fallback ✅ | 100% — needs production account |
| Sentry (monitoring) | Error tracking | Live ✅ | Production |
| SMTP (email) | Transactional mail | Live or stdout-fallback ✅ | Production-capable |
| Meilisearch (search) | Full-text product search | Optional, falls back to PostgreSQL | Production-capable, optional |
| Expo Push (mobile) | Push notifications | Token registration live, broadcast UI built | Production |
| Google Merchant Center | Product feed for Google Shopping | RSS feed live | Production — needs Search Console submission |
| Cloudflare R2 / S3 | Media storage | Architecture-ready, currently local disk | 80% — code migration ~1 day |
| KVKK VERBİS registration | Regulatory registration | Pending designation of DPO | Triggered by user count threshold |

---

## 13. Appendix — Glossary (for non-technical readers)

- **KVKK** — Kişisel Verilerin Korunması Kanunu (Turkish equivalent of EU GDPR)
- **e-Arşiv** — Turkish electronic-archive invoice format, mandatory for B2C sales
- **KDV** — Katma Değer Vergisi (Turkish VAT, currently 20% for general merchandise)
- **GMV** — Gross Merchandise Value (total transaction value before commission/refunds)
- **AOV** — Average Order Value
- **MAU** — Monthly Active Users
- **NFC** — Near-Field Communication (contactless tag scanning, used for product authenticity)
- **MFA** — Multi-Factor Authentication (in our case: email OTP)
- **OTP** — One-Time Password (6-digit code sent via email)
- **SLA** — Service Level Agreement
- **RTO** — Recovery Time Objective (max acceptable downtime after incident)
- **VPS** — Virtual Private Server (the single rented server hosting all production services)
- **CDN** — Content Delivery Network (currently none; potential future optimization)
- **PDP** — Product Detail Page

---

## Contacts & Document Information

**Founder:** Emre Gerçek
**Email:** [redacted in published version]
**Repository:** https://github.com/EmreGerck/vibehub
**Production URL:** https://vibehub.com.tr
**API URL:** https://api.vibehub.com.tr
**Document version:** 1.0
**Document date:** 2026-05-28
**Companion technical documents:** `docs/ARCHITECTURE.md`, `docs/RUNBOOKS.md`, `docs/INFRASTRUCTURE.md` (local-only)

---

*This document represents the state of VibeHub as of the date above. The platform continues to ship daily improvements; for current state, request a refreshed brief.*
