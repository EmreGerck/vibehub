'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApplyVendor } from '../../../hooks/useVendors';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { CodedErrorAlert } from '../../../components/ui/CodedErrorAlert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';
import { parseApiError, type ParsedApiError } from '../../../lib/error-codes';

export default function ApplyVendorPage() {
  const router = useRouter();
  const apply = useApplyVendor();
  const t = useI18n((s) => s.t);

  const ARTIST_TYPES = [
    { value: 'BAND', label: t('vendorApply.artistBand') },
    { value: 'COMEDIAN', label: t('vendorApply.artistComedian') },
    { value: 'INFLUENCER', label: t('vendorApply.artistInfluencer') },
    { value: 'ARTIST', label: t('vendorApply.artistVisual') },
    { value: 'OTHER', label: t('vendorApply.artistOther') },
  ];

  const [form, setForm] = useState({
    displayName: '',
    slug: '',
    artistType: '',
    bio: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    defaultFulfilment: 'VENDOR_MANAGED' as 'VENDOR_MANAGED' | 'VIBEHUB_MANAGED',
    // Honeypot — see register page for rationale
    website: '',
  });
  const [error, setError] = useState<ParsedApiError | string | null>(null);
  const [done, setDone] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setForm((f) => ({
        ...f,
        [field]: val,
        // Auto-generate slug from display name
        ...(field === 'displayName'
          ? { slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
          : {}),
      }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.ownerPassword !== form.confirmPassword) {
      setError(t('vendorApply.passwordsNoMatch'));
      return;
    }
    try {
      await apply.mutateAsync({
        displayName: form.displayName,
        slug: form.slug,
        artistType: form.artistType,
        bio: form.bio || undefined,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
        defaultFulfilment: form.defaultFulfilment,
        website: form.website,
      });
      setDone(true);
    } catch (err: any) {
      setError(parseApiError(err, t('vendorApply.somethingWentWrong')));
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold">{t('vendorApply.submitted')}</h1>
          <p className="text-gray-400">
            {t('vendorApply.pendingReview1')}{' '}
            <span className="text-white font-medium">{form.displayName}</span>{' '}
            {t('vendorApply.pendingReview2')}
          </p>
          <Link href="/auth/login" className="btn-primary inline-flex mt-4">
            {t('vendorApply.signInBtn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16 bg-surface">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              VibeHub
            </span>
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{t('vendorApply.openStore')}</h1>
          <p className="mt-2 text-gray-400">
            {t('vendorApply.applyDesc')}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — see register page for rationale */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="vendor-website">Your website (leave blank)</label>
              <input
                id="vendor-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>

            {error && (typeof error === 'string'
              ? <Alert type="error" message={error} />
              : <CodedErrorAlert error={error} />)}

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('vendorApply.storeDetails')}
              </p>
              <div className="h-px bg-surface-border" />
            </div>

            <Input
              label={t('vendorApply.storeName')}
              placeholder={t('vendorApply.storeNamePlaceholder')}
              value={form.displayName}
              onChange={set('displayName')}
              required
            />

            <div>
              <Input
                label={t('vendorApply.storeSlug')}
                placeholder={t('vendorApply.slugPlaceholder')}
                value={form.slug}
                onChange={set('slug')}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('vendorApply.slugHint')}<span className="text-gray-300">{form.slug || t('vendorApply.yourSlug')}</span>
              </p>
            </div>

            <Select
              label={t('vendorApply.artistType')}
              options={ARTIST_TYPES}
              placeholder={t('vendorApply.selectCategory')}
              value={form.artistType}
              onChange={set('artistType')}
              required
            />

            <div>
              <label className="label">{t('vendorApply.bio')}</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={t('vendorApply.bioPlaceholder')}
                value={form.bio}
                onChange={set('bio')}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">{form.bio.length}/500</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="label">{t('vendorApply.fulfilmentTitle')}</label>
              <div className="grid grid-cols-1 gap-2">
                {(['VENDOR_MANAGED', 'VIBEHUB_MANAGED'] as const).map((mode) => {
                  const selected = form.defaultFulfilment === mode;
                  const titleKey = mode === 'VENDOR_MANAGED' ? 'vendorApply.fulfilmentVendor' : 'vendorApply.fulfilmentVibehub';
                  const descKey  = mode === 'VENDOR_MANAGED' ? 'vendorApply.fulfilmentVendorDesc' : 'vendorApply.fulfilmentVibehubDesc';
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, defaultFulfilment: mode }))}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selected
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-surface-border hover:border-brand-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                          selected ? 'border-brand-500 bg-brand-500' : 'border-gray-500'
                        }`}>
                          {selected && <div className="h-full w-full rounded-full bg-white scale-[0.35]" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{t(titleKey)}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{t(descKey)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">{t('vendorApply.fulfilmentHint')}</p>
            </div>

            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('vendorApply.ownerAccount')}
              </p>
              <div className="h-px bg-surface-border" />
            </div>

            <Input
              label={t('vendorApply.ownerEmail')}
              type="email"
              placeholder={t('vendorApply.ownerEmailPlaceholder')}
              value={form.ownerEmail}
              onChange={set('ownerEmail')}
              required
            />

            <Input
              label={t('vendorApply.ownerPassword')}
              type="password"
              placeholder={t('vendorApply.ownerPasswordPlaceholder')}
              value={form.ownerPassword}
              onChange={set('ownerPassword')}
              required
            />

            <Input
              label={t('vendorApply.confirmPassword')}
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              required
              error={
                form.confirmPassword && form.ownerPassword !== form.confirmPassword
                  ? t('vendorApply.doesNotMatch')
                  : undefined
              }
            />

            <button
              type="submit"
              disabled={apply.isPending}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {apply.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> {t('vendorApply.submitting')}
                </span>
              ) : (
                t('vendorApply.submit')
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t('vendorApply.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
            {t('vendorApply.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
