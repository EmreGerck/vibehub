'use client';

import { useState, useEffect } from 'react';
import { useMySocialProfile, useUpdateSocialProfile } from '../../../hooks/useSocialProfile';
import { toast } from '../../../store/toast.store';
import { Spinner } from '../../../components/ui/Spinner';

export default function SocialProfilePage() {
  const { data: profile, isLoading } = useMySocialProfile();
  const update = useUpdateSocialProfile();

  const [form, setForm] = useState({
    nickname: '',
    bio: '',
    interests: '',
    avatarUrl: '',
    bannerUrl: '',
    ghostMode: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        nickname: profile.nickname,
        bio: profile.bio ?? '',
        interests: profile.interests.join(', '),
        avatarUrl: profile.avatarUrl ?? '',
        bannerUrl: profile.bannerUrl ?? '',
        ghostMode: profile.ghostMode,
      });
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const interests = form.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await update.mutateAsync({
        nickname: form.nickname || undefined,
        bio: form.bio || undefined,
        interests,
        avatarUrl: form.avatarUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
        ghostMode: form.ghostMode,
      });
      toast('success', 'Profile updated!');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save profile');
    }
  }

  if (isLoading) return <div className="py-12 flex justify-center"><Spinner /></div>;

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Social Profile</h2>

      {/* Profile preview link */}
      {profile && (
        <a
          href={`/u/${profile.nickname}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:underline mb-6"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View public profile → vibehub.com.tr/u/{profile.nickname}
        </a>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label">Nickname</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
            <input
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              className="input pl-7"
              placeholder="yourname"
              pattern="[a-zA-Z0-9_\-]+"
              minLength={3}
              maxLength={30}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">3–30 chars, letters, numbers, _ and - only</p>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="input resize-none"
            rows={3}
            maxLength={500}
            placeholder="Tell people a bit about yourself…"
          />
          <p className="text-xs text-gray-500 mt-1">{form.bio.length}/500</p>
        </div>

        <div>
          <label className="label">Interests</label>
          <input
            value={form.interests}
            onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value }))}
            className="input"
            placeholder="music, concerts, vinyl, travel"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
        </div>

        <div>
          <label className="label">Avatar URL</label>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            className="input"
            placeholder="https://..."
          />
          {form.avatarUrl && (
            <img
              src={form.avatarUrl}
              alt="avatar preview"
              className="mt-2 h-16 w-16 rounded-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        <div>
          <label className="label">Banner URL</label>
          <input
            type="url"
            value={form.bannerUrl}
            onChange={(e) => setForm((f) => ({ ...f, bannerUrl: e.target.value }))}
            className="input"
            placeholder="https://..."
          />
          {form.bannerUrl && (
            <img
              src={form.bannerUrl}
              alt="banner preview"
              className="mt-2 w-full h-24 rounded-xl object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ghost mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Don't show your name in other people's "Who visited me" list</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, ghostMode: !f.ghostMode }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.ghostMode ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.ghostMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>

        <button type="submit" disabled={update.isPending} className="btn-primary mt-2">
          {update.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </>
  );
}
