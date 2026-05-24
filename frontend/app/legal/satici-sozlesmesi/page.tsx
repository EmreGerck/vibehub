import type { Metadata } from 'next';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Satıcı Sözleşmesi',
  description: 'VibeHub pazaryeri üzerinden satış yapmak isteyen iş ortakları (satıcılar) ile aramızdaki yasal çerçeveyi düzenleyen sözleşme.',
};

export default function SaticiSozlesmesiPage() {
  return (
    <LegalPageLayout
      title="VibeHub Satıcı Sözleşmesi"
      subtitle="Aracı hizmet sağlayıcı VibeHub Pazaryeri ile satışa konu ürünlerin sahibi/satıcısı arasındaki yasal çerçeve."
      updated="24 Mayıs 2026"
    >
      <h2>1. Taraflar</h2>
      <ul>
        <li><strong>Aracı Hizmet Sağlayıcı:</strong> VibeHub Pazaryeri (bundan sonra "VibeHub" olarak anılacaktır)</li>
        <li><strong>Satıcı:</strong> VibeHub satıcı başvurusunu onaylayarak platformda satış yapma yetkisi kazanan gerçek veya tüzel kişi (bundan sonra "SATICI" olarak anılacaktır)</li>
      </ul>

      <h2>2. Sözleşmenin Konusu</h2>
      <p>
        İşbu sözleşme, SATICI'nın kendi ürünlerini VibeHub platformu (https://vibehub.com.tr) aracılığıyla son
        tüketicilere satışa sunmasının koşullarını, tarafların hak ve yükümlülüklerini, ödeme ve komisyon
        esaslarını, fikri mülkiyet ve sözleşmenin sona ermesine ilişkin hükümleri düzenler.
      </p>

      <h2>3. SATICI'nın Sıfatı ve Sorumluluğu</h2>
      <p>
        SATICI, sunduğu ürünlerin <strong>tek başına ve gerçek satıcısıdır</strong>. VibeHub, 6563 sayılı
        Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca yalnızca aracı hizmet sağlayıcı sıfatı taşır
        ve sözleşmenin tarafı değildir.
      </p>
      <ul>
        <li>Ürünlerin yasal mevzuata uygun olmasından SATICI sorumludur (Tüketicinin Korunması, etiketleme, vergisel yükümlülükler vb.)</li>
        <li>SATICI, faturayı doğrudan ALICI'ya kesmek ve siparişle birlikte paketlemekle yükümlüdür.</li>
        <li>SATICI'nın taşıdığı ayıplı mal, eksik ya da yanlış ürün gönderimi, garanti hakkı vb. tüm sorumluluk SATICI'ya aittir.</li>
      </ul>

      <h2>4. Komisyon ve Ödeme</h2>
      <ul>
        <li>VibeHub, her başarılı satıştan, SATICI ile karşılıklı belirlenen oran üzerinden komisyon kesintisi yapar (varsayılan: %10).</li>
        <li>Komisyon oranı SATICI'ya özel olarak VibeHub Admin Paneli'nden değiştirilebilir.</li>
        <li>Ödeme, ürünün ALICI'ya tesliminin tamamlandığı tarihi takip eden hafta içinde SATICI'nın IBAN'ına aktarılır.</li>
        <li>Cayma hakkı kullanılarak iade edilen siparişlerin komisyonu SATICI'nın bir sonraki ödemesinden mahsup edilir.</li>
      </ul>

      <h2>5. Ürün Yükleme ve Onay Süreci</h2>
      <ol>
        <li>SATICI ürünlerini kendi paneli üzerinden ekler; doğru görsel, başlık, açıklama, fiyat ve stok bilgisi vermekle yükümlüdür.</li>
        <li>Ürünler VibeHub editörlüğünce ön incelemeye alınır; uygun bulunan ürünler "Yayında" durumuna geçer.</li>
        <li>Mevzuata veya VibeHub kurallarına aykırı ürünler reddedilir, gerekirse hesap askıya alınır.</li>
        <li>Pre-order ürünlerde, belirtilen tahmini sevkiyat tarihine uyulması ALICI memnuniyeti açısından kritiktir.</li>
      </ol>

      <h2>6. Yasaklı Ürünler ve İçerikler</h2>
      <p>SATICI aşağıdaki ürünleri kesinlikle platformda satışa sunamaz:</p>
      <ul>
        <li>Yasaklı veya kısıtlı her türlü madde (silah, narkotik, vb.)</li>
        <li>Telif hakkı ihlali içeren ürünler (orijinal olmayan ya da lisanssız fan ürünleri)</li>
        <li>Üçüncü tarafların marka tescilini ihlal eden ürünler</li>
        <li>Yasalara aykırı, müstehcen, ırkçı, ayrımcı veya nefret söylemi içeren ürünler</li>
        <li>Vergi mevzuatına aykırı, kayıt dışı satış</li>
      </ul>

      <h2>7. Fikri Mülkiyet</h2>
      <ul>
        <li>SATICI, yüklediği görsel, açıklama ve marka bilgilerinin telif/lisans haklarına sahip olduğunu kabul eder.</li>
        <li>SATICI, VibeHub'a, ürünleri pazarlama amacıyla platformda ve dış mecralarda (Instagram, Google, vb.) gösterme yetkisi verir.</li>
        <li>VibeHub markası, logosu ve platform yazılımı VibeHub'ın münhasır mülkiyetindedir.</li>
      </ul>

      <h2>8. Hesap Askıya Alma ve Fesih</h2>
      <p>VibeHub aşağıdaki durumlarda SATICI hesabını uyarısız askıya alabilir veya kapatabilir:</p>
      <ul>
        <li>İşbu sözleşmeye veya mevzuata aykırı davranış</li>
        <li>Müşteri şikayetlerinin makul sınırı aşması</li>
        <li>Sahtekarlık, sahte ürün satışı, kayıt dışı işlem şüphesi</li>
        <li>Yasal yetkili mercilerin talebi</li>
      </ul>
      <p>Her iki taraf, 30 gün önceden yazılı bildirimde bulunmak koşuluyla sözleşmeyi sebepsiz feshedebilir.</p>

      <h2>9. Sorumluluk Sınırlandırması</h2>
      <p>
        VibeHub'ın sorumluluğu, aracı hizmet sağlayıcı sıfatıyla sınırlıdır. Platformun teknik aksaklıkları,
        ödeme altyapısı kesintileri veya kargo firmalarından kaynaklanan gecikmelerden VibeHub doğrudan
        sorumlu tutulamaz. SATICI, ALICI ile arasındaki uyuşmazlığı doğrudan çözmekle yükümlüdür; VibeHub
        arabuluculuk yapabilir ancak tarafı değildir.
      </p>

      <h2>10. Yetkili Mahkeme</h2>
      <p>
        Bu sözleşmenin uygulanmasından doğacak uyuşmazlıkların çözümünde İstanbul (Çağlayan) Mahkemeleri ve
        İcra Daireleri yetkilidir.
      </p>

      <h2>11. Yürürlük</h2>
      <p>
        İşbu sözleşme, SATICI'nın platformdaki satıcı kayıt formundaki "Satıcı Sözleşmesi'ni okudum ve kabul
        ediyorum" kutusunu işaretlemesiyle elektronik ortamda yürürlüğe girer.
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        Satıcı olmak için <a href="/vendors/apply">başvuru formuna</a> gidin.
      </p>
    </LegalPageLayout>
  );
}
