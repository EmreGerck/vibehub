'use client';

import { useState, useEffect } from 'react';
import { useMyVendorProfile, useUpdateMyVendorProfile } from '../../../../hooks/useVendors';
import { useI18n } from '../../../../lib/i18n';

export default function VendorProfilePage() {
  const { data: profile, isLoading } = useMyVendorProfile();
  const update = useUpdateMyVendorProfile();
  const t = useI18n((s) => s.t);

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    logoUrl: '',
    bannerUrl: '',
    brandColor: '#7c3aed',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? '',
        bio: (profile as any).bio ?? '',
        logoUrl: (profile as any).logoUrl ?? '',
        bannerUrl: (profile as any).bannerUrl ?? '',
        brandColor: (profile as any).brandColor ?? '#7c3aed',
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await update.mutateAsync({
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        logoUrl: form.logoUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
        brandColor: form.brandColor || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('vendor.profile.saveFailed'));
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
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('vendor.profile.title')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {t('vendor.profile.subtitle')}
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">{t('vendor.profile.saved')}</div>
      )}

      {/* Live Preview */}
      <section className="card overflow-hidden mb-8">
        <p className="text-xs font-semibold text-gray-400 px-4 pt-3 uppercase tracking-wider">{t('vendor.profile.preview')}</p>
        {/* Banner preview */}
        <div className="relative h-28 overflow-hidden mt-2">
          {form.bannerUrl ? (
            <img src={form.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: form.brandColor
                  ? `linear-gradient(135deg, ${form.brandColor} 0%, ${form.brandColor}99 100%)`
                  : `linear-gradient(135deg, #7C3AED 0%, #EC4899 60%, #F97316 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
          {/* Profile picture overlay */}
          <div className="absolute bottom-0 left-4 translate-y-1/2">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="Logo"
                className="h-16 w-16 rounded-xl border-3 border-white dark:border-gray-900 object-cover shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl border-3 border-white dark:border-gray-900 bg-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                {form.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        </div>
        <div className="pt-12 px-4 pb-4">
          <p className="font-bold text-gray-900 dark:text-white text-lg">{form.displayName || t('vendor.profile.namePlaceholder')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{form.bio || t('vendor.profile.bioPreview')}</p>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {t('vendor.profile.basicInfo')}
          </h2>
          <div>
            <label className="label">{t('vendor.profile.nameLabel')}</label>
            <input
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="input"
              maxLength={80}
              required
            />
          </div>
          <div>
            <label className="label">{t('vendor.profile.bioLabel')}</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className="input resize-none min-h-[100px]"
              maxLength={500}
              placeholder={t('vendor.profile.bioInputPlaceholder')}
            />
            <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500</p>
          </div>
        </section>

        {/* Media URLs */}
        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {t('vendor.profile.imageUrls')}
          </h2>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
            {t('vendor.profile.imageHint')}
          </div>
          <div>
            <label className="label">{t('vendor.profile.logoUrl')}</label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              className="input"
              placeholder="https://cdn.example.com/logo.jpg"
            />
            {form.logoUrl && (
              <div className="mt-2">
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-20 w-20 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
          <div>
            <label className="label">{t('vendor.profile.bannerUrl')}</label>
            <input
              type="url"
              value={form.bannerUrl}
              onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))}
              className="input"
              placeholder="https://cdn.example.com/banner.gif"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('vendor.profile.bannerHint')}
            </p>
            {form.bannerUrl && (
              <div className="mt-2">
                <img
                  src={form.bannerUrl}
                  alt="Banner preview"
                  className="w-full h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
        </section>

        {/* Brand Color */}
        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {t('vendor.profile.brandColor')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('vendor.profile.brandColorDesc')}
          </p>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="color"
                value={form.brandColor}
                onChange={e => setForm(f => ({ ...f, brandColor: e.target.value }))}
                className="sr-only"
                id="brand-color-picker"
              />
              <label
                htmlFor="brand-color-picker"
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className="h-12 w-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-110"
                  style={{ background: form.brandColor }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('vendor.profile.chooseColor')}</p>
                  <p className="text-xs text-gray-400 font-mono">{form.brandColor}</p>
                </div>
              </label>
            </div>
            {/* Quick preset colors */}
            <div className="flex gap-2 flex-wrap">
              {['#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0284c7', '#dc2626', '#0f172a'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, brandColor: c }))}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.brandColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          {/* Color preview strip */}
          <div
            className="h-10 rounded-xl transition-all"
            style={{ background: `linear-gradient(135deg, ${form.brandColor} 0%, ${form.brandColor}88 100%)` }}
          />
        </section>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={update.isPending} className="btn-primary px-8 py-2.5">
            {update.isPending ? t('admin.saving') : t('admin.save')}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">{t('vendor.profile.savedShort')}</span>}
        </div>
      </form>
    </div>
  );
}
