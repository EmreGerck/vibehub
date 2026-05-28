import type { Metadata } from 'next';
import { JsonLd } from '../../components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Destek & SSS',
  description: 'VibeHub destek merkezi. Sipariş takibi, iade, kargo ve hesap işlemleri hakkında sık sorulan sorular ve yardım rehberi.',
  // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
  alternates: {
    canonical: `${SITE_URL}/support`,
    languages: {
      tr: `${SITE_URL}/support`,
      'tr-TR': `${SITE_URL}/support`,
      en: `${SITE_URL}/support?lang=en`,
      'x-default': `${SITE_URL}/support`,
    },
  },
  openGraph: {
    title: 'Destek & SSS — VibeHub',
    description: 'Sipariş takibi, iade, kargo ve hesap işlemleri hakkında yardım alın.',
    url: `${SITE_URL}/support`,
    siteName: 'VibeHub',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'Destek & SSS — VibeHub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destek & SSS — VibeHub',
    description: 'Sipariş takibi, iade, kargo ve hesap işlemleri hakkında yardım alın.',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

// FAQPage schema — mirrors the visible FAQ accordion. Eligible for Google's
// "People Also Ask" results + voice-search answers.
const SUPPORT_FAQ = [
  {
    q: 'Siparişimi nasıl takip edebilirim?',
    a: 'Profil sayfanızdan "Siparişlerim" bölümüne giderek siparişinizin durumunu ve kargo takip numarasını görebilirsiniz. Kargonuz yola çıktığında otomatik olarak Aras Kargo veya Yurtiçi Kargo entegrasyonu üzerinden anlık takip mümkündür.',
  },
  {
    q: 'İade ve değişim nasıl yapılır?',
    a: 'Ürünü teslim aldıktan sonra 14 gün içinde, hasarsız ve etiketleri sökülmemiş şekilde iade edebilirsiniz. Profil → Siparişlerim → "İade Talep Et" butonuyla otomatik bir iade kargo barkodu oluşturulur ve e-postanıza gönderilir. Kargo ücreti satıcı tarafından karşılanır.',
  },
  {
    q: 'Ödeme yöntemleri nelerdir?',
    a: 'Tüm kredi kartları, banka kartları ve havale/EFT ile güvenli iyzico altyapısı üzerinden ödeme yapabilirsiniz. 3D Secure tüm işlemlerde aktiftir, kart bilgileriniz VibeHub sunucularında saklanmaz.',
  },
  {
    q: 'Sanatçı olarak nasıl mağaza açabilirim?',
    a: '"Sanatçı Başvurusu" sayfasından (/vendors) başvurunuzu doldurabilirsiniz. Ekibimiz başvurunuzu 2-5 iş günü içinde değerlendirir. Onaylandığında kendi mağazanızı yönetmeniz için kişisel bir vendor paneliniz olur.',
  },
  {
    q: 'Kargo ne kadar sürede teslim edilir?',
    a: 'Standart ürünler sipariş onayından sonra 1-3 iş günü içinde kargoya verilir. Türkiye genelinde Aras Kargo veya Yurtiçi Kargo ile 2-4 iş günü içinde teslim edilir. Ön sipariş ürünlerinde tahmini sevkiyat tarihi ürün sayfasında belirtilir.',
  },
  {
    q: 'Ürünler orijinal mi?',
    a: 'Evet. VibeHub yalnızca doğrulanmış sanatçı ve markaların resmi ürünlerini satışa sunar. Tüm vendor başvuruları kimlik ve sahiplik kontrolünden geçer.',
  },
  {
    q: 'Hangi sanatçıların ürünleri var?',
    a: 'KALT, MODE XL, TEKİR ve büyüyen bir sanatçı listesi VibeHub\'da resmi mağaza açmıştır. Tüm aktif mağazaları /vendors sayfasında görebilirsiniz. Yeni sanatçılar düzenli olarak eklenmektedir.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SUPPORT_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqSchema} />
      {children}
    </>
  );
}
