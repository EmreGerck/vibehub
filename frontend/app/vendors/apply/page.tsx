'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApplyVendor } from '../../../hooks/useVendors';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';

const ARTIST_TYPES = [
  { value: 'BAND', label: 'Band / Music Artist' },
  { value: 'COMEDIAN', label: 'Comedian' },
  { value: 'INFLUENCER', label: 'Influencer / Content Creator' },
  { value: 'ARTIST', label: 'Visual Artist' },
  { value: 'OTHER', label: 'Other' },
];

export default function ApplyVendorPage() {
  const router = useRouter();
  const apply = useApplyVendor();

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
      setError('Passwords do not match');
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
      setError(err?.response?.data?.message || 'Something went wrong');
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold">Application submitted!</h1>
          <p className="text-gray-400">
            Your store <span className="text-white font-medium">{form.displayName}</span> is now
            pending review. We'll email you when it's approved.
          </p>
          <Link href="/auth/login" className="btn-primary inline-flex mt-4">
            Sign in to your account
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
          <h1 className="mt-4 text-3xl font-bold">Open your store</h1>
          <p className="mt-2 text-gray-400">
            Apply to sell merchandise on VibeHub. We review applications within 24 hours.
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert type="error" message={error} />}

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Store Details
              </p>
              <div className="h-px bg-surface-border" />
            </div>

            <Input
              label="Store name"
              placeholder="e.g. The Rolling Tones"
              value={form.displayName}
              onChange={set('displayName')}
              required
            />

            <div>
              <Input
                label="Store URL slug"
                placeholder="rolling-tones"
                value={form.slug}
                onChange={set('slug')}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                vibehub.io/store/<span className="text-gray-300">{form.slug || 'your-slug'}</span>
              </p>
            </div>

            <Select
              label="Artist type"
              options={ARTIST_TYPES}
              placeholder="Select a category"
              value={form.artistType}
              onChange={set('artistType')}
              required
            />

            <div>
              <label className="label">Bio (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Tell fans a bit about you…"
                value={form.bio}
                onChange={set('bio')}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">{form.bio.length}/500</p>
            </div>

            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Owner Account
              </p>
              <div className="h-px bg-surface-border" />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="owner@yourbrand.com"
              value={form.ownerEmail}
              onChange={set('ownerEmail')}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.ownerPassword}
              onChange={set('ownerPassword')}
              required
            />

            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              required
              error={
                form.confirmPassword && form.ownerPassword !== form.confirmPassword
                  ? 'Does not match'
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
                  <Spinner size="sm" /> Submitting…
                </span>
              ) : (
                'Submit application'
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
