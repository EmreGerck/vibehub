import type { Metadata } from 'next';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi',
  description: '6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında Mesafeli Satış Sözleşmesi.',
};

export default function MesafeliSatisPage() {
  return (
    <LegalPageLayout
      title="Mesafeli Satış Sözleşmesi"
      subtitle="6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 27 Kasım 2014 tarihli Mesafeli Sözleşmeler Yönetmeliği uyarınca düzenlenmiştir."
      updated="24 Mayıs 2026"
    >
      <div className="info-callout">
        <strong>Bilgilendirme:</strong> Bu sözleşme, alıcı (TÜKETİCİ) ile satıcı (SATICI) arasında, VibeHub
        platformu üzerinden gerçekleştirilen sipariş anında onaylanması zorunlu, yasal olarak bağlayıcı bir
        mesafeli satış sözleşmesidir. Siparişiniz onaylandığı anda bu sözleşmenin tüm hükümlerini kabul etmiş
        sayılırsınız ve bir kopyası tarafınıza e-posta ile iletilir.
      </div>

      <h2>1. Taraflar</h2>

      <h3>1.1 SATICI</h3>
      <p>
        Bu sözleşmede SATICI, siparişe konu ürünleri VibeHub platformu üzerinden satışa sunan, sipariş ekranında
        ve fatura üzerinde unvanı, vergi numarası ve adresi belirtilen bağımsız satıcı/iş ortağıdır. Aksi açıkça
        belirtilmedikçe VibeHub Pazaryeri (aşağıda "ARACI HİZMET SAĞLAYICI" olarak anılacaktır) satıcı sıfatı
        taşımaz; yalnızca 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca aracılık eder.
      </p>

      <h3>1.2 ARACI HİZMET SAĞLAYICI</h3>
      <ul>
        <li><strong>Unvan:</strong> VibeHub Pazaryeri</li>
        <li><strong>Adres:</strong> [Şirket adresi]</li>
        <li><strong>E-posta:</strong> support@vibehub.com.tr</li>
        <li><strong>Web sitesi:</strong> https://vibehub.com.tr</li>
        <li><strong>Mersis No:</strong> [Mersis no eklenmeli]</li>
      </ul>

      <h3>1.3 ALICI</h3>
      <p>
        Sipariş ekranında ad, soyad, e-posta, telefon ve teslimat/fatura adresi belirtilen, üzerinde tüketici
        sıfatı taşıyan gerçek veya tüzel kişidir.
      </p>

      <h2>2. Sözleşmenin Konusu</h2>
      <p>
        İşbu sözleşmenin konusu, ALICI'nın VibeHub platformu üzerinden elektronik ortamda sipariş verdiği,
        aşağıda nitelikleri ve satış fiyatı belirtilen ürün/ürünlerin satışı ve teslimi ile ilgili olarak
        tarafların hak ve yükümlülüklerinin saptanmasıdır.
      </p>

      <h2>3. Sözleşme Konusu Ürün/Hizmet Bilgileri</h2>
      <p>
        Ürün adı, adedi, KDV dahil satış fiyatı, vergi tutarı, varsa kargo ücreti ile toplam ödenecek tutar
        sipariş özetinde ve sipariş onay e-postasında detaylı olarak belirtilmiştir. Bu bilgiler işbu
        sözleşmenin ayrılmaz parçasını oluşturur.
      </p>
      <table>
        <thead>
          <tr><th>Alan</th><th>Açıklama</th></tr>
        </thead>
        <tbody>
          <tr><td>Ürün özellikleri</td><td>Ürün detay sayfasında ve sipariş özetinde</td></tr>
          <tr><td>Satış fiyatı (KDV dahil)</td><td>Sipariş özetinde gösterildiği şekilde</td></tr>
          <tr><td>Ödeme şekli</td><td>Kredi kartı / banka kartı (Iyzico altyapısı)</td></tr>
          <tr><td>Teslimat adresi</td><td>Siparişte beyan edilen adres</td></tr>
          <tr><td>Teslim alacak kişi</td><td>Siparişte beyan edilen kişi</td></tr>
          <tr><td>Fatura adresi</td><td>Siparişte beyan edilen adres</td></tr>
        </tbody>
      </table>

      <h2>4. Genel Hükümler</h2>
      <ol>
        <li>
          ALICI, sipariş konusu ürünün/ürünlerin temel nitelikleri, satış fiyatı, ödeme şekli, teslimat koşulları
          ile ilgili tüm ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini
          beyan eder.
        </li>
        <li>
          Sözleşme konusu ürün, yasal 30 (otuz) günlük süreyi aşmamak koşuluyla ALICI'nın yerleşim yerinin
          uzaklığına bağlı olarak SATICI tarafından ALICI veya gösterdiği adresteki kişi/kuruluşa teslim edilir.
          Pre-order (ön sipariş) ürünlerde, ürün detay sayfasında belirtilen tahmini sevkiyat tarihi geçerlidir.
        </li>
        <li>
          SATICI, sipariş konusu ürünün/ürünlerin sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve
          varsa garanti belgeleri ile birlikte teslim edilmesinden sorumludur.
        </li>
        <li>
          Sipariş konusu ürün, ALICI'dan başka bir kişiye teslim edilecekse, teslim edilecek kişinin teslimatı
          kabul etmemesinden SATICI sorumlu tutulamaz.
        </li>
        <li>
          Kargo firmasından kaynaklı gecikmelerde SATICI'nın sorumluluğu, Türk Borçlar Kanunu hükümleri saklı
          kalmak kaydıyla, taşıyıcıya teslim ettiği tarihe kadardır.
        </li>
      </ol>

      <h2>5. Pre-Order (Ön Sipariş) Ürünleri</h2>
      <div className="callout">
        <strong>⚠️ Önemli:</strong> Pre-order olarak işaretli ürünler henüz üretilmemiş veya stokta
        bulunmayabilir. Ön siparişler aşağıdaki ek koşullara tabidir:
      </div>
      <ul>
        <li>
          Ön sipariş, SATICI tarafından onaylanmasının ardından üretime/sevkiyata alınır. Onay durumu
          siparişlerim sayfasından izlenebilir ve durum değişiklikleri e-posta ile bildirilir.
        </li>
        <li>
          Ürün detay sayfasında belirtilen <strong>tahmini sevkiyat tarihi</strong> bağlayıcı değildir; üretim
          süreçlerine bağlı olarak makul ölçüde değişebilir. SATICI gecikmeyi ALICI'ya zaman geçirmeksizin
          bildirir.
        </li>
        <li>
          Sevkiyat tarihinden önce ALICI sipariş iptali talep edebilir; bu durumda ödenen tutar, 14 gün içinde
          ALICI'nın hesabına iade edilir.
        </li>
        <li>
          SATICI'nın üretimi gerçekleştirememesi durumunda sipariş tek taraflı olarak iptal edilir ve ödenen
          tutarın tamamı 14 gün içinde iade edilir.
        </li>
      </ul>

      <h2>6. Ödeme</h2>
      <p>
        Ödemeler Iyzico altyapısı üzerinden online tahsil edilir. ARACI HİZMET SAĞLAYICI, alıcının ödediği tutarı
        SATICI'ya, ürünün ALICI'ya teslimini takip eden makul süre içinde ve platform komisyonunu düşerek aktarır.
      </p>

      <h2>7. Cayma Hakkı</h2>
      <p>
        ALICI, sözleşme konusu ürünü kendisine veya gösterdiği adresteki kişi/kuruluşa <strong>tesliminden
        itibaren 14 (on dört) gün içinde</strong> herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin
        cayma hakkına sahiptir. Detaylar için
        {' '}
        <a href="/legal/cayma-hakki">Cayma Hakkı sayfamıza</a>
        {' '}
        bakınız.
      </p>

      <h3>7.1 Cayma Hakkının Kullanılamayacağı Durumlar</h3>
      <p>Aşağıdaki ürünlerde cayma hakkı kullanılamaz:</p>
      <ul>
        <li>Fiyatı finansal piyasalardaki dalgalanmalara bağlı ürünler</li>
        <li>ALICI'nın istek veya açıkça onun kişisel ihtiyaçları doğrultusunda hazırlanan, kişiselleştirilmiş ürünler (özel baskılı tişört, kupa, poster vb.)</li>
        <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler</li>
        <li>Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olan; iadesi sağlık ve hijyen açısından uygun olmayan ürünler</li>
        <li>Elektronik ortamda anında ifa edilen ve gayri maddi mallar (dijital ürünler)</li>
      </ul>

      <h2>8. Yetkili Mahkeme</h2>
      <p>
        İşbu sözleşmenin uygulanmasında, Gümrük ve Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici
        Hakem Heyetleri, aşan durumlarda ALICI'nın ve SATICI'nın yerleşim yerindeki Tüketici Mahkemeleri yetkilidir.
      </p>

      <h2>9. Yürürlük</h2>
      <p>
        İşbu sözleşme elektronik ortamda ALICI tarafından onaylanmakla yürürlüğe girer ve ürünün ALICI'ya teslimi
        ve ödemenin SATICI'ya intikali ile birlikte ifa edilmiş sayılır.
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        Bu metin yalnızca bilgi amaçlıdır; spesifik bir uyuşmazlıkta bağımsız hukuki danışmanlık alınması tavsiye
        edilir. Sözleşmenin her bir sipariş için kişiselleştirilmiş ve imzalı kopyası sipariş sonrası
        tarafınıza e-posta ile gönderilir.
      </p>
    </LegalPageLayout>
  );
}
