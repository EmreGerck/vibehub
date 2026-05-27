import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'VibeHub ile iletişime geçin. Sorularınız, önerileriniz veya satıcı başvurularınız için bize ulaşın.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'İletişim — VibeHub',
    description: 'VibeHub ile iletişime geçin. Sorularınız ve önerileriniz için bize ulaşın.',
    url: `${SITE_URL}/contact`,
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
