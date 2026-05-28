import type { Metadata } from 'next';
import { JsonLd } from '../../../components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';

interface Props {
  children: React.ReactNode;
  params: { nickname: string };
}

async function fetchProfile(nickname: string) {
  try {
    const res = await fetch(`${API_BASE}/user-profile/${encodeURIComponent(nickname)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await fetchProfile(params.nickname);

  const title = profile?.nickname
    ? `@${profile.nickname} — VibeHub`
    : `@${params.nickname} — VibeHub`;
  const description = profile?.bio
    ? profile.bio.slice(0, 155)
    : `${title} profil sayfası. VibeHub'da hayran ve sanatçı topluluğuna katıl.`;
  const image = profile?.bannerUrl ?? profile?.avatarUrl ?? `${SITE_URL}/opengraph-image`;
  const absImage = image.startsWith('http')
    ? image
    : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  const pathTr = `${SITE_URL}/u/${params.nickname}`;

  // If profile is in ghost mode, advise crawlers not to index.
  const ghost = profile?.ghostMode === true;

  return {
    title,
    description,
    // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
    alternates: {
      canonical: pathTr,
      languages: {
        tr: pathTr,
        'tr-TR': pathTr,
        en: `${pathTr}?lang=en`,
        'x-default': pathTr,
      },
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: pathTr,
      siteName: 'VibeHub',
      locale: 'tr_TR',
      images: [{ url: absImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absImage],
    },
    robots: ghost
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function PublicProfileLayout({ children, params }: Props) {
  const profile = await fetchProfile(params.nickname);

  // ProfilePage / Person JSON-LD — only when profile exists & not ghosted.
  // Helps social SERP appearance for fan/community profiles.
  const personSchema = profile && !profile.ghostMode
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: `@${profile.nickname}`,
          ...(profile.bio ? { description: profile.bio.slice(0, 500) } : {}),
          ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
          url: `${SITE_URL}/u/${params.nickname}`,
        },
      }
    : null;

  return (
    <>
      {personSchema && <JsonLd data={personSchema} />}
      {children}
    </>
  );
}
