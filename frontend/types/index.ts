export type UserRole =
  | 'CUSTOMER'
  | 'VENDOR_OWNER'
  | 'VENDOR_MANAGER'
  | 'PLATFORM_ADMIN'
  | 'GOD_USER';

export type ArtistType = 'BAND' | 'COMEDIAN' | 'INFLUENCER' | 'ARTIST' | 'OTHER';
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'REJECTED';
export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'LIVE' | 'ARCHIVED';
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';
export type ShipmentStatus = 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  createdAt: string;
}

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  artistType: ArtistType;
  status: TenantStatus;
  commissionRate: number;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  brandColor: string | null;
  // ── Feature toggles (god-user controlled) ─────────────────────────────────
  forumEnabled?: boolean;
  mediaEnabled?: boolean;
  eventsEnabled?: boolean;
  nfcEnabled?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  status: ProductStatus;
  images: string[];
  tags: string[];
  previewVideoUrl?: string | null;
  shippingNote?: string | null;
  imageSettings?: Record<string, { x: number; y: number }> | null;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  priceOverride: number | null;
  stockQty: number;
  lowStockThreshold: number;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  shippingAddress: ShippingAddress;
  paymentRef: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  tenantId: string;
  variantId: string;
  qty: number;
  unitPriceSnapshot: number;
  commissionRateSnapshot: number;
  vendorPayoutAmount: number;
  variant?: ProductVariant & { product?: Product };
  tenant?: Tenant;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Payout {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: PayoutStatus;
  createdAt: string;
}

export interface CartItem {
  variantId: string;
  tenantId: string;
  qty: number;
  product: {
    id: string;
    title: string;
    images: string[];
  };
  variant: {
    sku: string;
    attributes: Record<string, string>;
    priceOverride: number | null;
    price: number;
  };
  tenantDisplayName: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

// ─── Forum ────────────────────────────────────────────────────────────────────

export type ReactionEmoji = 'FIRE' | 'HEART' | 'CLAP' | 'EYES' | 'HUNDRED' | 'ROCKET';

export const REACTION_EMOJIS: { emoji: ReactionEmoji; label: string; icon: string }[] = [
  { emoji: 'FIRE', label: 'Fire', icon: '🔥' },
  { emoji: 'HEART', label: 'Love', icon: '❤️' },
  { emoji: 'CLAP', label: 'Clap', icon: '👏' },
  { emoji: 'EYES', label: 'Eyes', icon: '👀' },
  { emoji: 'HUNDRED', label: '100', icon: '💯' },
  { emoji: 'ROCKET', label: 'Rocket', icon: '🚀' },
];

export interface ForumSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  requireApproval: boolean;
  allowGuestView: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumChannel {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumAuthor {
  id: string;
  email: string;
  name: string | null;
  tenantId: string | null;
  avatarUrl?: string | null;
}

export interface ForumTopic {
  id: string;
  tenantId: string;
  channelId: string | null;
  authorId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  pinned: boolean;
  locked: boolean;
  viewCount: number;
  hasArtistReply: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ForumAuthor;
  channel?: Pick<ForumChannel, 'id' | 'name' | 'slug' | 'emoji'> | null;
  _count?: { replies: number; reactions: number };
  reactionCounts?: Record<ReactionEmoji, number>;
  myReactions?: ReactionEmoji[];
  isVendorPost?: boolean;
}

export interface ForumReply {
  id: string;
  topicId: string;
  authorId: string;
  body: string;
  imageUrl: string | null;
  parentReplyId: string | null;
  isArtistAnswer: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ForumAuthor;
  reactionCounts?: Record<ReactionEmoji, number>;
  myReactions?: ReactionEmoji[];
  isVendorPost?: boolean;
  childReplies?: ForumReply[];
}

// ─── Media Embeds ─────────────────────────────────────────────────────────────

export type MediaType = 'SPOTIFY' | 'YOUTUBE';

export interface VendorMedia {
  id: string;
  tenantId: string;
  type: MediaType;
  url: string;
  title: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventProvider = 'BILETINO' | 'BILETIX' | 'BILETINIAL' | 'OTHER';

export interface VendorEvent {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  href: string;
  provider: EventProvider;
  date: string;
  venue: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── NFC Tags ─────────────────────────────────────────────────────────────────

export interface NfcTag {
  id: string;
  name: string;
  staticUrl: string;
  destinationUrl: string;
  enabled: boolean;
  scanCount: number;
  lastScannedAt: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Social Profiles ──────────────────────────────────────────────────────────

export interface UserSocialProfile {
  id: string;
  userId: string;
  nickname: string;
  bio: string | null;
  interests: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  ghostMode: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; role: string; createdAt: string };
}

export interface ProfileVisitor {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  visitedAt: string;
}

export interface Conversation {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
