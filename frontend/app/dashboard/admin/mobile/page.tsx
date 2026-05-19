'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import type { ApiResponse, Product } from '../../../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeaturedDropValue {
  productId: string;
  until?: string;
}

interface AnnouncementBannerValue {
  text: string;
  color: string;
  active: boolean;
}

interface AppConfigMap {
  featured_drop?: FeaturedDropValue;
  announcement_banner?: AnnouncementBannerValue;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useAppConfig() {
  return useQuery({
    queryKey: ['admin-app-config'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AppConfigMap>>('/app-config');
      return res.data.data as AppConfigMap;
    },
  });
}

function useSetAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      await api.put(`/admin/app-config/${key}`, { value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-app-config'] }),
  });
}

function useLiveProducts() {
  return useQuery({
    queryKey: ['admin-live-products'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ data: Product[] }>>('/product', {
        params: { status: 'LIVE', limit: 200 },
      });
      // The product list endpoint wraps items in data.data
      const payload = res.data.data as any;
      const items: Product[] = Array.isArray(payload) ? payload : payload?.data ?? [];
      return items;
    },
  });
}

function usePushBroadcast() {
  return useMutation({
    mutationFn: async (body: { title: string; body: string }) => {
      await api.post('/admin/notifications/push-broadcast', body);
    },
  });
}

// ── Color presets ─────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: 'Yellow', value: '#F59E0B' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Green', value: '#22C55E' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </section>
  );
}

