import { VendorPermission } from '@prisma/client';

export const ALL_VENDOR_PERMISSIONS: VendorPermission[] = [
  VendorPermission.PRODUCT_CREATE,
  VendorPermission.PRODUCT_EDIT,
  VendorPermission.PRODUCT_DELETE,
  VendorPermission.PRODUCT_SUBMIT,
  VendorPermission.PRODUCT_PUBLISH_DIRECT,
  VendorPermission.VARIANT_MANAGE,
  VendorPermission.INVENTORY_EDIT,
  VendorPermission.ORDER_VIEW,
  VendorPermission.ORDER_FULFILL,
  VendorPermission.STOREFRONT_EDIT,
  VendorPermission.PAYOUT_REQUEST,
  VendorPermission.ANALYTICS_VIEW,
  VendorPermission.MANAGER_INVITE,
  VendorPermission.FORUM_MANAGE,
  VendorPermission.MEDIA_MANAGE,
];

export const DEFAULT_VENDOR_PERMISSIONS: VendorPermission[] = [
  VendorPermission.PRODUCT_CREATE,
  VendorPermission.PRODUCT_EDIT,
  VendorPermission.PRODUCT_DELETE,
  VendorPermission.PRODUCT_SUBMIT,
  VendorPermission.VARIANT_MANAGE,
  VendorPermission.INVENTORY_EDIT,
  VendorPermission.ORDER_VIEW,
  VendorPermission.ORDER_FULFILL,
  VendorPermission.STOREFRONT_EDIT,
  VendorPermission.PAYOUT_REQUEST,
  VendorPermission.ANALYTICS_VIEW,
  VendorPermission.MANAGER_INVITE,
  VendorPermission.FORUM_MANAGE,
];

export const PERMISSION_DESCRIPTIONS: Record<VendorPermission, string> = {
  PRODUCT_CREATE: 'Create new products (DRAFT status)',
  PRODUCT_EDIT: 'Edit own products',
  PRODUCT_DELETE: 'Delete own products',
  PRODUCT_SUBMIT: 'Submit drafts for admin review',
  PRODUCT_PUBLISH_DIRECT: 'Publish products to LIVE without admin review',
  VARIANT_MANAGE: 'Add, edit, delete product variants',
  INVENTORY_EDIT: 'Adjust stock quantities',
  ORDER_VIEW: 'View incoming orders',
  ORDER_FULFILL: 'Confirm + ship orders',
  STOREFRONT_EDIT: 'Edit store profile (name, bio, logo, banner)',
  PAYOUT_REQUEST: 'View and request payouts',
  ANALYTICS_VIEW: 'View revenue and order analytics',
  MANAGER_INVITE: 'Invite/manage VENDOR_MANAGER users for this store',
  FORUM_MANAGE: 'Manage forum settings, pin topics, and moderate discussions',
  MEDIA_MANAGE: 'Add and manage Spotify/YouTube media embeds on storefront',
};
