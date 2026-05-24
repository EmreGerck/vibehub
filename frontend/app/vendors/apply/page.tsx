'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApplyVendor } from '../../../hooks/useVendors';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';

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
  });
  const [error, setError] = useState('');
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
    setError('');
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
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('vendorApply.somethingWentWrong'));
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
            {error && <Alert type="error" message={error} />}

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
