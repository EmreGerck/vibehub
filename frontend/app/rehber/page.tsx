import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { JsonLd } from '../../components/seo/JsonLd';
import { TOPICS } from './topics';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Rehber & Keşfet — Sanatçı Merch Dünyası',
  description: 'Sanatçı merch nasıl alınır, hangi sanatçıların resmi ürünleri var, koleksiyon nasıl başlatılır? VibeHub rehber merkezinde keşfedin.',
  alternates: { canonical: `${SITE_URL}/rehber` },
  openGraph: {
    title: 'VibeHub Rehber — Sanatçı Merch Dünyası',
    description: 'Sanatçı merch ile ilgili tüm sorularınızın cevabı.',
    url: `${SITE_URL}/rehber`,
    type: 'website',
  },
};

export default function RehberIndexPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rehber', item: `${SITE_URL}/rehber` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <JsonLd data={breadcrumb} />
      <Navbar />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-medium uppercase tracking-wider rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            Rehber & Keşfet
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sanatçı Merch Dünyasını Keşfet
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Doğru ürünü nasıl seçersin, hangi sanatçının resmi koleksiyonu var, koleksiyon nasıl başlatılır? Hepsi burada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(TOPICS).map(([slug, t]) => (
            <Link
              key={slug}
              href={`/rehber/${slug}`}
              className="group card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-3xl mb-3">{t.emoji}</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {t.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {t.intro}
              </p>
              <span className="inline-flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 mt-4">
                Oku &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