function SaveStatus({ saved, error }: { saved: boolean; error: string }) {
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (saved) return <p className="text-sm text-green-600 dark:text-green-400">Saved</p>;
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminMobilePage() {
  const { data: config, isLoading: configLoading } = useAppConfig();
  const { data: products = [], isLoading: productsLoading } = useLiveProducts();
  const setConfig = useSetAppConfig();
  const pushBroadcast = usePushBroadcast();

  // ── Featured drop state ───────────────────────────────────────────────────

  const [featuredProductId, setFeaturedProductId] = useState('');
  const [featuredUntil, setFeaturedUntil] = useState('');
  const [featuredSearch, setFeaturedSearch] = useState('');
  const [featuredSaved, setFeaturedSaved] = useState(false);
  const [featuredError, setFeaturedError] = useState('');

  // ── Announcement banner state ─────────────────────────────────────────────

  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerColor, setBannerColor] = useState('#F59E0B');
  const [bannerSaved, setBannerSaved] = useState(false);
  const [bannerError, setBannerError] = useState('');

  // ── Push notification state ───────────────────────────────────────────────

  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushSent, setPushSent] = useState(false);
  const [pushError, setPushError] = useState('');

  // Seed form values from config once loaded
  useEffect(() => {
    if (!config) return;

    const fd = config.featured_drop;
    if (fd) {
      setFeaturedProductId(fd.productId ?? '');
      setFeaturedUntil(fd.until ?? '');
    }

    const ab = config.announcement_banner;
    if (ab) {
      setBannerActive(ab.active ?? false);
      setBannerText(ab.text ?? '');
      setBannerColor(ab.color ?? '#F59E0B');
    }
  }, [config]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function saveFeaturedDrop() {
    setFeaturedError('');
    setFeaturedSaved(false);
    if (!featuredProductId) { setFeaturedError('Please select a product.'); return; }
    try {
      const value: FeaturedDropValue = { productId: featuredProductId };
      if (featuredUntil) value.until = featuredUntil;
      await setConfig.mutateAsync({ key: 'featured_drop', value });
      setFeaturedSaved(true);
      setTimeout(() => setFeaturedSaved(false), 3000);
    } catch (err: any) {
      setFeaturedError(err?.response?.data?.message ?? 'Failed to save');
    }
  }

  async function saveBanner() {
    setBannerError('');
    setBannerSaved(false);
    try {
      const value: AnnouncementBannerValue = { text: bannerText, color: bannerColor, active: bannerActive };
      await setConfig.mutateAsync({ key: 'announcement_banner', value });
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 3000);
    } catch (err: any) {
      setBannerError(err?.response?.data?.message ?? 'Failed to save');
    }
  }

  async function sendPush() {
    setPushError('');
    setPushSent(false);
    if (!pushTitle.trim()) { setPushError('Title is required.'); return; }
    if (!pushBody.trim()) { setPushError('Body is required.'); return; }
    try {
      await pushBroadcast.mutateAsync({ title: pushTitle, body: pushBody });
      setPushSent(true);
      setPushTitle('');
      setPushBody('');
      setTimeout(() => setPushSent(false), 4000);
    } catch (err: any) {
      setPushError(err?.response?.data?.message ?? 'Failed to send');
    }
  }

  // ── Filtered product list for featured drop dropdown ──────────────────────

  const filteredProducts = products.filter((p) =>
    !featuredSearch ||
    p.title.toLowerCase().includes(featuredSearch.toLowerCase()) ||
    p.id.includes(featuredSearch),
  );

  const currentFeaturedProduct = products.find((p) => p.id === featuredProductId);

  // ── Render ────────────────────────────────────────────────────────────────

  if (configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">

      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile App Controls</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage real-time content that the mobile app fetches on startup.
        </p>
      </div>

      {/* ── 1. Featured Drop ──────────────────────────────────────────────── */}
      <SectionCard
        title="Featured Drop"
        subtitle="Choose which product is shown as the hero card on the mobile home screen."
      >
        <div className="space-y-4">

          {currentFeaturedProduct && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              {currentFeaturedProduct.images?.[0] && (
                <img
                  src={currentFeaturedProduct.images[0]}
                  alt=""
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-200 truncate">
                  Currently featured: {currentFeaturedProduct.title}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                  {currentFeaturedProduct.tenant?.displayName ?? ''}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="label">Search products</label>
            <input
              type="text"
              value={featuredSearch}
              onChange={(e) => setFeaturedSearch(e.target.value)}
              placeholder="Type to filter live products…"
              className="input mb-2"
            />
            <label className="label">Select product</label>
            {productsLoading ? (
              <p className="text-sm text-gray-400">Loading products…</p>
            ) : (
              <select
                value={featuredProductId}
                onChange={(e) => setFeaturedProductId(e.target.value)}
                className="input"
              >
                <option value="">— Pick a product —</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.tenant?.displayName ? `(${p.tenant.displayName})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Feature until (optional)</label>
            <input
              type="datetime-local"
              value={featuredUntil}
              onChange={(e) => setFeaturedUntil(e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank to feature indefinitely.</p>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={saveFeaturedDrop}
              disabled={setConfig.isPending}
              className="btn-primary"
            >
              {setConfig.isPending ? 'Saving…' : 'Save Featured Drop'}
            </button>
            <SaveStatus saved={featuredSaved} error={featuredError} />
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Announcement Banner ────────────────────────────────────────── */}
      <SectionCard
        title="Announcement Banner"
        subtitle="App-wide dismissible banner shown at the top of every screen."
      >
        <div className="space-y-4">

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Banner active</span>
            <button
              type="button"
              onClick={() => setBannerActive((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                bannerActive ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                bannerActive ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Banner text</label>
              <span className="text-xs text-gray-400">{bannerText.length}/120</span>
            </div>
            <input
              type="text"
              maxLength={120}
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="e.g. New drop incoming — stay tuned!"
              className="input"
            />
          </div>

          <div>
            <label className="label">Banner color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBannerColor(preset.value)}
                  title={preset.label}
                  className={`w-9 h-9 rounded-lg border-2 transition-all ${
                    bannerColor === preset.value
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <span className="text-xs font-mono text-gray-500">{bannerColor}</span>
              </div>
            </div>
          </div>

          {bannerText && (
            <div
              className="px-4 py-2 rounded-lg text-white text-sm font-medium text-center"
              style={{ backgroundColor: bannerColor }}
            >
              {bannerText}
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={saveBanner}
              disabled={setConfig.isPending}
              className="btn-primary"
            >
              {setConfig.isPending ? 'Saving…' : 'Save Banner'}
            </button>
            <SaveStatus saved={bannerSaved} error={bannerError} />
          </div>
        </div>
      </SectionCard>

      {/* ── 3. Push Notification ─────────────────────────────────────────── */}
      <SectionCard
        title="Send Push Notification"
        subtitle="Broadcast a push notification to all users with registered devices."
      >
        <div className="space-y-4">

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Title</label>
              <span className="text-xs text-gray-400">{pushTitle.length}/50</span>
            </div>
            <input
              type="text"
              maxLength={50}
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="e.g. New drop just dropped!"
              className="input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Body</label>
              <span className="text-xs text-gray-400">{pushBody.length}/160</span>
            </div>
            <textarea
              maxLength={160}
              rows={3}
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="e.g. Check out the latest limited-edition merch from your favourite artist."
              className="input resize-none"
            />
          </div>

          <div>
            <label className="label">Target</label>
            <div className="input bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              All users
            </div>
            <p className="text-xs text-gray-400 mt-1">Targeted sends will be available in a future release.</p>
          </div>

          {pushSent && (
            <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              Push notification sent to all users with registered devices.
            </div>
          )}

          {pushError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {pushError}
            </div>
          )}

          <div className="pt-1">
            <button
              onClick={sendPush}
              disabled={pushBroadcast.isPending || !pushTitle.trim() || !pushBody.trim()}
              className="btn-primary"
            >
              {pushBroadcast.isPending ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
