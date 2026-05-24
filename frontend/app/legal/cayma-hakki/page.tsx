import type { Metadata } from 'next';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Cayma Hakkı ve İade Formu',
  description: 'Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca 14 günlük cayma hakkının kullanımı.',
};

export default function CaymaHakkiPage() {
  return (
    <LegalPageLayout
      title="Cayma Hakkı"
      subtitle="Mesafeli Sözleşmeler Yönetmeliği m. 9 uyarınca tüketicinin sahip olduğu 14 günlük cayma hakkına ilişkin bilgi ve örnek form."
      updated="24 Mayıs 2026"
    >
      <h2>1. Cayma Hakkı Nedir?</h2>
      <p>
        Tüketici (ALICI), mesafeli sözleşmeye konu malın kendisine veya gösterdiği adresteki kişi/kuruluşa
        tesliminden itibaren <strong>14 (on dört) gün</strong> içinde, herhangi bir gerekçe göstermeksizin ve
        cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
      </p>

      <h2>2. Süre Nasıl Hesaplanır?</h2>
      <ul>
        <li>Tek bir ürün siparişlerinde: ürünün tesliminden itibaren 14 gün</li>
        <li>Birden fazla parça halinde teslim edilen ürünlerde: son parçanın tesliminden itibaren 14 gün</li>
        <li>Belirli bir süre için malın düzenli tesliminin yapıldığı sözleşmelerde: ilk teslimden itibaren 14 gün</li>
      </ul>

      <h2>3. Cayma Hakkı Nasıl Kullanılır?</h2>
      <ol>
        <li>
          14 günlük süre içinde, açık beyanda bulunmak suretiyle{' '}
          <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a> adresine veya aşağıdaki örnek formu
          doldurarak ya da kendi yazacağınız bildirimi göndererek cayma hakkınızı kullanabilirsiniz.
        </li>
        <li>
          Bildirim, süresi içinde tarafımıza ulaştırıldığı tarih itibarıyla geçerli sayılır.
        </li>
        <li>
          Cayma bildiriminin tarafımıza ulaştığı tarihten itibaren <strong>10 gün içinde</strong> ürünü, varsa
          orijinal kutusu/ambalajı ile birlikte, anlaşmalı kargo firmamız aracılığıyla SATICI'ya iade etmeniz
          gerekmektedir.
        </li>
        <li>
          SATICI iade kargo ücretini karşılar (anlaşmalı kargo şirketi üzerinden gönderilmesi koşuluyla). Farklı
          bir kargo firması seçilmesi halinde ücret ALICI'ya ait olabilir.
        </li>
        <li>
          İade ürünü SATICI'ya ulaşıp uygunluk kontrolü yapıldıktan sonra, ödemeniz <strong>en geç 14 gün
          içinde</strong> ve siparişte kullandığınız ödeme yöntemiyle iade edilir.
        </li>
      </ol>

      <h2>4. Cayma Hakkının Kullanılamayacağı Haller</h2>
      <div className="callout">
        Yönetmelik m. 15 uyarınca aşağıdaki ürün/hizmetlerde cayma hakkı kullanılamaz:
      </div>
      <ul>
        <li>
          <strong>Kişiselleştirilmiş ürünler:</strong> İsim/logo baskılı tişört, fan ürünleri, özel tasarım
          mug/poster gibi tüketicinin istekleri doğrultusunda hazırlanan ürünler
        </li>
        <li>
          <strong>Ambalajı açılan hijyen ürünleri:</strong> Tesliminden sonra mühür/bant/poşet gibi koruyucu
          unsurları açılan, iadesi sağlık ve hijyen açısından uygun olmayan ürünler
        </li>
        <li>
          <strong>Tek kullanımlık dijital içerikler:</strong> Elektronik ortamda anında ifa edilen ve gayri
          maddi mallar (PDF, müzik, dijital sanat eseri vb.)
        </li>
        <li>Çabuk bozulan veya son kullanma tarihi yakın ürünler</li>
        <li>Fiyatı finansal piyasa dalgalanmalarına bağlı, satıcının kontrolünde olmayan ürünler</li>
      </ul>

      <h2>5. Cayma Hakkının Sonuçları</h2>
      <ul>
        <li>İade edilen ürün, ALICI'nın kullanım kaynaklı değer kaybı dışında, orijinal hâliyle iade edilmelidir.</li>
        <li>Ürünün ALICI'nın özen yükümlülüğüne aykırı şekilde kullanılmasından doğan değer kayıpları için SATICI ALICI'dan tazminat talep edebilir.</li>
        <li>Pre-order ürünler için cayma hakkı süresi, ürünün ALICI'ya teslimi tarihinden itibaren başlar. Henüz teslim edilmemiş pre-order siparişler iptal talebi yoluyla ücretsiz iptal edilebilir.</li>
      </ul>

      <h2>6. Cayma Hakkı Bildirim Formu (Örnek)</h2>
      <p>
        Aşağıdaki formu doldurarak <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a> adresine
        iletebilirsiniz. Bu formun kullanımı zorunlu değildir; benzer içerikte kendi yazacağınız bir e-posta
        da geçerli sayılır.
      </p>
      <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5 my-4">
        <p className="font-mono text-xs sm:text-sm whitespace-pre-line text-gray-700 dark:text-gray-300">
{`Kime: VibeHub Pazaryeri
E-posta: support@vibehub.com.tr

Konu: Cayma Hakkı Bildirimi

Aşağıda detayları yer alan ürünün/ürünlerin satışına ilişkin sözleşmeyi
6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
Yönetmeliği'nin 9. maddesi uyarınca cayma hakkımı kullanarak feshettiğimi
bildirmek isterim.

— Sipariş numarası: __________________
— Sipariş tarihi: ____________________
— Teslim alınma tarihi: ______________
— Ürün adı / adedi: __________________
— Alıcının adı soyadı: _______________
— Alıcının adresi: ___________________
— İade edilecek IBAN (kart iadeleri için gerekmez): _______
— Tarih: _____________________________
— İmza (e-posta için isteğe bağlı): __`}
        </p>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        Sorularınız için: <a href="mailto:support@vibehub.com.tr">support@vibehub.com.tr</a>
      </p>
    </LegalPageLayout>
  );
}
