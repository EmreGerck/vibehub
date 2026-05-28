import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { JsonLd } from '../../components/seo/JsonLd';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  'https://vibehub.com.tr';

/**
 * /faq — long-form FAQ page with FAQPage JSON-LD schema.
 *
 * SEO purpose:
 *  - Compete for "VibeHub nedir", "sanatçı merch nedir", "KVKK iade" voice queries
 *  - Earn People Also Ask placement in SERP
 *  - Provide native `<details>` accordions (zero JS, crawlable text)
 *
 * Content covers: platform basics, ordering, payments, shipping, returns,
 * NFC merch, KVKK / account deletion. Mirrors the structured data exactly
 * so Google sees the same answers users see.
 */

const FAQS: { q: string; a: string }[] = [
  {
    q: 'VibeHub nedir?',
    a: 'VibeHub, Türkiye\'nin sanatçı merch pazaryeridir. Sanatçılar, gruplar, komedyenler ve içerik üreticileri resmi mağazalarını burada açar; hayranlar da onların resmi ürünlerini güvenle satın alır. Tüm satıcılar kimlik ve sahiplik doğrulamasından geçer — yalnızca orijinal ürünler satışta yer alır.',
  },
  {
    q: 'Sipariş verdikten sonra ne kadar sürede gelir?',
    a: 'Standart ürünler sipariş onayından sonra 1-3 iş günü içinde kargoya verilir. Türkiye genelinde Aras Kargo veya Yurtiçi Kargo ile 2-4 iş günü içinde teslim edilir. Ön sipariş ürünlerinde tahmini sevkiyat tarihi ürün sayfasında ayrıca belirtilir.',
  },
  {
    q: 'İade nasıl yapılır?',
    a: 'Ürünü teslim aldıktan sonra 14 gün içinde, hasarsız ve etiketleri sökülmemiş şekilde iade edebilirsiniz. Profil → Siparişlerim → "İade Talep Et" butonuyla otomatik bir iade kargo barkodu oluşturulur ve e-postanıza gönderilir. Hasarlı veya hatalı ürünlerde kargo ücretini VibeHub karşılar; fikir değişikliği durumunda kargo ücreti müşteriye aittir.',
  },
  {
    q: 'Kargo ücreti ne kadar?',
    a: 'Belirli bir tutarın üzerindeki siparişlerde ücretsiz kargo uygulanır; alt sınırın altındaki siparişlerde sabit kargo ücreti ödeme sayfasında gösterilir. Ön sipariş ürünleri için kargo ayrı hesaplanabilir — ürün sayfasındaki teslimat notlarını inceleyin.',
  },
  {
    q: 'Sanatçılarımdan nasıl haberdar olurum?',
    a: 'Sanatçınızın mağaza sayfasında "Takip Et" butonuna basarak yeni ürünler, etkinlikler ve özel koleksiyonlar için bildirim alabilirsiniz. Ayrıca bültenimize abone olarak Türkiye genelinde yeni çıkan resmi ürünleri ilk siz öğrenirsiniz.',
  },
  {
    q: 'NFC merch nedir?',
    a: 'NFC merch, içine gömülü NFC etiketi bulunan fiziksel ürünlerdir (örneğin tişört etiketi, baskılı kart). Telefonunuzu ürüne yaklaştırdığınızda sanatçının özel içeriğine (yeni şarkı, gizli kamera arkası, bilet linki) doğrudan ulaşırsınız. Her etiket benzersizdir ve sanatçı tarafından yönetilir.',
  },
  {
    q: 'KVKK kapsamında verilerim nasıl korunuyor?',
    a: 'VibeHub, 6698 sayılı KVKK ve GDPR ilkelerine uyar. Kişisel verileriniz yalnızca sipariş işleme, teslimat ve müşteri hizmetleri için kullanılır; üçüncü taraflarla pazarlama amacıyla paylaşılmaz. Kart bilgileriniz iyzico altyapısında saklanır — VibeHub sunucularında kart numarası bulunmaz. Detaylı bilgi için /kvkk sayfasını inceleyebilirsiniz.',
  },
  {
    q: 'Hesabımı nasıl silebilirim?',
    a: 'Profil → Hesap Ayarları → "Tehlikeli Bölge" alanından hesabınızı kalıcı olarak silebilirsiniz. Onay için şifrenizi girmeniz gerekir. Silme işlemi siparişlerinizi, profil bilgilerinizi ve tüm kişisel verilerinizi geri alınamaz şekilde kaldırır. Aktif siparişiniz varsa, önce siparişin tamamlanmasını beklemenizi öneririz.',
  },
  {
    q: 'Sipariş geçmişimi nasıl görürüm?',
    a: 'Giriş yaptıktan sonra Profil → Siparişlerim adımıyla tüm sipariş geçmişinize ulaşabilirsiniz. Her sipariş için sipariş numarası, durum (Beklemede / Onaylandı / Kargoda / Teslim Edildi), kargo takip numarası ve fatura/ön bilgilendirme dokümanı görüntülenir.',
  },
  {
    q: 'Hangi ödeme yöntemleri kabul ediliyor?',
    a: 'Tüm kredi kartları, banka kartları ve havale/EFT ile güvenli iyzico altyapısı üzerinden ödeme yapabilirsiniz. 3D Secure tüm işlemlerde aktiftir. Taksit seçenekleri ödeme sayfasında ilgili bankalara göre otomatik gösterilir.',
  },
  {
    q: 'Sanatçı olarak nasıl mağaza açabilirim?',
    a: '/vendors/apply sayfasından başvurunuzu doldurabilirsiniz. Ekibimiz başvurunuzu 2-5 iş günü içinde değerlendirir. Onaylandığında kendi mağazanızı yönetmeniz için kişisel bir Satıcı Paneliniz olur; ürünleri ekler, varyantlar (beden/renk) tanımlar ve siparişleri buradan yönetirsiniz. Platform komisyonu satış başına otomatik hesaplanır.',
  },
  {
    q: 'Faturamı nasıl alırım?',
    a: 'Sipariş tamamlandığında e-fatura veya e-arşiv fatura e-posta adresinize otomatik olarak gönderilir. Profil → Siparişlerim → ilgili sipariş üzerinden de tekrar indirebilirsiniz. Kurumsal fatura için sipariş öncesinde Çıkış (Checkout) ekranında vergi numaranızı girmeniz yeterlidir.',
  },
  {
    q: 'Ürün stokta yoksa ne yapabilirim?',
    a: 'Stokta olmayan bir ürün için ürün sayfasındaki "Stok Bildirimi" özelliği ile e-posta bildirimi alabilirsiniz. Sanatçı ürünü yeniden stoklarsa ya da yeni baskı yaparsa ilk siz haberdar olursunuz.',
  },
  {
    q: 'Sipariş iptali yapabilir miyim?',
    a: 'Sipariş henüz "Kargoya Verildi" durumuna geçmediyse, Profil → Siparişlerim → "Siparişi İptal Et" butonuyla iptal edebilirsiniz. Ödeme tutarı 3-10 iş günü içinde aynı ödeme yöntemine iade edilir. Kargoya verildikten sonra iptal yapılamaz; ürün teslim alındıktan sonra standart iade prosedürü uygulanır.',
  },
];

