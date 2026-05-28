# VibeHub — Detailed Workflow Reference

> Screen-by-screen, state-by-state walkthrough of every user-facing flow.
>
> **Audience:** Product managers, UX designers, customer support, QA, executive deep-dives.
> **Last updated:** 2026-05-28
> **Companion docs:** `EXECUTIVE_BRIEF.md` (business framing), `ARCHITECTURE.md` (engineering reference)

---

## Table of Contents

1. [Fan Workflows](#fan-workflows)
   1. [Account creation + MFA enrollment](#11-account-creation--mfa-enrollment)
   2. [Login (existing user)](#12-login-existing-user)
   3. [Browse & discover](#13-browse--discover)
   4. [Purchase flow](#14-purchase-flow)
   5. [Post-purchase tracking](#15-post-purchase-tracking)
   6. [Refund request](#16-refund-request)
   7. [Social interactions](#17-social-interactions)
   8. [Forum participation](#18-forum-participation)
   9. [NFC tag scan (mobile only)](#19-nfc-tag-scan-mobile-only)
   10. [Account management & KVKK](#110-account-management--kvkk)
2. [Vendor Workflows](#vendor-workflows)
   1. [Vendor application](#21-vendor-application)
   2. [First-time setup after approval](#22-first-time-setup-after-approval)
   3. [Product creation](#23-product-creation)
   4. [Product editing + variants + inventory](#24-product-editing--variants--inventory)
   5. [Order fulfillment](#25-order-fulfillment)
   6. [Refund response](#26-refund-response)
   7. [Payout request](#27-payout-request)
   8. [Vendor analytics](#28-vendor-analytics)
   9. [Forum & community management](#29-forum--community-management)
3. [Admin Workflows](#admin-workflows)
   1. [Vendor approval](#31-vendor-approval)
   2. [Product approval](#32-product-approval)
   3. [Refund approval](#33-refund-approval)
   4. [Order intervention](#34-order-intervention)
   5. [Depot arrival confirmation](#35-depot-arrival-confirmation)
   6. [Payout management](#36-payout-management)
   7. [Hero banner curation](#37-hero-banner-curation)
   8. [NFC tag generation](#38-nfc-tag-generation)
   9. [Push broadcast](#39-push-broadcast)
   10. [Maintenance mode](#310-maintenance-mode)
   11. [Audit log review](#311-audit-log-review)

---

## Fan Workflows

### 1.1 Account creation + MFA enrollment

**Entry point:** `/auth/register` (linked from header "Üye Ol" button, footer, and any protected page redirect)

```
[Visitor]
   │
   ├─ Fills form: email, password, consent checkboxes
   │  - Terms acceptance (required by 6502 Sayılı Kanun)
   │  - Privacy/KVKK acceptance (required by KVKK)
   │  - Marketing consent (optional)
   │
   ▼
[POST /auth/register]
   │
   ├─ Validates email uniqueness
   ├─ bcrypt hashes password (cost 12)
   ├─ Creates User row with role=CUSTOMER
   ├─ Persists consent timestamps
   ├─ Issues access token (15 min) + refresh token (90 days)
   ├─ Sets httpOnly refresh cookie
   │
   ▼
[Auto-redirect to /]
   │
   └─ User is logged in immediately (no email verification step today;
      MFA enrollment is enforced at first sensitive action)
```

**Edge cases:**
- Existing email → 409 with localized "Bu e-posta zaten kayıtlı" message
- Weak password → frontend pre-validates; backend rejects < 8 chars with mixed case + digit
- Throttle: 10 registrations per minute per IP
- Honeypot field: if filled, request triggers `TRAP_ROUTE_HIT` audit + 200 OK (silent block)

---

### 1.2 Login (existing user)

**Entry point:** `/auth/login`

```
[Visitor]
   │
   ├─ Fills: email + password
   ├─ Optional: "Beni hatırla (cihazıma güven)"
   │
   ▼
[POST /auth/login/mfa]
   │
   ├─ Verifies email + bcrypt-compares password
   ├─ Checks account lockout state (5 fails / 15min → 1m → 5m → 15m → 1h escalation)
   ├─ Looks up trusted devices for this user
   │
   ├─[Device trusted?]
   │  │
   │  ├─ YES → bypass OTP, issue tokens, return user object
   │  │
   │  └─ NO → generate 6-digit OTP, send via email, return { challenge: <opaque-id> }
   │
   ▼ (if OTP path)
[/auth/verify with challenge]
   │
   ├─ User enters 6-digit code
   │
   ▼
[POST /auth/login/verify-otp]
   │
   ├─ Validates code (5-min TTL, max 5 attempts, 30s resend cooldown)
   ├─ Issues access + refresh tokens
   ├─ Optional: registers TrustedDevice (365 days)
   │
   ▼
[Auto-redirect to original destination OR /]
```

**Notifications fired:** `LOGIN_SUCCESS` audit log (or `LOGIN_FAILED` with reason).

**Resend OTP:** Button on `/auth/verify` page; throttled to 5/hour per IP + 30s in-memory cooldown.

**Account locked state:** Shows time remaining + support contact email.

---

### 1.3 Browse & discover

**Entry surfaces:**
- `/` — home page (hero banner + trending products + featured vendors + new arrivals)
- `/shop` — product catalog with filters
- `/shop/[category]` — category-pre-rendered SSG pages
- `/shop/tag/[tag]` — tag-filtered view
- `/store/[slug]` — vendor storefront with their products + media + events + forum
- `/search` (via header search palette) — Meilisearch or Prisma LIKE
- `/u/[nickname]` — public user profile
- `/rehber/[topic]` — content marketing articles
- `/faq` — frequently asked questions

**Browse-page state model:**

```
[/shop page state]
{
  page: 1 (URL param)
  pageSize: 12 (URL param)
  category: optional (URL param)
  tag: optional (URL param)
  search: optional (URL param)
  minPrice, maxPrice: optional (URL param)
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular'
}

[State changes trigger]
→ React Query refetch
→ URL params update via Next.js router
→ Browser back/forward respects filter history
```

**Result item interactions:**
- Click → `/product/[id]` PDP
- Heart icon → add to wishlist (auth required; if not logged in, save intent to localStorage and prompt login)
- Quick-add to cart (variant picker modal opens for products with variants)

---

### 1.4 Purchase flow

**Trigger:** "Sepete Ekle" on PDP, "Sepete Git" anywhere, OR direct visit to `/cart`.

```
[/cart]
   │
   ├─ Server-side cart loaded via GET /cart (persistent across devices)
   ├─ Line items: thumbnail + title + variant + qty selector + price + remove
   ├─ Subtotal + shipping placeholder + total preview
   │
   ▼ "Ödeme'ye Geç" button
   │
[/checkout]
   │
   ├─ Step 1: Shipping address
   │   - Pre-fills from user profile if present
   │   - Address book (saved addresses) — optional pick-from-list
   │   - Required: ad/soyad, telefon, adres satırı 1, ilçe, şehir, posta kodu
   │
   ├─ Step 2: Payment method selection
   │   - Iyzico (credit card with 3DS)
   │   - [Future: havale/EFT, BKM Express, Papara]
   │
   ├─ Step 3: Review + confirm
   │   - Final totals (subtotal + shipping + KDV + grand total)
   │   - Cargo carrier preview
   │   - Estimated delivery
   │   - Terms acceptance checkbox (per-order, for distance-contract law)
   │
   ▼ "Siparişi Onayla" button
   │
[POST /orders]
   │
   ├─ Server validates cart vs current stock (race-safe via updateMany guard)
   ├─ Creates Order row (status=PLACED)
   ├─ Creates OrderItem rows with priceSnapshot
   ├─ Decrements stock atomically
   ├─ Clears cart
   ├─ Triggers 3 emails in parallel (queued via BullMQ):
   │   - Customer: ORDER_CONFIRMATION
   │   - Admin: NEW_ORDER alert
   │   - Each vendor with items in order: VENDOR_NEW_ORDER (per-tenant slice)
   ├─ Sends push notification + in-app notification to customer
   │
   ▼
[/payment?orderId=xxx]
   │
   ├─ Server initiates Iyzico session
   ├─ Iframe loads with 3DS challenge if applicable
   ├─ User completes payment
   ├─ Iyzico POSTs to /payments/iyzico/callback (HMAC-signed)
   ├─ Backend verifies, updates Order to CONFIRMED, fires e-Arşiv invoice
   │
   ▼
[/order-confirmation/[id]]
   │
   ├─ Shows order summary + invoice download link
   ├─ Push notification: "Sipariş onaylandı!"
   └─ Vendor receives email; admin sees order in dashboard
```

**Failure modes:**
- Stock depletes mid-transaction → 400 "Stok yetersiz: 'Ürün X' — başka bir müşteri az önce son adetleri aldı" → cart updates, user can adjust
- Iyzico declines → user returned to /payment with error message + retry option
- Network failure post-payment → idempotency via Iyzico conversationId prevents double-charge

---

### 1.5 Post-purchase tracking

**Entry:** `/profile/orders` (list) → `/profile/orders/[id]` (detail)

```
[/profile/orders/[id]] state
{
  order: { id, status, totalAmount, items, shippingAddress, ... }
  shipment: { trackingNumber?, carrier?, events: [] }
  refundShipment: { returnBarcode?, status?, events: [] }
  invoice: { url? }
}

[Polling]
→ Every 5 min, calls GET /kargo/track/:trackingNumber
→ Updates carrier events array
→ Re-renders timeline

[Timeline component] shows:
  PLACED ─→ CONFIRMED ─→ SHIPPED ─→ IN_TRANSIT (events) ─→ DELIVERED
  (Each step has timestamp + actor — system or vendor or admin)
```

**Actions available per state:**

| Order state | Customer actions |
|---|---|
| PLACED | Cancel (within 1 hour, if not yet CONFIRMED) |
| CONFIRMED | (None — wait for shipment) |
| SHIPPED | View tracking events, contact vendor via DM |
| DELIVERED | Leave review, request refund (within 14 days per 6502 Sayılı Kanun) |
| REFUND_REQUESTED | View VH-RET barcode, see return shipment status |
| REFUNDED | View refund confirmation, original payment refunded |
| CANCELLED | (Terminal — no actions) |

---

### 1.6 Refund request

```
[/profile/orders/[id]]
   │
   ├─ Click "İade Talep Et" button (visible only if status=DELIVERED + within 14 days)
   │
   ▼
[Refund modal opens]
   │
   ├─ Reason dropdown: Ürün hatalı / Bedenle uyumsuz / Beklediğim gibi değildi / Yanlış ürün geldi / Diğer
   ├─ Free-text reason field (max 1000 chars, required)
   ├─ Optional: photo upload (future enhancement)
   │
   ▼ "Talep Gönder" button
   │
[PATCH /orders/my/:id/request-refund]
   │
   ├─ Validates: status=DELIVERED, within 14d, reason non-empty
   ├─ Updates order: status=REFUND_REQUESTED, refundReason, refundRequestedAt
   ├─ Generates VH-RET-XXXXXXXX barcode (8 hex chars)
   ├─ Creates ReturnShipment row (status=INITIATED, carrier=aras)
   ├─ Triggers:
   │   - Email customer: REFUND_REQUESTED with barcode + Aras branch instructions
   │   - Email customer: RETURN_BARCODE (separate email with printable barcode)
   │   - Email each vendor in order: VENDOR_REFUND_REQUEST (informational)
   │   - Push: "İade talebin alındı — kargo kodun hazır"
   │   - In-app: notification with barcode
   │   - Audit log: REFUND_REQUESTED
   │
   ▼
[Order detail page updates]
   │
   ├─ Banner: "İade talebin değerlendiriliyor"
   ├─ Return barcode displayed (printable)
   ├─ "Aras Kargo şubesine bırak" instructions
   ├─ Status timeline shows: INITIATED → DROPPED_OFF → IN_TRANSIT → ARRIVED_AT_DEPOT → COMPLETED
```

**Customer follow-through:**
1. Prints barcode → drops package at any Aras branch
2. Aras scans → ReturnShipment status updates to IN_TRANSIT (via kargo webhook if integrated; manual today)
3. Aras delivers to platform warehouse → admin confirms DEPOT_ARRIVED
4. Customer notified: "Paketin depomuza ulaştı, ekibimiz inceliyor"
5. Admin inspects + approves refund → Iyzico refund issued
6. Customer notified: "İaden onaylandı — paran 5-10 iş günü içinde kartına dönecek"
7. ReturnShipment status → COMPLETED, Order status → REFUNDED

---

### 1.7 Social interactions

**Profile page** (`/u/[nickname]`):
- Avatar, display name, bio, follower/following counts
- "Takip Et" button (auth required)
- "Mesaj Gönder" button (opens DM thread)
- Activity feed: reviews left, forum posts, recent purchases (privacy-gated)
- Ghost mode toggle: profile hidden from search + `noindex` meta tag

**Follow flow:**
- Click "Takip Et" → `POST /follows/:userId`
- Followed user notified (in-app + optional push)
- Appears in their "Takipçiler" list
- Triggers `FOLLOW_CREATED` audit log

**DM flow:**
- `/profile/messages` shows all conversations
- Click conversation → `/profile/messages/[userId]`
- Compose box at bottom + chronological message history
- New messages trigger push + in-app notification to recipient
- Read receipts via timestamp updates

**Profile visitors:**
- `/profile/visitors` shows who viewed your profile
- Mutual visibility: you see visitors, they see if you visited them
- Visits are anonymized for users in ghost mode

---

### 1.8 Forum participation

**Per-vendor forum:** Each vendor has optional forum (toggle in admin). Channels → Topics → Replies.

```
[/store/[slug]] → Forum tab
   │
   ▼
[Forum landing] — list of channels (e.g., "Genel", "Konser Anıları", "Ürün İncelemeleri")
   │
   ├─ Click channel → topic list
   ├─ Click topic → thread view (OP + replies)
   ├─ Reply box at bottom
   ├─ Emoji reactions (🔥 ❤️ 👏 👀 💯 🚀) on any post
   ├─ Report inappropriate content → notifies vendor moderator
```

**Vendor moderator** (`FORUM_MANAGE` permission):
- Create/edit/delete channels
- Pin / lock topics
- Delete spammy replies
- Configure: posting policy (all / verified-buyers-only / followers-only), moderation mode (post-moderation / pre-moderation)

---

### 1.9 NFC tag scan (mobile only)

```
[Mobile app] → Scan tab → tap NFC tag (back-of-phone)
   │
   ▼
[Phone reads NDEF record] → opens vibehub.com.tr/nfc/[tagId]
   │
   ▼
[Server 302 redirect]
   │
   ├─ Looks up tag in NfcTag table
   ├─ Increments scan count
   ├─ Logs scan event (with userId if authenticated)
   ├─ Redirects to tag.destinationUrl (product / vendor / external URL)
   │
   ▼
[User lands at destination]
   │
   └─ Future: NFC-unlocked content (e.g., signed photo gallery, exclusive forum channel)
```

---

### 1.10 Account management & KVKK

**`/profile/settings`** sections:

| Section | Actions |
|---|---|
| Profile | Change name, avatar, bio, nickname |
| Password | Change password (requires current + 2x new) |
| Sessions | List trusted devices + revoke individual or all |
| Notifications | Toggle email + push categories |
| Privacy | Ghost mode toggle, visibility settings, marketing consent toggle |
| Language | TR / EN selector |
| KVKK | "Verilerimi indir" (data export), "Hesabımı sil" (account deletion) |

**Account deletion flow:**
1. User clicks "Hesabımı sil"
2. Confirmation modal: requires typing nickname or email
3. If active orders (PLACED/CONFIRMED/SHIPPED) exist → blocked with explanation
4. On confirm → `DELETE /auth/account` runs transaction:
   - Orders/Reviews/Forum content → anonymized (customerId/authorId = NULL)
   - DMs, RefreshTokens, TrustedDevices, PageView, PushDevices, Follows, ProfileVisits, Notifications, Cart, Wishlist → purged
   - User row → anonymized (email/name/passwordHash nulled)
   - AuditLog → actorId set to NULL (forensics retained)
5. Browser redirected to / with logout
6. Confirmation email sent to original address

---

## Vendor Workflows

### 2.1 Vendor application

**Entry:** `/vendors/apply` (publicly accessible, linked from footer + "Sanatçı mısın?" CTA in vendor sections)

```
[Form fields]
  - storeName: Public display name
  - slug: URL-friendly identifier (validated against existing tenants)
  - email: Contact (also serves as Owner User email)
  - artistType: BAND / COMEDIAN / INFLUENCER / ARTIST / OTHER
  - bio: short description
  - logoUrl: optional (can add post-approval)
  - termsAcceptance: required
  - contactPhone: optional
   │
   ▼
[POST /vendors/apply]
   │
   ├─ Validates slug uniqueness
   ├─ Creates Tenant row (status=PENDING)
   ├─ Creates User row (role=VENDOR_OWNER, tenantId=newTenant.id)
   ├─ Grants DEFAULT_VENDOR_PERMISSIONS (13 of 15)
   ├─ ⏳ TODO: Email applicant confirmation
   ├─ ⏳ TODO: Email admin team
   │
   ▼
[Confirmation page]
   │
   └─ "Başvurun alındı! 1-3 iş günü içinde değerlendirip e-posta ile bilgi vereceğiz."
```

---

### 2.2 First-time setup after approval

```
[Admin approved vendor]
   │
   ├─ Vendor receives VENDOR_WELCOME email with login link
   │
   ▼
[Vendor logs in at /auth/login]
   │
   ├─ MFA OTP enforced (one-time, then optional trust)
   │
   ▼
[Auto-redirected to /dashboard/vendor]
   │
   ├─ ⏳ FUTURE: 4-step onboarding wizard
   │   1. Upload profile photo + banner
   │   2. Add first product (name, price, description)
   │   3. Upload first product image
   │   4. Submit for review
   │
   └─ Today: bare dashboard; vendor must self-navigate
```

---

### 2.3 Product creation

```
[/dashboard/vendor/products] → "+ Yeni Ürün" button
   │
   ▼
[Inline create form]
  - title (required, 2-120 chars)
  - description (required, 2-5000 chars)
  - price (required, > 0, TL)
  - currency (default TRY, frozen today)
  - tags (comma-separated)
  - categoryId (dropdown)
  - shippingNote (optional)
   │
   ▼ "Oluştur" button
   │
[POST /products]
   │
   ├─ Validates DTO (whitelist + forbidNonWhitelisted)
   ├─ Creates Product row (status=DRAFT, tenantId from auth context)
   ├─ Audit logs PRODUCT_CREATED
   ├─ Returns new product with id
   │
   ▼
[Vendor redirected to /dashboard/vendor/products/[id] editor]
   │
   └─ See section 2.4 for what's available next
```

---

### 2.4 Product editing + variants + inventory

**Editor page:** `/dashboard/vendor/products/[id]` — comprehensive, gated by `PRODUCT_EDIT` permission.

```
[Page layout — top to bottom]

┌─ Header ─────────────────────────────────────────────────┐
│  ← Back to products    [Status badge: DRAFT]              │
│  Product Title (read-only display)                        │
│  [Submit for Review] / [Publish Directly] (if permitted) │
└──────────────────────────────────────────────────────────┘

┌─ Basic Info (gated PRODUCT_EDIT) ────────────────────────┐
│  Disabled banner if status=LIVE/PENDING_REVIEW:           │
│  "Yayındaki ürünü düzenlemek için önce arşivle"          │
│                                                            │
│  - title (editable)                                        │
│  - description (textarea, editable)                        │
│  - price (editable)                                        │
│  - currency (read-only — TRY)                              │
│  - tags (comma-separated)                                  │
│  - category (dropdown)                                     │
│  - shippingNote                                            │
│  [Save Changes] button → PATCH /products/:id              │
└──────────────────────────────────────────────────────────┘

┌─ Images (gated PRODUCT_EDIT) ────────────────────────────┐
│  Grid of current images, each with [×] delete button      │
│  + File picker / drag-drop area                           │
│  Multi-file upload → POST /upload/image per file          │
│  Returns { url } → appended to product.images[]           │
│  Then PATCH /products/:id with new images array           │
│  Drag-to-reorder (optional)                                │
└──────────────────────────────────────────────────────────┘

┌─ Variants (gated VARIANT_MANAGE) ────────────────────────┐
│  Table:                                                   │
│  | SKU   | Color | Size | Price | Stock | Threshold | ⋯ │
│  | t-blk-s | Siyah | S | (varsayılan) | 5 | 2 | [✎][✗] │
│  | t-blk-m | Siyah | M | 55 | 0 (out) | 2 | [✎][✗] │
│  | + Add Variant                                          │
│                                                            │
│  Add form (inline or modal):                              │
│  - sku (required)                                          │
│  - attributes: { color, size, ... } (key-value pairs)     │
│  - priceOverride (optional — default to product price)    │
│  - stockQty                                                │
│  - lowStockThreshold (default 2)                          │
└──────────────────────────────────────────────────────────┘

┌─ Stock Adjustments (gated INVENTORY_EDIT) ───────────────┐
│  For each variant: current stock + [−1] [+1] buttons      │
│  Bulk: input field "+5" / "-3" → PATCH stock endpoint    │
└──────────────────────────────────────────────────────────┘

┌─ Danger Zone (gated PRODUCT_DELETE) ─────────────────────┐
│  [Archive Product] button                                 │
│  Confirmation modal requires typing product title          │
│  → PATCH /products/:id/archive → status=ARCHIVED         │
└──────────────────────────────────────────────────────────┘
```

**Status transitions:**
- `DRAFT` → `PENDING_REVIEW` (vendor clicks "Submit for Review")
- `DRAFT` → `LIVE` (vendor clicks "Publish Directly" — requires `PRODUCT_PUBLISH_DIRECT` opt-in permission)
- `PENDING_REVIEW` → `LIVE` (admin approves)
- `PENDING_REVIEW` → `ARCHIVED` (admin rejects with reason)
- `LIVE`/`PENDING_REVIEW` → `ARCHIVED` (vendor archives)
- `ARCHIVED` → `DRAFT` (vendor reactivates and edits)

---

### 2.5 Order fulfillment

```
[/dashboard/vendor/orders]
   │
   ├─ Tabs: PLACED | CONFIRMED | SHIPPED | DELIVERED | REFUND_REQUESTED | All
   ├─ Per row: order ID short, customer first name, items count, total, status badge
   ├─ Click row → expand or navigate to detail
   │
   ▼
[Order detail]
   │
   ├─ Customer info (name + address — masked email for privacy)
   ├─ Items with quantities + variants
   ├─ Total + commission breakdown
   │
   ├─ Actions (gated ORDER_FULFILL):
   │   1. "Onayla" button — order PLACED → CONFIRMED
   │      Triggers: customer email ORDER_CONFIRMED, push notification
   │
   │   2. "Kargoya Ver" button — opens shipment modal
   │      Modal fields:
   │       - Carrier: Aras / Yurtiçi / Other
   │       - Weight (kg) — for shipping cost
   │       - Description (e.g., "Beden L tişört")
   │       - Receiver address (pre-filled, editable for typo fixes)
   │      Submit → POST /kargo/shipments (creates Shipment row + carrier API call)
   │       - SUCCESS: order CONFIRMED → SHIPPED, customer notified, tracking emailed
   │       - FAILURE: error shown, order stays CONFIRMED, vendor can retry
   │
   │   3. "Müşteriye Mesaj" — opens DM thread (uses messages module)
```

---

### 2.6 Refund response

When a customer requests a refund:

```
[Vendor receives VENDOR_REFUND_REQUEST email]
   │
   ├─ Subject: "İade talebi — #ABCD1234"
   ├─ Body: customer name + reason + order detail link
   │
   ▼
[Vendor logs in → /dashboard/vendor/orders → REFUND_REQUESTED tab]
   │
   ├─ See request details
   ├─ Can DM customer for clarification
   │
   └─ NOTE: Vendor cannot approve/reject. Refund decisions are admin-gated
      to prevent vendor self-dealing. Vendor's role is informational only.
      Admin reviews via /dashboard/admin/orders refund alert banner.
```

---

### 2.7 Payout request

```
[/dashboard/vendor/payouts]
   │
   ├─ Gated PAYOUT_REQUEST permission
   ├─ Lists past payouts with status badges
   │  - PENDING (awaiting admin)
   │  - PROCESSING (admin started transfer)
   │  - PAID (settled)
   │  - FAILED (admin marked failed with reason)
   │
   ├─ "Ödeme Talep Et" button (top-right)
   │
   ▼ Click button
   │
[POST /payouts/request]
   │
   ├─ Server computes period: lastPayoutEnd (or tenant.createdAt) → now
   ├─ Validates: at least 1 DELIVERED order item exists in period
   │   - If zero, returns "Bu döneme ait teslim edilmiş sipariş bulunmuyor"
   ├─ Computes amounts:
   │   - gross = SUM(orderItem.unitPriceSnapshot * qty) for period
   │   - fee = gross * tenant.commissionRate
   │   - net = gross - fee
   ├─ Creates Payout row (status=PENDING)
   ├─ Audit logs PAYOUT_CREATED
   │
   ▼
[Vendor sees new row in list]
   │
   └─ "Talebin alındı — admin onayı bekliyor"
```

---

### 2.8 Vendor analytics

`/dashboard/vendor/analytics` — gated `ANALYTICS_VIEW`.

Charts shown:
- Revenue over time (last 30 days, line chart)
- Top-selling products (table, last 30d)
- Order status distribution (pie chart)
- Visitor traffic to store page (last 30d)
- Conversion rate (visitors → orders)
- Refund rate

Data sources: aggregated from Order + OrderItem + PageView tables.

---

### 2.9 Forum & community management

Gated `FORUM_MANAGE`.

**`/dashboard/vendor/forum`** sections:
- Channels: create, edit, delete, reorder
- Settings: moderation mode, posting policy, visibility (public/followers/private)
- Recent activity feed: see new topics + replies + reports

---

## Admin Workflows

### 3.1 Vendor approval

```
[/dashboard/admin/vendors]
   │
   ├─ Tab filter: PENDING / ACTIVE / FROZEN / REJECTED / All
   ├─ Search by name/slug/email
   ├─ Per row: store name, slug, email, status, applied at, [actions]
   │
   ▼ Click row → /dashboard/admin/vendors/[id]
   │
[Vendor detail]
   │
   ├─ Application info + initial owner email
   ├─ Status history
   ├─ Permission matrix (15 permissions toggleable — defaults granted on approve)
   ├─ Activity feed (orders, products, last login)
   │
   ├─ Actions (typed-confirmation required for destructive):
   │   - Approve (PENDING → ACTIVE) → triggers VENDOR_WELCOME email
   │   - Reject (PENDING → REJECTED) → captures reason
   │   - Freeze (ACTIVE → FROZEN) → temporarily disables vendor (no new orders)
   │   - Unfreeze (FROZEN → ACTIVE)
   │   - Suspend (rare — for severe policy violation)
   │
   └─ All actions audit-logged with ADMIN_VENDOR_* events
```

---

### 3.2 Product approval

```
[/dashboard/admin/products] → "Pending Review" tab
   │
   ├─ Click product → review modal or detail page
   ├─ See: title, description, images, variants, vendor info
   │
   ├─ Decision:
   │   - Approve → status LIVE, product appears on storefront
   │   - Reject → status DRAFT (or ARCHIVED), vendor sees rejection reason
   │
   └─ Audit log: ADMIN_PRODUCT_PUBLISHED or ADMIN_PRODUCT_UNPUBLISHED
```

---

### 3.3 Refund approval

```
[/dashboard/admin/orders]
   │
   ├─ Yellow alert banner at top: "X bekleyen iade talebi var"
   ├─ Click banner → filters to status=REFUND_REQUESTED
   │
   ▼
[Order row click → opens RefundReviewModal]
   │
   ├─ Customer reason displayed
   ├─ Return shipment status (INITIATED / DROPPED_OFF / IN_TRANSIT / ARRIVED)
   ├─ Order detail (items, total, vendor)
   │
   ├─ Decision:
   │   - Approve refund
   │     - Optional restock flag
   │     - Triggers: customer email REFUND_APPROVED, push, in-app notif
   │     - Iyzico refund call (if real payment integration live)
   │     - Order: REFUND_REQUESTED → REFUNDED
   │     - Audit: REFUND_APPROVED
   │
   │   - Reject refund
   │     - Required: note explaining why
   │     - Customer email REFUND_REJECTED with note
   │     - Order: stays REFUND_REQUESTED (customer can appeal or accept)
```

---

### 3.4 Order intervention

```
[/dashboard/admin/orders] → click any order
   │
   ├─ See all order detail (all vendors, all items)
   │
   ├─ Actions:
   │   - Cancel order (with restock) — for fraud or vendor-cannot-fulfill cases
   │   - Override status (rare — emergency intervention, audit-logs as critical)
   │   - View shipment history
   │   - Resend customer notification email
```

---

### 3.5 Depot arrival confirmation

When a return package arrives at the platform warehouse:

```
[Warehouse staff (or admin acting on warehouse report)]
   │
   ▼
[/dashboard/admin/orders] → REFUND_REQUESTED tab → click order
   │
   ├─ ReturnShipment status visible
   ├─ "Depoya Ulaştı" button
   │
   ▼
[PATCH /kargo/return/:orderId/arrived]
   │
   ├─ Optional admin note (e.g., "Ürün hasarlı geldi")
   ├─ Updates ReturnShipment: status=ARRIVED_AT_DEPOT, arrivedAtDepotAt=now
   ├─ Audit log: DEPOT_ARRIVAL_CONFIRMED
   ├─ Customer notified: "🏭 Paketin depomuza ulaştı"
   │
   └─ Now admin can proceed with refund approval (3.3) — depot arrival is
      a prerequisite for refund finalization
```

---

### 3.6 Payout management

```
[/dashboard/admin/payouts]
   │
   ├─ Tabs: PENDING (vendor requests) | PROCESSING (admin started) | PAID | FAILED | All
   ├─ Filter by vendor, date range
   │
   ▼ Click row
   │
[Payout detail]
   │
   ├─ Vendor, period, gross/fee/net amounts, item count
   ├─ Source orders (clickable to detail)
   │
   ├─ Actions:
   │   - Approve → PENDING → PROCESSING (admin commits to paying)
   │   - Mark Paid → PROCESSING → PAID (after bank transfer)
   │   - Mark Failed → with reason (e.g., "bank rejected, contact vendor")
   │   - Delete (only if not yet PAID)
   │
   └─ All audit-logged as PAYOUT_{status}
```

---

### 3.7 Hero banner curation

```
[/dashboard/admin/banners]
   │
   ├─ List of banners with thumbnail, sort order, active toggle, expiry
   │
   ├─ Create new banner:
   │   - Image upload (1920x600 recommended)
   │   - Heading, subtitle, description (TR + EN via translations)
   │   - Button text + URL
   │   - Sort order, active toggle, optional tenantId (artist-specific banner)
   │
   ├─ Edit / Toggle active / Delete (with confirmation)
   │
   └─ Audit: ADMIN_BANNER_CREATED / UPDATED / DELETED / TOGGLED
```

---

### 3.8 NFC tag generation

```
[/dashboard/admin/nfc-tags]
   │
   ├─ Bulk-generate dialog:
   │   - Quantity (1-10,000)
   │   - Optional: assign to vendor
   │   - Optional: pre-set destination URL pattern
   │
   ├─ Each tag has unique UID + writable NDEF URL
   │
   ├─ Per tag actions:
   │   - Assign to product (sets destinationUrl = /product/:id)
   │   - Reassign destination
   │   - View scan count + last scan
   │   - Reset count (for testing)
   │   - Revoke (returns 410 Gone on next scan)
   │
   └─ Export CSV of UIDs + destinations for physical labeling
```

---

### 3.9 Push broadcast

```
[/dashboard/admin/mobile]
   │
   ├─ Title input (max 65 chars — iOS notification limit)
   ├─ Body input (max 178 chars)
   │
   ▼ "Tüm Cihazlara Gönder" button
   │
[Typed-confirmation modal]
   │
   ├─ Input: type "GONDER" to confirm
   ├─ Warning: "Bu mesaj X cihaza gönderilecek. Geri alınamaz."
   │
   ▼ Confirm
   │
[POST /admin/notifications/push-broadcast]
   │
   ├─ Throttled: 5/hour per admin
   ├─ Sends to all PushDevice records (distinct userId)
   ├─ Audit-logged: ADMIN_PUSH_BROADCAST with title + body length
```

---

### 3.10 Maintenance mode

```
[/dashboard/admin/settings] → "Maintenance Mode" toggle
   │
   ├─ Enabling requires typed-confirmation "MAINTENANCE"
   ├─ Custom message field (shown to users during downtime)
   │
   ▼ Toggle ON
   │
[POST /admin/settings/maintenance]
   │
   ├─ Sets PlatformSettings.maintenanceMode = true
   ├─ Audit: PLATFORM_SETTINGS_UPDATE (critical)
   │
   ▼
[Frontend behavior]
   │
   ├─ Middleware checks setting on every request
   ├─ Non-admin users see /maintenance page with custom message
   ├─ Admin users still have full dashboard access
   │
   └─ Disable mode (no typed-confirm needed since it restores service)
```

---

### 3.11 Audit log review

```
[/dashboard/admin/audit-log]
   │
   ├─ Filters: action type, actor, target type, date range, severity
   ├─ Per row: timestamp, actor (with mask for deleted users), action,
   │   target, metadata snippet
   │
   ├─ Click row → detail modal with full JSON metadata
   │
   └─ Used for: forensic investigation, compliance audits, vendor disputes
```

**Daily security digest:**
- Cron 08:00 Istanbul time
- Emails all GOD_USER + PLATFORM_ADMIN
- Includes: critical events (account locked, admin reset, settings change),
  warning events (failed logins, payouts, refunds)
- Subject: "VibeHub güvenlik özeti — {date}"

---

## Cross-cutting: notification matrix

For each event, who gets notified and how:

| Event | Customer email | Customer push | Customer in-app | Vendor email | Admin email | Audit log |
|---|---|---|---|---|---|---|
| Registration | — | — | — | — | — | LOGIN_SUCCESS |
| Login failure (5x) | — | — | — | — | (daily digest) | ACCOUNT_LOCKED |
| Password reset request | ✅ | — | — | — | (daily digest) | PASSWORD_RESET |
| Order placed | ✅ ORDER_CONFIRMATION | ✅ | ✅ | ✅ VENDOR_NEW_ORDER | ✅ NEW_ORDER | ORDER_CREATED |
| Order CONFIRMED | ✅ ORDER_CONFIRMED | ✅ | ✅ | — | — | ORDER_STATUS_UPDATED |
| Order SHIPPED | ✅ SHIPMENT_NOTIFICATION | ✅ | ✅ | — | — | ORDER_STATUS_UPDATED |
| Order DELIVERED | ✅ ORDER_DELIVERED | ✅ | ✅ | — | — | ORDER_STATUS_UPDATED |
| Refund requested | ✅ REFUND_REQUESTED + RETURN_BARCODE | ✅ | ✅ | ✅ VENDOR_REFUND_REQUEST | (visible in queue) | REFUND_REQUESTED |
| Refund approved | ✅ REFUND_APPROVED | ✅ | ✅ | — | — | REFUND_APPROVED |
| Depot arrival | ✅ "paketin ulaştı" | ✅ | ✅ | — | — | DEPOT_ARRIVAL_CONFIRMED |
| Vendor approved | — | — | — | ✅ VENDOR_WELCOME | — | VENDOR_APPROVE |
| Vendor rejected | — | — | — | ⏳ TODO | — | VENDOR_UPDATED |
| Vendor applied | — | — | — | ⏳ TODO confirmation | ⏳ TODO admin alert | VENDOR_CREATED |
| Payout created | — | — | — | (in dashboard) | (in dashboard) | PAYOUT_CREATED |
| Payout PAID | — | — | — | ⏳ TODO | — | PAYOUT_PAID |
| Push broadcast | — | ✅ | ✅ | — | — | ADMIN_PUSH_BROADCAST |

**Legend:** ✅ implemented | ⏳ TODO (post-launch follow-up) | — not applicable

---

## Cross-cutting: permission matrix (vendor)

Default (granted on approval): 13 of 15 permissions
Opt-in (admin must grant): 2 of 15

| Permission | Default? | Gates what |
|---|---|---|
| PRODUCT_CREATE | ✅ | Create new product |
| PRODUCT_EDIT | ✅ | Edit existing product (title, price, images, etc.) |
| PRODUCT_DELETE | ✅ | Archive product |
| PRODUCT_SUBMIT | ✅ | Submit DRAFT for admin review |
| PRODUCT_PUBLISH_DIRECT | ⚠️ opt-in | Skip review, publish straight to LIVE |
| VARIANT_MANAGE | ✅ | Add/edit/delete variants |
| INVENTORY_EDIT | ✅ | Adjust stock per variant |
| ORDER_VIEW | ✅ | See incoming orders |
| ORDER_FULFILL | ✅ | Mark CONFIRMED → SHIPPED, create shipment |
| STOREFRONT_EDIT | ✅ | Edit store profile (logo, banner, bio) |
| PAYOUT_REQUEST | ✅ | View own payouts + request new |
| ANALYTICS_VIEW | ✅ | View vendor analytics page |
| MANAGER_INVITE | ✅ | (Reserved for future — invite VENDOR_MANAGER users) |
| FORUM_MANAGE | ✅ | Moderate forum (channels, topics, replies) |
| MEDIA_MANAGE | ⚠️ opt-in | Add Spotify/YouTube embeds to storefront |

---

*End of WORKFLOWS.md. For business framing, see EXECUTIVE_BRIEF.md. For engineering detail, see ARCHITECTURE.md.*
