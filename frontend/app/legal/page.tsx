import Link from 'next/link';
import type { Metadata } from 'next';
import LegalPageLayout from '../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Yasal Bilgiler',
  description: 'VibeHub yasal sözleşmeler, politikalar ve tüketici hakları.',
};

const DOCS = [
  {
    title: 'Mesafeli Satış Sözleşmesi',
    href: '/legal/mesafeli-satis',
    desc: 'Online sipariş sonrası yürürlüğe giren satış sözleşmesi (6502 sayılı kanun uyarınca).',
    icon: '📄',
  },
  {
    title: 'Ön Bilgilendirme Formu',
    href: '/legal/on-bilgilendirme',
    desc: 'Sipariş öncesinde tüketiciye sunulması zorunlu bilgiler.',
    icon: '📋',
  },
  {
    title: 'Cayma Hakkı',
    href: '/legal/cayma-hakki',
    desc: '14 günlük cayma hakkı, istisnalar ve iade bildirim formu.',
    icon: '↩️',
  },
  {
    title: 'İade ve İptal Koşulları',
    href: '/legal/iade-iptal',
    desc: 'Ürün iadesi, sipariş iptali ve ödeme iadesi süreçleri.',
    icon: '🔄',
  },
  {
    title: 'Satıcı Sözleşmesi',
    href: '/legal/satici-sozlesmesi',
    desc: 'VibeHub üzerinde satış yapmak isteyen iş ortaklarımız için.',
    icon: '🏪',
  },
  {
    title: 'Üyelik / Kullanım Sözleşmesi',
    href: '/terms',
    desc: 'Platform üyeliği ve kullanımına ilişkin genel hüküm ve koşullar.',
    icon: '📑',
  },
  {
    title: 'Gizlilik Politikası',
    href: '/privacy',
    desc: 'Kişisel verilerinizin nasıl işlendiğine dair şeffaflık metni.',
    icon: '🔒',
  },
  {
    title: 'KVKK Aydınlatma Metni',
    href: '/kvkk',
    desc: '6698 sayılı kanun kapsamında aydınlatma yükümlülüğümüz.',
    icon: '🛡️',
  },
];

export default function LegalIndexPage() {
  return (
    <LegalPageLayout title="Yasal Bilgiler" subtitle="VibeHub'da geçerli tüm sözleşme ve politikalar tek sayfada.">
      <p>
        Aşağıda VibeHub'ın yasal çerçevesini oluşturan tüm sözleşme ve politikaları bulabilirsiniz. Sipariş
        verirken, üye olurken veya satıcı başvurusu yaparken ilgili metinleri okumanız beklenir.
      </p>

      <div className="not-prose grid gap-4 sm:grid-cols-2 mt-6">
        {DOCS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="block rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-gray-50/40 dark:bg-gray-900/30 hover:border-purple-400 dark:hover:border-purple-700 transition-colors"
          >
            <p className="text-2xl mb-2">{doc.icon}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{doc.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{doc.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
        Bir konuda emin değilseniz <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a> üzerinden
        bize ulaşabilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
