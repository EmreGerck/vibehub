'use client';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export default function KvkkPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              KVKK Aydınlatma Metni
            </h1>
            <p className="text-base text-gray-700 dark:text-gray-300">
              6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Aydınlatma Yükümlülüğünün Yerine Getirilmesi
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Yürürlük tarihi: 1 Ocak 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Veri Sorumlusunun Kimliği
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca veri sorumlusu sıfatıyla hareket eden kuruluş:
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-700 dark:text-gray-300 space-y-1">
              <p><strong>Ünvan:</strong> VibeHub / [Platform Operator]</p>
              <p><strong>Platform Adı:</strong> VibeHub</p>
              <p><strong>İletişim:</strong>{' '}
                <a href="mailto:kvkk@vibehub.com.tr" className="text-purple-600 dark:text-purple-400 underline">
                  kvkk@vibehub.com.tr
                </a>
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. İşlenen Kişisel Veri Kategorileri
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Platformumuz aşağıdaki kişisel veri kategorilerini işlemektedir:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Kimlik Verileri:</strong> Ad, soyad
              </li>
              <li>
                <strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası, teslimat adresi
              </li>
              <li>
                <strong>Müşteri İşlem Verileri:</strong> Sipariş geçmişi, satın alınan ürünler, iade ve şikayet kayıtları
              </li>
              <li>
                <strong>Pazarlama Verileri:</strong> Pazarlama tercihleri ve rıza kayıtları (yalnızca açık rıza alındığında)
              </li>
              <li>
                <strong>İşlem Güvenliği Verileri:</strong> IP adresi, tarayıcı bilgisi, oturum verileri
              </li>
              <li>
                <strong>Gezinti Davranışı:</strong> Ziyaret edilen sayfalar, görüntülenen ürünler (çerezler aracılığıyla — yalnızca onay verilmesi halinde)
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Kişisel Verilerin İşlenme Amaçları ve Hukuki Dayanakları
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4 font-semibold text-gray-900 dark:text-white">İşleme Amacı</th>
                    <th className="py-2 font-semibold text-gray-900 dark:text-white">Hukuki Dayanak (KVKK Md. 5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="py-2 pr-4">Sipariş yönetimi ve yerine getirme</td>
                    <td className="py-2">Sözleşmenin ifası (Md. 5/2-c)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Kullanıcı hesabı oluşturma ve yönetme</td>
                    <td className="py-2">Sözleşmenin ifası (Md. 5/2-c)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">İşlemsel e-posta bildirimleri</td>
                    <td className="py-2">Sözleşmenin ifası (Md. 5/2-c)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Pazarlama iletişimi</td>
                    <td className="py-2">Açık rıza (Md. 5/1)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Dolandırıcılık önleme ve güvenlik</td>
                    <td className="py-2">Meşru menfaat (Md. 5/2-f)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Yasal yükümlülüklerin yerine getirilmesi</td>
                    <td className="py-2">Kanuni yükümlülük (Md. 5/2-a)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Analitik çerezler</td>
                    <td className="py-2">Açık rıza (Md. 5/1)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Kişisel Verilerin Aktarıldığı Taraflar
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Kişisel verileriniz, yalnızca aşağıdaki durumlarda ve gerekli ölçüde üçüncü taraflarla paylaşılmaktadır:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Ödeme İşlemcileri (İyzico vb.):</strong> Güvenli ödeme işlemlerinin gerçekleştirilmesi amacıyla ad, sipariş tutarı ve fatura adresi; bu taraflar kendi PCI-DSS standartlarıyla verilerinizi işler
              </li>
              <li>
                <strong>Kargo Şirketleri:</strong> Sipariş teslimatının sağlanması amacıyla ad, teslimat adresi ve telefon numarası
              </li>
              <li>
                <strong>Platform Satıcıları (Vendor):</strong> Sipariş hazırlama ve müşteri iletişimi amacıyla ad ve sipariş detayları
              </li>
              <li>
                <strong>Bulut Altyapı Sağlayıcıları:</strong> Platform hizmetlerinin sunulması amacıyla; veriler Türkiye&apos;de veya yeterli koruma düzeyi sağlanan ülkelerde saklanır
              </li>
              <li>
                <strong>Yetkili Kamu Kurumları:</strong> Yasal yükümlülükler çerçevesinde zorunlu hallerde talep üzerine
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Kişisel Verilerin Toplanma Yöntemi
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Web Formları:</strong> Kayıt, giriş, ödeme ve adres formları aracılığıyla doğrudan tarafınızdan
              </li>
              <li>
                <strong>Çerezler ve Benzeri Teknolojiler:</strong> Zorunlu çerezler oturum yönetimi için her zaman aktiftir; analitik ve pazarlama çerezleri yalnızca onayınız alındıktan sonra devreye girer
              </li>
              <li>
                <strong>Otomatik Günlük Kayıtları:</strong> IP adresi, tarayıcı türü ve platforma erişim zamanı gibi teknik veriler sunucular tarafından otomatik olarak kaydedilir
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. KVKK Madde 11 Kapsamındaki Haklarınız
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              KVKK&apos;nın 11. maddesi uyarınca veri sahibi olarak aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
              <li>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>Düzeltme, silme ve yok etme işlemlerinin üçüncü kişilere bildirilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Haklarınızı Nasıl Kullanabilirsiniz?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Yukarıda belirtilen haklarınızı kullanmak için kimliğinizi doğrulayan belgelerle birlikte aşağıdaki kanaldan bize ulaşabilirsiniz:
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-700 dark:text-gray-300 space-y-1">
              <p>
                <strong>E-posta:</strong>{' '}
                <a href="mailto:kvkk@vibehub.com.tr" className="text-purple-600 dark:text-purple-400 underline">
                  kvkk@vibehub.com.tr
                </a>
              </p>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Talebiniz en geç <strong>30 gün</strong> içinde sonuçlandırılacaktır. Talebinizin reddedilmesi, yetersiz bulunması veya süresi içinde yanıt verilmemesi hâlinde Kişisel Verileri Koruma Kurulu&apos;na şikayette bulunma hakkınız saklıdır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
