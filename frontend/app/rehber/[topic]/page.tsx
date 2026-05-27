import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { JsonLd } from '../../../components/seo/JsonLd';
import { TOPICS } from '../topics';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props { params: { topic: string } }

export async function generateStaticParams() {
  return Object.keys(TOPICS).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = TOPICS[params.topic];
  if (!t) return { title: 'Rehber bulunamadı' };

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: { canonical: `${SITE_URL}/rehber/${params.topic}` },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      url: `${SITE_URL}/rehber/${params.topic}`,
      type: 'article',
    },
  };
}

async function getFeaturedVendors(filter?: 'BAND' | 'ARTIST' | 'COMEDIAN' | 'INFLUENCER') {
  if (!filter) return [];
  try {
    const res = await fetch(`${API_BASE}/vendors?limit=8&page=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json?.data?.items ?? []) as any[];
    return items.filter((v) => v.artistType === filter).slice(0, 6);
  } catch {
    return [];
  }
}

export default async function RehberTopicPage({ params }: Props) {
  const topic = TOPICS[params.topic];
  if (!topic) notFound();

  const vendors = await getFeaturedVendors(topic.vendorFilter);
  const url = `${SITE_URL}/rehber/${params.topic}`;

  // Article schema for editorial SEO + Article rich results
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: topic.title,
    description: topic.metaDescription,
    image: `${SITE_URL}/opengraph-image`,
    datePublished: '2025-01-01T00:00:00+03:00',
    dateModified: new Date().toISOString(),
    author: { '@type': 'Organization', name: 'VibeHub Editör' },
    publisher: {
      '@type': 'Organization',
      name: 'VibeHub',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'tr-TR',
  };

  // BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rehber', item: `${SITE_URL}/rehber` },
      { '@type': 'ListItem', position: 3, name: topic.title, item: url },
    ],
  };

  // FAQ schema — eligibility for People Also Ask
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: topic.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <Navbar />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Breadcrumb (visible) */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-purple-600 dark:hover:text-purple-400">Ana Sayfa</Link>
          {' / '}
          <Link href="/rehber" className="hover:text-purple-600 dark:hover:text-purple-400">Rehber</Link>
          {' / '}
          <span className="text-gray-700 dark:text-gray-300">{topic.title}</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <span className="text-5xl block mb-4">{topic.emoji}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            {topic.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            {topic.intro}
          </p>
        </header>

        {/* Body sections */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {topic.sections.map((section, idx) => (
            <section key={idx} className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {section.heading}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Featured vendors (if filter applies) */}
        {vendors.length > 0 && (
          <section className="mt-12 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Öne Çıkan Sanatçılar
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {vendors.map((v: any) => (
                <Link
                  key={v.id}
                  href={`/store/${v.slug}`}
                  className="card p-4 text-center hover:-translate-y-1 transition-transform"
                >
                  {v.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.logoUrl}
                      alt={v.displayName}
                      className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                    />
                  )}
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {v.displayName}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ visible block */}
        <section className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Sıkça Sorulan Sorular
          </h2>
          <div className="space-y-4">
            {topic.faq.map((item, idx) => (
              <div key={idx} className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 card p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800/50 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Hadi keşfetmeye başla
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Türkiye\'nin sevilen sanatçılarının resmi koleksiyonları VibeHub\'da.
          </p>
          <Link
            href="/shop"
            className="btn-primary inline-block"
          >
            Mağazaya Git
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}
