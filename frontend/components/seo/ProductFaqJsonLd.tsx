/**
 * Product page FAQ JSON-LD
 * ─────────────────────────
 * Emits FAQPage schema with universal Turkish Q&A pairs. Google uses this
 * for People Also Ask placement + voice search. Adapts wording slightly
 * based on category (apparel asks about sizing, vinyl/CD doesn't, etc.).
 */

import { JsonLd } from './JsonLd';

interface Props {
  productTitle: string;
  vendorName: string;
  categorySlug?: string; // optional — used to swap in category-specific Q&A
  isPreOrder?: boolean;
}

interface QA { q: string; a: string }

function buildFaq({ productTitle, vendorName, categorySlug, isPreOrder }: Props): QA[] {
  const items: QA[] = [
    {
      q: `${productTitle} ürünü orijinal mi?`,
      a: `Evet. ${vendorName} resmi mağazasından satılan tüm ürünler %100 orijinal ve sanatçı onaylıdır. VibeHub yalnızca doğrulanmış sanatçı ve markaların ürünlerini satışa sunar.`,
    },
    {
      q: `${productTitle} kargo süresi ne kadar?`,
      a: isPreOrder
        ? `Bu ürün ön siparişe açıktır. Ön sipariş süreci sona erdikten sonra 5-10 iş günü içinde Aras Kargo veya Yurtiçi Kargo ile gönderilir.`
        : `Sipariş onayından sonra 1-3 iş günü içinde kargoya verilir. Türkiye genelinde Aras Kargo veya Yurtiçi Kargo ile 2-4 iş günü içinde teslim edilir.`,
    },
    {
      q: `İade ve değişim nasıl yapılır?`,
      a: `Ürünü teslim aldıktan sonra 14 gün içinde, hasarsız ve etiketleri sökülmemiş şekilde iade edebilirsiniz. Profil sayfasından "İade Talep Et" butonuyla otomatik iade kargo barkodu oluşturulur — kargo ücreti satıcı tarafından karşılanır.`,
    },
    {
      q: `Ödeme yöntemleri nelerdir?`,
      a: `Tüm kredi kartları, banka kartları ve havale/EFT ile güvenli iyzico altyapısı üzerinden ödeme yapabilirsiniz. 3D Secure tüm işlemlerde aktiftir.`,
    },
  ];

  // Apparel-specific size question
  if (!categorySlug || /tisort|hoodie|kapuson|sweat|giyim|apparel/i.test(categorySlug)) {
    items.push({
      q: `Bedeni nasıl seçmeliyim?`,
      a: `Ürün açıklamasında detaylı ölçü tablosu yer almaktadır. Normal kalıplıdır — kendi vücut ölçülerinize göre seçmenizi öneririz. Aramızda bir tereddütünüz olursa bir beden büyüğünü tercih edebilirsiniz.`,
    });
  }

  // Pre-order specific question
  if (isPreOrder) {
    items.push({
      q: `Ön sipariş nedir?`,
      a: `Ön sipariş, ürün henüz üretim/baskı aşamasındayken siparişinizi garanti altına almanızı sağlar. Üretim tamamlandığında ürününüz hemen kargoya verilir. Ön sipariş süreci içinde her zaman iptal edebilirsiniz.`,
    });
  }

  return items;
}

export function ProductFaqJsonLd(props: Props) {
  const faq = buildFaq(props);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return <JsonLd data={schema} />;
}
