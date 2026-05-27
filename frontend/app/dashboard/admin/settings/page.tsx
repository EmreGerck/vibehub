'use client';

import { useState, useEffect } from 'react';
import { usePlatformSettings, useUpdatePlatformSettings, PlatformSettings } from '../../../../hooks/useAdmin';

type FormState = Omit<PlatformSettings, 'id' | 'updatedAt' | 'metaTitle' | 'metaDescription' | 'ogImageUrl' | 'twitterHandle' | 'facebookPixelId' | 'googleTagManagerId' | 'robotsTxt' | 'schemaOrgJson'>;

const DEFAULTS: FormState = {
  // Identity
  platformName: 'VibeHub',
  platformTagline: 'Your vibe, your stage.',
  supportEmail: 'support@vibehub.com.tr',
  supportPhone: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#7C3AED',
  darkModeDefault: false,
  // Commerce
  defaultCommissionRate: 15,
  currency: 'TRY',
  taxRate: 0,
  minProductPrice: 0,
  maxProductPrice: null,
  freeShippingThreshold: null,
  allowGuestCheckout: true,
  minPayoutAmount: 50,
  payoutSchedule: 'MANUAL',
  // Vendor
  vendorSignupsOpen: true,
  autoApproveVendors: false,
  maxProductsPerVendor: 100,
  productSubmissionsOpen: true,
  autoApproveProducts: false,
  // Content
  globalForumEnabled: true,
  requirePurchaseReview: false,
  autoApproveReviews: false,
  maxImagesPerProduct: 10,
  maxReviewLength: 2000,
  allowVideoUploads: true,
  // Security
  maxLoginAttempts: 5,
  sessionDurationHours: 24,
  requireEmailVerification: true,
  maintenanceMode: false,
  maintenanceMessage: "We'll be back shortly. Thanks for your patience!",
  // Notifications
  orderNotificationEmail: '',
  lowStockThreshold: 5,
  notifyVendorOnSale: true,
  notifyAdminOnVendorApply: true,
};

