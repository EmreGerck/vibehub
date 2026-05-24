import type { Metadata } from 'next';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Ön Bilgilendirme Formu',
  description: 'Mesafeli Sözleşmeler Yönetmeliği uyarınca tüketiciye sunulan zorunlu ön bilgilendirme formu.',
};

export default function OnBilgilendirmePage() {
  return (
    <LegalPageLayout
      title="Ön Bilgilendirme Formu"
      subtitle="Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi uyarınca sipariş öncesi tüketiciye sunulması zorunlu bilgileri içerir."
      updated="24 Mayıs 2026"
    >
      <div className="info-callout">
        Bu form, VibeHub üzerinden vereceğiniz sipariş öncesinde sizi bilgilendirmek amacıyla hazırlanmıştır.
        Sipariş onaylamadan önce formu dikkatlice okumanızı, anlamadığınız noktaları{' '}
        <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a> üzerinden bizimle paylaşmanızı
        rica ederiz.
      </div>

      <h2>1. Satıcı Bilgileri</h2>
      <p>
        Sipariş ettiğiniz her ürünün satıcısı (SATICI), sipariş özeti ve faturada açıkça belirtilir. VibeHub
        Pazaryeri (vibehub.com.tr) bir aracı hizmet sağlayıcıdır; satıcı sıfatı taşımaz ve 6563 sayılı kanun
        uyarınca platform işletmecisi olarak hareket eder.
      </p>
      <ul>
        <li><strong>Aracı Hizmet Sağlayıcı:</strong> VibeHub Pazaryeri</li>
        <li><strong>İletişim:</strong> support@vibehub.com.tr</li>
        <li><strong>Web:</strong> https://vibehub.com.tr</li>
      </ul>

      <h2>2. Sözleşme Konusu Mal/Hizmetin Temel Nitelikleri</h2>
      <p>
        Sözleşme konusu mal/hizmetin temel özellikleri (ürün adı, kategori, beden/renk gibi varyantlar, görsel),
        satış fiyatı, KDV, indirim varsa indirimli fiyat ve toplam ödenecek tutar; ürün detay sayfasında ve
        sipariş özetinde detaylı olarak gösterilmektedir.
      </p>

      <h2>3. Ödeme Bilgileri</h2>
      <ul>
        <li>Tüm ödemeler güvenli Iyzico altyapısı üzerinden tahsil edilir.</li>
        <li>Kredi kartı bilgileriniz VibeHub veritabanında saklanmaz.</li>
        <li>Tek çekim veya taksitli ödeme seçenekleri kartınızın bankasına göre değişiklik gösterebilir.</li>
        <li>Tüm fiyatlara KDV dahildir; aksi belirtilmedikçe ek bir vergi yoktur.</li>
      </ul>

      <h2>4. Teslimat Bilgileri</h2>
      <ul>
        <li>Standart ürünler, sipariş onayını takiben en geç <strong>30 gün</strong> içinde teslim edilir.</li>
        <li>Pre-order (ön sipariş) ürünlerde teslimat tarihi, ürün detay sayfasında belirtilen tahmini sevkiyat
        tarihine göre belirlenir. Bu süre üretim süreçlerine bağlı olarak değişebilir.</li>
        <li>Kargo ücreti, varsa sipariş özetinde ayrıca gösterilir.</li>
        <li>Teslimat, beyan ettiğiniz adrese kargo firması aracılığıyla yapılır.</li>
      </ul>

      <h2>5. Cayma Hakkı</h2>
      <div className="callout">
        ALICI, malın kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren{' '}
        <strong>14 (on dört) gün</strong> içerisinde, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin
        sözleşmeden cayma hakkına sahiptir.
      </div>
      <p>
        Cayma hakkını kullanmak için bu süre içinde SATICI veya VibeHub müşteri hizmetlerine yazılı olarak veya
        web sitesi üzerinden bildirimde bulunmanız yeterlidir. İade işlem detayları için{' '}
        <a href="/legal/cayma-hakki">Cayma Hakkı sayfamızı</a> inceleyebilirsiniz.
      </p>

      <h3>5.1 Cayma Hakkının İstisnaları (Yönetmelik m. 15)</h3>
      <p>Aşağıdaki ürün/hizmetlerde cayma hakkı kullanılamaz:</p>
      <ul>
        <li>Tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan, kişiselleştirilmiş ürünler (özel baskılı tişört, fan ürünleri, isim/logo ekli ürünler vb.)</li>
        <li>Tesliminden sonra ambalaj, bant, mühür gibi koruyucu unsurları açılmış olan ve iadesi sağlık/hijyen açısından uygun olmayan ürünler</li>
        <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek olan ürünler</li>
        <li>Elektronik ortamda anında ifa edilen ve gayri maddi mallar (dijital ürünler)</li>
        <li>Tesliminden sonra başka ürünlerle karışan ve doğası gereği ayrıştırılması mümkün olmayan ürünler</li>
      </ul>

      <h2>6. İade ve Değişim Koşulları</h2>
      <ul>
        <li>Cayma hakkı kullanıldığında iade kargo ücreti SATICI tarafından karşılanır (anlaşmalı kargo firması üzerinden).</li>
        <li>İade edilecek ürünün orijinal ambalajında, kullanılmamış ve fatura ile birlikte gönderilmesi gerekir.</li>
        <li>SATICI'ya ulaşan iade ürünü uygunluk kontrolünden sonra, ödemeniz <strong>en geç 14 gün içinde</strong> aynı ödeme yöntemiyle iade edilir.</li>
        <li>Detaylı bilgi için <a href="/legal/iade-iptal">İade ve İptal Koşulları</a> sayfasına bakınız.</li>
      </ul>

      <h2>7. Şikayet ve İtiraz Mercileri</h2>
      <p>
        Sözleşmenin uygulanmasından kaynaklanan uyuşmazlıklarda Gümrük ve Ticaret Bakanlığı'nca her yıl Aralık
        ayında belirlenen parasal sınırlar dahilinde mahallinde bulunan Tüketici Hakem Heyetleri'ne veya
        Tüketici Mahkemeleri'ne başvurabilirsiniz.
      </p>

      <h2>8. Onay</h2>
      <p>
        Sipariş ekranında "Ön Bilgilendirme Formu'nu okudum ve kabul ediyorum" kutusunu işaretleyerek bu formdaki
        tüm bilgileri okuduğunuzu, anladığınızı ve elektronik ortamda gerekli teyidi verdiğinizi beyan etmiş
        olursunuz.
      </p>
    </LegalPageLayout>
  );
}
