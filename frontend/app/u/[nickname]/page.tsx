'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePublicProfile } from '../../../hooks/useSocialProfile';
import { useAuthStore } from '../../../store/auth.store';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';

function Avatar({ profile }: { profile: { nickname: string; avatarUrl?: string | null } }) {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.nickname}
        className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-white dark:border-gray-900 shadow-xl object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-white dark:border-gray-900 shadow-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl font-black text-white">
      {profile.nickname?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function PublicProfilePage() {
  const { nickname } = useParams<{ nickname: string }>();
  const { data: profile, isLoading, isError } = usePublicProfile(nickname);
  const user = useAuthStore((s) => s.user);
  const t = useI18n((s) => s.t);

  const isOwnProfile = user && profile && user.id === profile.userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />

      {isLoading && (
        <div className="flex-1 flex justify-center py-32"><Spinner size="lg" /></div>
      )}

      {isError && (
        <div className="flex-1 flex items-center justify-center text-center px-4 py-32">
          <div className="space-y-4">
            <p className="text-6xl">👤</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">Profile not found</p>
            <Link href="/" className="btn-primary inline-flex px-6 py-2.5">Go home</Link>
          </div>
        </div>
      )}

      {profile && (
        <>
          {/* Banner */}
          <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="banner"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-purple-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>

          {/* Profile card */}
          <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 -mt-16 relative z-10 pb-16">
            <div className="card p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="-mt-20 sm:-mt-24 shrink-0">
                  <Avatar profile={profile} />
                </div>
                <div className="flex-1 min-w-0 pt-0 sm:pt-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">@{profile.nickname}</h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('social.memberSince')} {new Date(profile.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isOwnProfile ? (
                        <Link href="/profile/social" className="btn-ghost text-sm px-4 py-2">{t('social.editProfile')}</Link>
                      ) : user ? (
                        <Link
                          href={`/messages/${profile.userId}`}
                          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {t('social.message')}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  )}

                  {profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {profile.interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