function Toggle({ value, onChange, danger }: { value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        value ? (danger ? 'bg-red-500' : 'bg-purple-600') : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function ToggleRow({ label, desc, value, onChange, danger }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1">
      <div className="mr-4">
        <p className={`text-sm font-medium ${danger && value ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {danger && value && '⚠️ '}{label}
        </p>
        {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <Toggle value={value} onChange={onChange} danger={danger} />
    </label>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
      <span className="text-xl">{icon}</span> {title}
    </h2>
  );
}

function NumberInput({ label, desc, value, onChange, min, max, step, suffix }: {
  label: string; desc?: string; value: number | null | undefined;
  onChange: (v: number | null) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min ?? 0}
          max={max}
          step={step ?? 1}
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
          className="input max-w-[160px]"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
      {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
    </div>
  );
}

function TextInput({ label, desc, value, onChange, type = 'text', placeholder }: {
  label: string; desc?: string; value: string | null | undefined;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="input"
        placeholder={placeholder}
      />
      {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULTS);

  useEffect(() => {
    if (settings) {
      setForm({
        platformName: settings.platformName,
        platformTagline: settings.platformTagline,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone ?? '',
        logoUrl: settings.logoUrl ?? '',
        faviconUrl: settings.faviconUrl ?? '',
        primaryColor: settings.primaryColor,
        darkModeDefault: settings.darkModeDefault,
        defaultCommissionRate: settings.defaultCommissionRate,
        currency: settings.currency,
        taxRate: settings.taxRate,
        minProductPrice: settings.minProductPrice,
        maxProductPrice: settings.maxProductPrice ?? null,
        freeShippingThreshold: settings.freeShippingThreshold ?? null,
        allowGuestCheckout: settings.allowGuestCheckout,
        minPayoutAmount: settings.minPayoutAmount,
        payoutSchedule: settings.payoutSchedule,
        vendorSignupsOpen: settings.vendorSignupsOpen,
        autoApproveVendors: settings.autoApproveVendors,
        maxProductsPerVendor: settings.maxProductsPerVendor,
        productSubmissionsOpen: settings.productSubmissionsOpen,
        autoApproveProducts: settings.autoApproveProducts,
        globalForumEnabled: settings.globalForumEnabled,
        requirePurchaseReview: settings.requirePurchaseReview,
        autoApproveReviews: settings.autoApproveReviews,
        maxImagesPerProduct: settings.maxImagesPerProduct,
        maxReviewLength: settings.maxReviewLength,
        allowVideoUploads: settings.allowVideoUploads,
        maxLoginAttempts: settings.maxLoginAttempts,
        sessionDurationHours: settings.sessionDurationHours,
        requireEmailVerification: settings.requireEmailVerification,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        orderNotificationEmail: settings.orderNotificationEmail ?? '',
        lowStockThreshold: settings.lowStockThreshold,
        notifyVendorOnSale: settings.notifyVendorOnSale,
        notifyAdminOnVendorApply: settings.notifyAdminOnVendorApply,
      });
    }
  }, [settings]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    // Clean up empty string nullables
    const payload: Partial<FormState> = { ...form };
    (['supportPhone', 'logoUrl', 'faviconUrl', 'orderNotificationEmail'] as const).forEach(k => {
      if (payload[k] === '') (payload as any)[k] = null;
    });
    try {
      await update.mutateAsync(payload as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save settings');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Full control over every aspect of the platform.</p>
        {settings?.updatedAt && (
          <p className="text-xs text-gray-400 mt-1">Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">✓ Settings saved successfully</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Platform Identity ─────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="🏢" title="Platform Identity" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Platform Name" value={form.platformName} onChange={v => set('platformName', v)} />
            <TextInput label="Tagline" value={form.platformTagline} onChange={v => set('platformTagline', v)} placeholder="Your merch, your stage." />
            <TextInput label="Support Email" type="email" value={form.supportEmail} onChange={v => set('supportEmail', v)} />
            <TextInput label="Support Phone" value={form.supportPhone} onChange={v => set('supportPhone', v)} placeholder="+90 555 000 00 00" />
            <TextInput label="Logo URL" value={form.logoUrl} onChange={v => set('logoUrl', v)} placeholder="https://..." desc="Full URL to your logo image" />
            <TextInput label="Favicon URL" value={form.faviconUrl} onChange={v => set('faviconUrl', v)} placeholder="https://..." desc="32×32 or 64×64 icon" />
          </div>
          <div className="mt-4 flex items-end gap-6">
            <div>
              <label className="label">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => set('primaryColor', e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={e => set('primaryColor', e.target.value)}
                  className="input max-w-[120px] font-mono text-sm"
                  placeholder="#7C3AED"
                />
              </div>
            </div>
            <div className="pb-0.5">
              <ToggleRow label="Dark mode by default" value={form.darkModeDefault} onChange={v => set('darkModeDefault', v)} />
            </div>
          </div>
        </section>

        {/* ── Commerce ──────────────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="💰" title="Commerce" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NumberInput
              label="Commission Rate" suffix="%" value={form.defaultCommissionRate}
              onChange={v => set('defaultCommissionRate', v ?? 0)} min={0} max={100} step={0.5}
              desc="Applied to all vendors by default"
            />
            <div>
              <label className="label">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input">
                <option value="TRY">TRY — Turkish Lira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <NumberInput
              label="Tax Rate" suffix="%" value={form.taxRate}
              onChange={v => set('taxRate', v ?? 0)} min={0} max={100} step={0.5}
            />
            <NumberInput
              label="Min Product Price" value={form.minProductPrice}
              onChange={v => set('minProductPrice', v ?? 0)} min={0} step={0.01}
              desc="Vendors can't price below this"
            />
            <NumberInput
              label="Max Product Price" value={form.maxProductPrice}
              onChange={v => set('maxProductPrice', v)} min={0} step={0.01}
              desc="Leave blank for no cap"
            />
            <NumberInput
              label="Free Shipping Threshold" value={form.freeShippingThreshold}
              onChange={v => set('freeShippingThreshold', v)} min={0} step={1}
              desc="Order total for free shipping (blank = off)"
            />
            <NumberInput
              label="Min Payout Amount" value={form.minPayoutAmount}
              onChange={v => set('minPayoutAmount', v ?? 0)} min={0} step={1}
              desc="Minimum balance before a vendor can request payout"
            />
            <div>
              <label className="label">Payout Schedule</label>
              <select value={form.payoutSchedule} onChange={e => set('payoutSchedule', e.target.value)} className="input">
                <option value="MANUAL">Manual (admin triggers)</option>
                <option value="WEEKLY">Weekly (auto)</option>
                <option value="MONTHLY">Monthly (auto)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ToggleRow label="Allow guest checkout" desc="Customers can buy without registering" value={form.allowGuestCheckout} onChange={v => set('allowGuestCheckout', v)} />
          </div>
        </section>

        {/* ── Vendor Controls ───────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="🏪" title="Vendor Controls" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <NumberInput
              label="Max Products per Vendor" value={form.maxProductsPerVendor}
              onChange={v => set('maxProductsPerVendor', v ?? 100)} min={1}
            />
          </div>
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ToggleRow label="Vendor signups open" desc="Allow artists/brands to apply to the platform" value={form.vendorSignupsOpen} onChange={v => set('vendorSignupsOpen', v)} />
            <ToggleRow label="Auto-approve vendors" desc="New vendor applications go live immediately" value={form.autoApproveVendors} onChange={v => set('autoApproveVendors', v)} />
            <ToggleRow label="Product submissions open" desc="Allow vendors to submit new products" value={form.productSubmissionsOpen} onChange={v => set('productSubmissionsOpen', v)} />
            <ToggleRow label="Auto-approve products" desc="Products skip review and go live instantly" value={form.autoApproveProducts} onChange={v => set('autoApproveProducts', v)} />
          </div>
        </section>

        {/* ── Content & Reviews ─────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="📋" title="Content & Reviews" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <NumberInput
              label="Max Images per Product" value={form.maxImagesPerProduct}
              onChange={v => set('maxImagesPerProduct', v ?? 10)} min={1} max={50}
            />
            <NumberInput
              label="Max Review Length" suffix="chars" value={form.maxReviewLength}
              onChange={v => set('maxReviewLength', v ?? 2000)} min={100}
            />
          </div>
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ToggleRow label="Global forum enabled" desc="Vendor community forums available across the platform" value={form.globalForumEnabled} onChange={v => set('globalForumEnabled', v)} />
            <ToggleRow label="Require purchase to review" desc="Customers must have bought a product to review it" value={form.requirePurchaseReview} onChange={v => set('requirePurchaseReview', v)} />
            <ToggleRow label="Auto-approve reviews" desc="Reviews go live without admin moderation" value={form.autoApproveReviews} onChange={v => set('autoApproveReviews', v)} />
            <ToggleRow label="Allow video uploads" desc="Vendors can add MP4/WebM preview animations" value={form.allowVideoUploads} onChange={v => set('allowVideoUploads', v)} />
          </div>
        </section>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="🔒" title="Security" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <NumberInput
              label="Max Login Attempts" value={form.maxLoginAttempts}
              onChange={v => set('maxLoginAttempts', v ?? 5)} min={1} max={20}
              desc="Before account lockout"
            />
            <NumberInput
              label="Session Duration" suffix="hours" value={form.sessionDurationHours}
              onChange={v => set('sessionDurationHours', v ?? 24)} min={1}
            />
          </div>
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ToggleRow label="Require email verification" desc="New accounts must verify email before buying" value={form.requireEmailVerification} onChange={v => set('requireEmailVerification', v)} />
            <ToggleRow
              label="Maintenance mode" desc="Takes the site offline for all non-admin users"
              value={form.maintenanceMode} onChange={v => set('maintenanceMode', v)} danger
            />
          </div>
          {form.maintenanceMode && (
            <div className="mt-3">
              <TextInput
                label="Maintenance message"
                value={form.maintenanceMessage}
                onChange={v => set('maintenanceMessage', v)}
                placeholder="We'll be back shortly."
                desc="Shown to visitors during maintenance"
              />
            </div>
          )}
        </section>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <section className="card p-6">
          <SectionHeader icon="🔔" title="Notifications" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <TextInput
              label="Order notification email"
              type="email"
              value={form.orderNotificationEmail}
              onChange={v => set('orderNotificationEmail', v)}
              placeholder="orders@yourdomain.com"
              desc="Receives a copy of every order notification (optional)"
            />
            <NumberInput
              label="Low stock threshold" suffix="units" value={form.lowStockThreshold}
              onChange={v => set('lowStockThreshold', v ?? 5)} min={0}
              desc="Alert when variant stock drops below this"
            />
          </div>
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ToggleRow label="Notify vendor on sale" desc="Vendor receives email when an order comes in" value={form.notifyVendorOnSale} onChange={v => set('notifyVendorOnSale', v)} />
            <ToggleRow label="Notify admin on vendor application" desc="Admin email when new vendor applies" value={form.notifyAdminOnVendorApply} onChange={v => set('notifyAdminOnVendorApply', v)} />
          </div>
        </section>

        <div className="flex items-center gap-4 pb-8">
          <button type="submit" disabled={update.isPending} className="btn-primary px-8 py-2.5">
            {update.isPending ? 'Saving…' : 'Save all settings'}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
