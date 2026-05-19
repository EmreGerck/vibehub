'use client';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Terms of Service / Kullanım Koşulları
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Effective date / Yürürlük tarihi: 1 Ocak 2026 — 1 January 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Platform Description / Platform Tanımı
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> MerchStage is an e-commerce marketplace connecting fans with artists, bands, and content creators for the purchase of official merchandise. MerchStage acts as an intermediary platform operator; individual vendors are responsible for the products they list and fulfil.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>TR:</strong> MerchStage, hayranları sanatçılar, gruplar ve içerik üreticileriyle resmi ürünler satın almaları için buluşturan bir e-ticaret pazaryeridir. MerchStage aracı platform işletmecisi olarak hareket eder; bireysel satıcılar listeledikleri ve yerine getirdikleri ürünlerden sorumludur.
            </p>
          </section>

          {/* Section 2 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. User Obligations / Kullanıcı Yükümlülükleri
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> By creating an account and using the platform, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Provide accurate, complete, and up-to-date registration information</li>
              <li>Be at least 18 years of age (or have parental/guardian consent) to make purchases</li>
              <li>Not engage in fraudulent activity, including chargebacks without a legitimate dispute</li>
              <li>Not use the platform to distribute spam, malware, or illegal content</li>
              <li>Keep your account credentials secure and not share them with third parties</li>
              <li>Comply with all applicable Turkish laws and regulations</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> Hesap oluşturarak ve platformu kullanarak şunları kabul etmiş olursunuz:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Doğru, eksiksiz ve güncel kayıt bilgileri sağlamak</li>
              <li>Satın alma yapmak için en az 18 yaşında olmak (veya ebeveyn/veli rızasına sahip olmak)</li>
              <li>Meşru bir itiraz olmaksızın geri ödeme talebi dahil dolandırıcılık faaliyetlerine katılmamak</li>
              <li>Platformu spam, zararlı yazılım veya yasadışı içerik dağıtmak için kullanmamak</li>
              <li>Hesap bilgilerinizi güvende tutmak ve üçüncü taraflarla paylaşmamak</li>
              <li>Geçerli tüm Türk yasa ve yönetmeliklere uymak</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Vendor Obligations / Satıcı Yükümlülükleri
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> Vendors who list products on MerchStage agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Provide accurate, complete, and non-misleading product descriptions, images, and pricing</li>
              <li>Hold all necessary rights and licences to sell the listed products</li>
              <li>Fulfil confirmed orders within the timeframes communicated to buyers</li>
              <li>Comply with applicable consumer protection laws, including the right of withdrawal</li>
              <li>Maintain adequate stock levels or promptly notify MerchStage of stock shortages</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> MerchStage'de ürün listeleyen satıcılar şunları kabul eder:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Doğru, eksiksiz ve yanıltıcı olmayan ürün açıklamaları, görseller ve fiyatlandırma sağlamak</li>
              <li>Listelenen ürünleri satmak için gerekli tüm haklara ve lisanslara sahip olmak</li>
              <li>Onaylanan siparişleri alıcılara bildirilen süreler içinde yerine getirmek</li>
              <li>Cayma hakkı dahil geçerli tüketici koruma yasalarına uymak</li>
              <li>Yeterli stok seviyelerini korumak veya stok eksiklikleri durumunda MerchStage'i derhal bilgilendirmek</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Right of Withdrawal / Cayma Hakkı
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> In accordance with Turkish Consumer Protection Law No. 6502 and the Distance Contracts Regulation:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Customers have the right to withdraw from a purchase within <strong>14 calendar days</strong> of receiving the goods, without providing any reason</li>
              <li>To exercise the right of withdrawal, customers must notify MerchStage at <a href="mailto:legal@merch.stage" className="text-purple-600 dark:text-purple-400 underline">legal@merch.stage</a> within the 14-day period</li>
              <li>The vendor must dispatch the replacement or refund within <strong>3 business days</strong> of the return being received and inspected</li>
              <li>Products that are personalised, made-to-order, or that have been unsealed (for hygiene reasons) may be exempt from the right of withdrawal where permitted by law</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Müşteriler, malı teslim aldıktan itibaren herhangi bir gerekçe göstermeksizin <strong>14 takvim günü</strong> içinde cayma hakkını kullanabilir</li>
              <li>Cayma hakkını kullanmak için müşterilerin 14 günlük süre içinde <a href="mailto:legal@merch.stage" className="text-purple-600 dark:text-purple-400 underline">legal@merch.stage</a> adresine bildirimde bulunması gerekmektedir</li>
              <li>Satıcı, iade teslim alındıktan ve incelendikten sonra <strong>3 iş günü</strong> içinde değişim veya iade işlemini gerçekleştirmekle yükümlüdür</li>
              <li>Kişiselleştirilmiş, sipariş üzerine üretilen veya hijyen gerekçesiyle açılmış ürünler, yasanın izin verdiği durumlarda cayma hakkı kapsamı dışında tutulabilir</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Dispute Resolution / Uyuşmazlık Çözümü
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> These Terms are governed by the laws of the Republic of Turkey. Any disputes arising from or related to these Terms or the use of the platform shall be submitted to the exclusive jurisdiction of the courts and execution offices of Istanbul (Çağlayan), Turkey.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>TR:</strong> Bu Kullanım Koşulları Türkiye Cumhuriyeti yasalarına tabidir. Bu Koşullardan veya platformun kullanımından kaynaklanan ya da bunlarla ilgili anlaşmazlıklar İstanbul (Çağlayan) mahkemeleri ve icra dairelerinin münhasır yargı yetkisine sunulacaktır.
            </p>
          </section>

          {/* Section 6 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Governing Law / Uygulanacak Hukuk
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> The governing law for these Terms of Service is the law of the Republic of Turkey, including but not limited to: Turkish Commercial Code (No. 6102), Consumer Protection Law (No. 6502), Electronic Commerce Law (No. 6563), and Personal Data Protection Law (No. 6698 — KVKK).
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>TR:</strong> Bu Kullanım Koşullarına uygulanacak hukuk Türkiye Cumhuriyeti hukukudur; bu kapsamda Türk Ticaret Kanunu (No. 6102), Tüketicinin Korunması Hakkında Kanun (No. 6502), Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (No. 6563) ve Kişisel Verilerin Korunması Kanunu (No. 6698 — KVKK) dahil ancak bunlarla sınırlı olmamak üzere.
            </p>
          </section>

          {/* Section 7 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Contact / İletişim
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> For legal enquiries, please e-mail{' '}
              <a href="mailto:legal@merch.stage" className="text-purple-600 dark:text-purple-400 underline">
                legal@merch.stage
              </a>
              .
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>TR:</strong> Hukuki talepler için lütfen{' '}
              <a href="mailto:legal@merch.stage" className="text-purple-600 dark:text-purple-400 underline">
                legal@merch.stage
              </a>{' '}
              adresine e-posta gönderin.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
