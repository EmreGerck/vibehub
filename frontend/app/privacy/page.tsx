'use client';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Privacy Policy / Gizlilik Politikası
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Effective date / Yürürlük tarihi: 1 Ocak 2026 — 1 January 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Data We Collect / Topladığımız Veriler
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> MerchStage collects the following categories of personal data:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Identity data: name, surname, date of birth</li>
              <li>Contact data: e-mail address, phone number</li>
              <li>Order history: products purchased, order amounts, shipping addresses</li>
              <li>Browsing behaviour: pages visited, products viewed, click-through events (via cookies)</li>
              <li>Payment reference data: masked card information provided by our payment processor</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> MerchStage aşağıdaki kişisel veri kategorilerini toplamaktadır:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Kimlik verileri: ad, soyad, doğum tarihi</li>
              <li>İletişim verileri: e-posta adresi, telefon numarası</li>
              <li>Sipariş geçmişi: satın alınan ürünler, sipariş tutarları, teslimat adresleri</li>
              <li>Gezinti davranışı: ziyaret edilen sayfalar, görüntülenen ürünler, tıklama olayları (çerezler aracılığıyla)</li>
              <li>Ödeme referans verileri: ödeme işlemcimiz tarafından sağlanan maskelenmiş kart bilgileri</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Purpose of Processing / İşleme Amaçları
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> We process your personal data for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Fulfilling orders and coordinating shipping with vendors</li>
              <li>Managing your user account and providing platform services</li>
              <li>Sending transactional e-mails (order confirmations, shipping updates)</li>
              <li>Marketing communications — only where you have given explicit consent</li>
              <li>Fraud prevention and platform security</li>
              <li>Legal compliance and audit obligations</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> Kişisel verilerinizi aşağıdaki amaçlarla işlemekteyiz:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Siparişlerin yerine getirilmesi ve satıcılarla kargo koordinasyonu</li>
              <li>Kullanıcı hesabınızın yönetimi ve platform hizmetlerinin sağlanması</li>
              <li>İşlemsel e-postaların gönderilmesi (sipariş onayı, kargo bildirimleri)</li>
              <li>Pazarlama iletişimi — yalnızca açık rızanızın alındığı durumlarda</li>
              <li>Dolandırıcılık önleme ve platform güvenliği</li>
              <li>Yasal uyumluluk ve denetim yükümlülükleri</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Legal Basis / Hukuki Dayanak
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> Under the Turkish Personal Data Protection Law (KVKK), we rely on the following legal bases (Article 5):
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Explicit consent (Art. 5/1):</strong> for marketing communications and non-essential cookies</li>
              <li><strong>Contract performance (Art. 5/2-c):</strong> for order fulfilment, account management, and transactional communications</li>
              <li><strong>Legitimate interest (Art. 5/2-f):</strong> for fraud prevention, platform security, and service improvement analytics</li>
              <li><strong>Legal obligation (Art. 5/2-a):</strong> for compliance with Turkish commercial and tax law</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> 6698 sayılı KVKK kapsamında aşağıdaki hukuki dayanakları esas alıyoruz (Madde 5):
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Açık rıza (Md. 5/1):</strong> pazarlama iletişimi ve zorunlu olmayan çerezler için</li>
              <li><strong>Sözleşmenin ifası (Md. 5/2-c):</strong> sipariş yerine getirme, hesap yönetimi ve işlemsel iletişimler için</li>
              <li><strong>Meşru menfaat (Md. 5/2-f):</strong> dolandırıcılık önleme, platform güvenliği ve hizmet iyileştirme analizleri için</li>
              <li><strong>Kanuni yükümlülük (Md. 5/2-a):</strong> Türk ticaret ve vergi mevzuatına uyum için</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Data Retention / Veri Saklama Süreleri
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4 font-semibold text-gray-900 dark:text-white">Category / Kategori</th>
                    <th className="py-2 font-semibold text-gray-900 dark:text-white">Retention / Süre</th>
                  </tr>
                </thead>
                <tbody className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="py-2 pr-4">Order records / Sipariş kayıtları</td>
                    <td className="py-2">10 years — Turkish Commercial Code Art. 82 / Türk Ticaret Kanunu Md. 82</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Account data / Hesap verileri</td>
                    <td className="py-2">Until account deletion requested / Hesap silme talebine kadar</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Marketing consent / Pazarlama izni</td>
                    <td className="py-2">Until consent withdrawn / Rıza geri alınana kadar</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Cookie analytics / Çerez analizleri</td>
                    <td className="py-2">13 months / 13 ay</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Your Rights Under KVKK Art. 11 / KVKK Madde 11 Kapsamındaki Haklarınız
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> As a data subject you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Access:</strong> learn whether your personal data is being processed and request a copy</li>
              <li><strong>Rectification:</strong> request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> request deletion of your data where there is no longer a legal basis</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format</li>
              <li><strong>Object:</strong> object to processing based on legitimate interest, including profiling</li>
              <li><strong>Compensation:</strong> seek compensation for damages caused by unlawful processing</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              <strong>TR:</strong> Veri sahibi olarak aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Bilgi alma:</strong> kişisel verilerinizin işlenip işlenmediğini öğrenme ve kopyasını talep etme</li>
              <li><strong>Düzeltme:</strong> yanlış verilerin düzeltilmesini talep etme</li>
              <li><strong>Silme:</strong> hukuki dayanak kalmadığında verilerinizin silinmesini talep etme</li>
              <li><strong>Taşıma:</strong> verilerinizi yapılandırılmış, makine tarafından okunabilir formatta alma</li>
              <li><strong>İtiraz:</strong> meşru menfaat dahil profilleme amaçlı işlemeye itiraz etme</li>
              <li><strong>Tazminat:</strong> hukuka aykırı işleme nedeniyle uğranan zararların giderilmesini talep etme</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              To exercise your rights, contact us at:{' '}
              <a href="mailto:privacy@merch.stage" className="text-purple-600 dark:text-purple-400 underline">
                privacy@merch.stage
              </a>
            </p>
          </section>

          {/* Section 6 */}
          <section className="card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Contact / İletişim
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>EN:</strong> For all privacy-related enquiries, please e-mail{' '}
              <a href="mailto:privacy@merch.stage" className="text-purple-600 dark:text-purple-400 underline">
                privacy@merch.stage
              </a>
              . We aim to respond within 30 days.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>TR:</strong> Gizlilik ile ilgili tüm talepleriniz için lütfen{' '}
              <a href="mailto:privacy@merch.stage" className="text-purple-600 dark:text-purple-400 underline">
                privacy@merch.stage
              </a>{' '}
              adresine e-posta gönderin. 30 gün içinde yanıt vermeyi hedefliyoruz.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
