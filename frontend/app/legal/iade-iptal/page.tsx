import type { Metadata } from 'next';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'İade ve İptal Koşulları',
  description: 'VibeHub üzerinden alınan ürünlerin iade ve sipariş iptal koşulları.',
};

export default function IadeIptalPage() {
  return (
    <LegalPageLayout
      title="İade ve İptal Koşulları"
      subtitle="VibeHub üzerinden satın alınan ürünlerin iade ve siparişlerin iptaline ilişkin kurallar."
      updated="24 Mayıs 2026"
    >
      <h2>1. Sipariş İptali</h2>

      <h3>1.1 Henüz Onaylanmamış Siparişler</h3>
      <p>
        Sipariş onaylanmadan (ödeme alınmadan veya satıcı onayı verilmeden) önce hesabınızdan "Siparişlerim"
        sayfası üzerinden ücretsiz iptal edebilirsiniz.
      </p>

      <h3>1.2 Onaylanmış / Hazırlanan Siparişler</h3>
      <p>
        Sipariş onaylanmış ancak kargoya verilmemişse, müşteri hizmetlerine{' '}
        <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a> üzerinden ulaşarak iptal talebinde
        bulunabilirsiniz. Tahsil edilen ödeme tutarı, talebin onayını takiben en geç 14 gün içinde aynı ödeme
        yöntemine iade edilir.
      </p>

      <h3>1.3 Kargoya Verilmiş Siparişler</h3>
      <p>
        Sipariş kargoya teslim edildikten sonra iptal işlemi yapılamaz; ancak teslim alınmadan iade yoluyla
        cayma hakkınızı kullanabilirsiniz. Detaylar için{' '}
        <a href="/legal/cayma-hakki">Cayma Hakkı sayfasına</a> bakınız.
      </p>

      <h3>1.4 Pre-Order (Ön Sipariş) İptalleri</h3>
      <div className="info-callout">
        Pre-order ürünler kargoya verilmeden önce her zaman ücretsiz olarak iptal edilebilir. Pre-order süreci
        boyunca sipariş durumunuzu "Siparişlerim" sayfasından takip edebilirsiniz.
      </div>

      <h2>2. İade Koşulları</h2>

      <h3>2.1 Genel Şartlar</h3>
      <ul>
        <li>İade edilecek ürünün, varsa <strong>orijinal kutusu, ambalajı, etiketleri ve aksesuarları</strong> ile birlikte gönderilmesi gerekmektedir.</li>
        <li>Ürünün kullanılmamış, hasarsız ve yeniden satışa uygun durumda olması beklenir.</li>
        <li>Ürün ile birlikte <strong>fatura</strong> (e-Arşiv veya kağıt) iade paketine eklenmelidir.</li>
        <li>İade talebi süresi (cayma hakkı): teslim tarihinden itibaren <strong>14 gün</strong>.</li>
        <li>Anlaşmalı kargo firması kullanıldığında <strong>iade kargo ücreti SATICI tarafından karşılanır</strong>.</li>
      </ul>

      <h3>2.2 İade Edilemeyecek Ürünler</h3>
      <p>Yasal mevzuat gereği aşağıdaki ürünler iade edilemez:</p>
      <ul>
        <li>İsim/logo baskılı, kişiselleştirilmiş veya tüketicinin isteği üzerine hazırlanan ürünler</li>
        <li>Tek kullanımlık veya hijyen gerektiren ürünlerin ambalajı açılmışsa</li>
        <li>Dijital olarak teslim edilen ve indirilebilen ürünler</li>
        <li>Hızlı bozulan veya son kullanma tarihi yakın olan ürünler</li>
      </ul>

      <h3>2.3 Hatalı / Kusurlu / Yanlış Ürün Gönderimi</h3>
      <p>
        Eğer size gönderilen ürün ayıplı (kusurlu), hasarlı veya siparişinizden farklı ise:
      </p>
      <ul>
        <li>Tesliminden itibaren 30 gün içinde fotoğraflarla birlikte support@vibehub.com.tr adresine bildiriniz.</li>
        <li>İade kargo ücreti tamamen SATICI tarafından karşılanır.</li>
        <li>Tercihinize göre ücretsiz değişim, onarım veya tam iade seçeneklerinden birini sunarız.</li>
        <li>6502 sayılı Kanun'un 11. maddesi kapsamındaki ayıplı mal haklarınız saklıdır.</li>
      </ul>

      <h2>3. İade Süreci Adımları</h2>
      <ol>
        <li><strong>İade talebi açın:</strong> "Siparişlerim" sayfasından ilgili siparişe gidip "İade talebi oluştur" butonunu kullanın veya support@vibehub.com.tr adresine yazın.</li>
        <li><strong>Onay bekleyin:</strong> Talebiniz 1-2 iş günü içinde değerlendirilir, kargo etiketi tarafınıza iletilir.</li>
        <li><strong>Ürünü gönderin:</strong> Etiketi paketin üstüne yapıştırıp anlaşmalı kargo firmasının şubesine teslim edin.</li>
        <li><strong>İnceleme:</strong> Ürün SATICI'ya ulaştıktan sonra uygunluk kontrolü yapılır (genellikle 2-5 iş günü).</li>
        <li><strong>Ödeme iadesi:</strong> Onay sonrası, en geç 14 gün içinde kart/banka hesabınıza iade gerçekleştirilir.</li>
      </ol>

      <h2>4. İade Ödeme Süresi</h2>
      <table>
        <thead>
          <tr><th>Ödeme Yöntemi</th><th>İade Süresi</th><th>Not</th></tr>
        </thead>
        <tbody>
          <tr><td>Kredi Kartı</td><td>3-10 iş günü</td><td>Banka süreçlerine bağlıdır</td></tr>
          <tr><td>Banka Kartı</td><td>3-10 iş günü</td><td>Banka süreçlerine bağlıdır</td></tr>
          <tr><td>Havale/EFT</td><td>1-3 iş günü</td><td>Beyan edilen IBAN'a yapılır</td></tr>
        </tbody>
      </table>

      <h2>5. Sıkça Sorulan Sorular</h2>

      <h3>5.1 Ürünü teslim alıp denerken zarar verdim, iade edebilir miyim?</h3>
      <p>
        Ürünün niteliğini, özelliklerini ve işleyişini anlamak için makul bir inceleme yapılması doğaldır.
        Ancak normal kullanımı aşan değer kayıplarında SATICI, ALICI'dan değer azalmasına karşılık ödeme talep
        edebilir (Yönetmelik m. 13).
      </p>

      <h3>5.2 İade için kargo ücretini ben mi ödeyeceğim?</h3>
      <p>
        Anlaşmalı kargo firması kullanıldığında iade kargo ücreti SATICI tarafından karşılanır. Farklı bir
        kargo firması seçmeniz durumunda ücret tarafınıza ait olur.
      </p>

      <h3>5.3 Pre-order siparişimi iptal ettim, param ne zaman yatar?</h3>
      <p>
        Pre-order iptalinde tahsil edilen tutar, talebin onaylanmasını takiben en geç 14 gün içinde aynı ödeme
        yöntemine iade edilir.
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        Daha fazla bilgi: <a href="/legal/cayma-hakki">Cayma Hakkı</a> ·{' '}
        <a href="/legal/mesafeli-satis">Mesafeli Satış Sözleşmesi</a>
      </p>
    </LegalPageLayout>
  );
}
