import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Destek & SSS',
  description: 'VibeHub destek merkezi. Sipariş takibi, iade, kargo ve hesap işlemleri hakkında sık sorulan sorular ve yardım rehberi.',
  alternates: { canonical: `${SITE_URL}/support` },
  openGraph: {
    title: 'Destek & SSS — VibeHub',
    description: 'Sipariş takibi, iade, kargo ve hesap işlemleri hakkında yardım alın.',
    url: `${SITE_URL}/support`,
    type: 'website',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