export const metadata: Metadata = {
  title: 'Sıkça Sorulan Sorular — VibeHub',
  description:
    'VibeHub hakkında en çok merak edilenler: sipariş, kargo, iade, ödeme yöntemleri, NFC merch ve KVKK. Tüm cevapları tek sayfada bulun.',
  // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
  alternates: {
    canonical: `${SITE_URL}/faq`,
    languages: {
      tr: `${SITE_URL}/faq`,
      'tr-TR': `${SITE_URL}/faq`,
      en: `${SITE_URL}/faq?lang=en`,
      'x-default': `${SITE_URL}/faq`,
    },
  },
  openGraph: {
    title: 'Sıkça Sorulan Sorular — VibeHub',
    description:
      'VibeHub hakkında en çok merak edilenler: sipariş, kargo, iade, ödeme, NFC merch ve KVKK.',
    url: `${SITE_URL}/faq`,
    siteName: 'VibeHub',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'VibeHub SSS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sıkça Sorulan Sorular — VibeHub',
    description: 'VibeHub hakkında en çok merak edilenler.',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'SSS', item: `${SITE_URL}/faq` },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  // mainEntity mirrors the visible accordion 1:1 — required by Google so the
  // structured data matches user-visible content (mismatched data = manual penalty).
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <header className="text-center mb-12">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-medium uppercase tracking-wider rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            Yardım Merkezi
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            VibeHub hakkında en çok merak edilenler — sipariş, kargo, iade, ödeme yöntemleri,
            NFC merch ve KVKK.
          </p>
        </header>

        {/* FAQ Accordion — native <details> for SEO (zero-JS, crawlable text) */}
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group card p-0 overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none text-left text-sm sm:text-base font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <span>{f.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        {/* Cross-links — extra entry points for crawlers + users who didn't find their answer */}
        <section className="mt-14 card p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Cevabını bulamadın mı?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Destek ekibimiz e-posta ile her zaman ulaşılabilir.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/support" className="btn-secondary px-5 py-2.5 text-sm">
              Destek Merkezi
            </Link>
            <Link href="/contact" className="btn-primary px-5 py-2.5 text-sm">
              İletişime Geç
            </Link>
          </div>
        </section>

        {/* Back link */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
          >
            &larr; Ana Sayfaya Dön
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
