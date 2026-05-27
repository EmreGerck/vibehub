/**
 * Editorial landing-page topics for /rehber/[topic]
 * ──────────────────────────────────────────────────
 * Each entry is a long-tail-keyword targeted landing page with rich Turkish
 * content. Used for SEO authority + featured-snippet eligibility + AI engine
 * citation. Keys are URL slugs.
 */

export interface RehberTopic {
  title: string;
  metaTitle: string;
  metaDescription: string;
  emoji: string;
  intro: string;
  /** Long-form sections rendered as <h2>+<p>. Use plain text (no markdown). */
  sections: { heading: string; body: string }[];
  /** Targets specific artistType filter when building a featured grid */
  vendorFilter?: 'BAND' | 'ARTIST' | 'COMEDIAN' | 'INFLUENCER';
  /** Editorial faq for the AEO/GEO bonus FAQPage schema */
  faq: { q: string; a: string }[];
  /** Keywords that the page is targeting — used for og:keywords */
  keywords: string[];
}

export const TOPICS: Record<string, RehberTopic> = {
  'sanatci-merch-nasil-alinir': {
    title: 'Sanatçı Merch Nasıl Alınır? Türkiye 2025 Rehberi',
    metaTitle: 'Sanatçı Merch Nasıl Alınır? Türkiye Rehberi',
    metaDescription: 'Sanatçı merch nasıl alınır, orijinal nasıl ayırt edilir, hangi platformlardan güvenli alışveriş yapılır? VibeHub rehberi.',
    emoji: '🎸',
    intro: 'Sanatçı merch dünyasına yeni adım atıyorsanız bu rehber size yol gösterir. Orijinal ürünün nasıl ayırt edileceğinden koleksiyon oluşturmaya kadar her şey.',
    keywords: ['sanatçı merch', 'merch nasıl alınır', 'orijinal merch', 'resmi sanatçı ürünleri', 'türk sanatçı merch'],
    sections: [
      {
        heading: 'Sanatçı Merch Nedir?',
        body: 'Sanatçı merch (kısaca "merch"), bir müzisyen, grup, komedyen veya influencer\'ın resmi olarak ürettiği koleksiyon parçalarıdır. T-shirt, hoodie, vinyl plak, poster, çıkartma, NFC etiketli özel ürünler bu kapsama girer. Hayranlar için sevdikleri sanatçıyı destekleme, konser anısı saklama ve topluluğun parçası olma deneyimi sunar.',
      },
      {
        heading: 'Orijinal Sanatçı Merch Nasıl Ayırt Edilir?',
        body: 'Orijinal ürünün ilk işareti satıcının kim olduğudur. Sanatçının kendisi, etiketi veya doğrulanmış bir resmi mağaza üzerinden satışı resmi sayılır. VibeHub gibi doğrulanmış sanatçı platformlarında her vendor kimlik kontrolünden geçer. Etikette sanatçı veya etiket logosu, baskı kalitesi, kumaş gramajı ve dikiş kalitesi orijinalliği gösterir. Çok ucuz fiyatlardan ve marketplaces içinde belirsiz satıcılardan kaçının.',
      },
      {
        heading: 'Türkiye\'de Hangi Sanatçıların Resmi Merch\'i Var?',
        body: 'Türkiye\'de KALT, MODE XL, TEKİR gibi sanatçıların VibeHub üzerinde resmi mağazaları bulunur. Liste sürekli güncellenir — yeni sanatçılar her ay eklenir. Tüm aktif sanatçı mağazalarını /vendors sayfasından inceleyebilirsiniz. Her sanatçının kendi koleksiyonu, sınırlı sayıda baskısı ve özel ürünleri kendi mağazasında listelenir.',
      },
      {
        heading: 'İlk Merch Siparişinizde Nelere Dikkat Etmelisiniz?',
        body: 'Doğru beden için ürün açıklamasındaki ölçü tablosuna bakın — sanatçı merch normal kalıplıdır ama markaya göre değişebilir. Tişört ve hoodie\'lerde gramaj (g/m²) önemlidir; 180g+ kalın, dayanıklı kumaştır. Sınırlı sayıda üretilen koleksiyonları yakından takip edin; bazı parçalar 24 saat içinde tükenir. VibeHub bildirimleri açarak yeni drop\'lardan ilk siz haberdar olabilirsiniz.',
      },
      {
        heading: 'Kargo, İade ve Müşteri Hizmetleri',
        body: 'VibeHub\'da sipariş onayı sonrası 1-3 iş günü içinde kargoya verilir, Aras Kargo veya Yurtiçi Kargo ile 2-4 iş günü içinde teslim alınır. 14 gün cayma hakkınız vardır — beden değişikliği veya iade için profil → siparişler bölümünden tek tıkla işlem başlatabilirsiniz. Kargo barkodu otomatik üretilir ve e-postanıza gönderilir. Tüm sürecin maliyeti satıcı tarafından karşılanır.',
      },
    ],
    faq: [
      { q: 'Sanatçı merch ne demek?', a: 'Bir sanatçı veya etiketin resmi olarak ürettiği koleksiyon ürünleri (t-shirt, hoodie, vinyl, poster vb.) sanatçı merch olarak adlandırılır.' },
      { q: 'Orijinal merch nereden alınır?', a: 'Sanatçının kendi sitesi, etiketi veya doğrulanmış sanatçı platformları (örn. VibeHub) en güvenli yoldur. Marketplace içinde belirsiz satıcılardan kaçınılmalıdır.' },
      { q: 'Türk sanatçı merch fiyatları ne kadar?', a: 'T-shirt 250-450 TL, hoodie 600-1200 TL, sınırlı sayıda özel ürünler 500-2000 TL aralığındadır. Sanatçıya ve üretim kalitesine göre değişir.' },
    ],
  },

  'band-merch-resmi': {
    title: 'Band Merch — Türk Grupların Resmi Tişört ve Hoodie Koleksiyonu',
    metaTitle: 'Band Merch — Türk Grup Tişörtleri | VibeHub',
    metaDescription: 'Türk rock, metal, indie ve elektronik grupların resmi tişört, hoodie ve özel koleksiyon ürünleri. Sahnen senin, koleksiyonun senin.',
    emoji: '🎤',
    intro: 'Türkiye\'nin yükselen grupları VibeHub\'da kendi mağazalarını açıyor. Resmi band merch, sınırlı baskı tişörtler, vinyl plaklar ve daha fazlası.',
    vendorFilter: 'BAND',
    keywords: ['band merch', 'band tişörtü', 'türk grup merch', 'rock merch', 'metal grup tişörtü'],
    sections: [
      {
        heading: 'Band Merch Neden Önemlidir?',
        body: 'Bir grubun tişörtünü giymek sadece moda değil — desteklediğiniz müziği dünyaya göstermek, topluluğun parçası olmak ve sanatçıya doğrudan gelir sağlamaktır. Geleneksel CD ve dijital satış modelinde sanatçılar gelirin çok küçük bir kısmını alırken, doğrudan merch satışında gelirin büyük bölümü sanatçıya kalır.',
      },
      {
        heading: 'VibeHub\'da Hangi Türk Grupları Var?',
        body: 'KALT, MODE XL ve TEKİR gibi sanatçılar VibeHub\'da resmi mağaza açtı. Liste düzenli olarak büyüyor — alternatif, indie, rap-rock ve elektronik prodüksiyon yapan onlarca sanatçı VibeHub\'a katılıyor. Tüm aktif grupları aşağıdaki ızgaradan inceleyebilirsiniz.',
      },
      {
        heading: 'Konser ve Tur Merch\'i',
        body: 'Bazı sanatçılar belirli konserlere veya turlara özel sınırlı sayıda koleksiyon çıkarır. Bu parçalar sadece o etkinlik için üretilir ve sonradan tekrar satışa sunulmaz — bu yüzden koleksiyon değeri yüksektir. VibeHub\'da "Tour Edition" veya "Limited" etiketli ürünler bu kategoriye girer.',
      },
      {
        heading: 'NFC Etiketli Özel Ürünler',
        body: 'VibeHub\'ın benzersiz NFC özelliği sayesinde bazı band merch ürünlerinde telefonunuzu temas ettirdiğinizde grubun resmi sayfasına, en yeni şarkılarına veya gizli içeriklere erişebilirsiniz. Bu özellik sanatçı-hayran iletişimini bir adım öteye taşır.',
      },
    ],
    faq: [
      { q: 'Band merch ne demek?', a: 'Band merch, bir müzik grubunun resmi tişört, hoodie, kapüşonlu, çıkartma, poster ve özel koleksiyon ürünlerinin tümüdür.' },
      { q: 'Türk gruplarının resmi tişörtleri nereden alınır?', a: 'VibeHub gibi doğrulanmış sanatçı platformlarından veya grubun kendi resmi web sitesinden alınabilir.' },
    ],
  },

  'nfc-merch-nedir': {
    title: 'NFC Merch Nedir? Akıllı Sanatçı Ürünleri Rehberi',
    metaTitle: 'NFC Merch Nedir? Akıllı Sanatçı Ürünleri | VibeHub',
    metaDescription: 'NFC etiketli sanatçı ürünleri nedir, nasıl çalışır, neden bu kadar özel? VibeHub\'ın benzersiz NFC merch teknolojisi rehberi.',
    emoji: '📱',
    intro: 'NFC etiketli sanatçı ürünleri sayesinde fiziksel ürün ile dijital deneyim birleşiyor. Telefonunuzu temas ettirin, sanatçınızla anlık bağlantı kurun.',
    keywords: ['nfc merch', 'akıllı tişört', 'nfc etiketli ürün', 'sanatçı nfc'],
    sections: [
      {
        heading: 'NFC Nedir?',
        body: 'NFC (Near Field Communication), iki cihazın 4 cm mesafeden veri alışverişi yapmasını sağlayan yakın alan iletişim teknolojisidir. Modern akıllı telefonların hemen hepsi NFC destekler. Tek dokunuşla web sayfası açma, ödeme, sosyal medya bağlantısı paylaşma gibi işlemler mümkündür.',
      },
      {
        heading: 'NFC Merch Nasıl Çalışır?',
        body: 'VibeHub\'da bazı sanatçı ürünlerinin içine küçük bir NFC çipi yerleştirilmiştir. Telefonunuzu ürüne yaklaştırdığınızda otomatik olarak o sanatçının VibeHub sayfasına yönlendirilirsiniz. Sayfada en yeni şarkıları, konser tarihleri, gizli içerikler ve sadece o ürünün sahiplerine özel materyaller olabilir.',
      },
      {
        heading: 'NFC Merch\'in Avantajları',
        body: 'Sıradan bir t-shirt giymek yerine, içinde dijital bir hatıra taşıyan bir koleksiyon parçası sahibi olursunuz. Sanatçı yeni şarkı çıkardığında, konser ilan ettiğinde veya özel bir içerik paylaştığında ürününüzden anında haberdar olabilirsiniz. NFC etiketler kaliteli ve dayanıklıdır — yıllarca çalışmaya devam eder.',
      },
    ],
    faq: [
      { q: 'NFC merch ne kadar dayanır?', a: 'NFC çipler 10 yıldan uzun süre sorunsuz çalışır. Yıkamaya ve normal kullanıma dayanıklıdır.' },
      { q: 'Hangi telefonlar NFC destekler?', a: 'iPhone 7 ve sonrası tüm modeller, çoğu Android telefon (2016 sonrası modeller) NFC destekler.' },
      { q: 'NFC merch alırken ek ücret var mı?', a: 'Hayır. NFC özellik ürün fiyatına dahildir, yıllık abonelik veya gizli ücret yoktur.' },
    ],
  },

  'sanatci-koleksiyonu-nasil-baslatilir': {
    title: 'Sanatçı Koleksiyonu Nasıl Başlatılır? Adım Adım Rehber',
    metaTitle: 'Sanatçı Koleksiyonu Nasıl Başlatılır? | VibeHub',
    metaDescription: 'Sevdiğiniz sanatçının koleksiyonunu nasıl başlatırsınız? Hangi parçalardan başlamalı, nereden alınmalı, nasıl saklanmalı?',
    emoji: '💿',
    intro: 'Bir sanatçının koleksiyonunu başlatmak duygusal bir yatırımdır. Doğru parçayla başlayın, doğru yerden alın, doğru saklayın.',
    keywords: ['sanatçı koleksiyonu', 'merch koleksiyonu', 'koleksiyon başlatmak', 'plak koleksiyonu', 'tişört koleksiyonu'],
    sections: [
      {
        heading: 'İlk Adım: Hangi Sanatçıyla Başlamalı?',
        body: 'Sürekli dinlediğiniz, müziği ile bir bağ kurduğunuz bir sanatçıyla başlayın. Sınırlı koleksiyon parçalarının değeri zaman içinde artar — özellikle henüz yükselişte olan sanatçıların erken dönem ürünleri ileride çok değerli olabilir.',
      },
      {
        heading: 'Hangi Parçalar Koleksiyonluk?',
        body: 'Vinyl plaklar (LP), sınırlı sayıda üretilen tişörtler ("limited edition"), tur konser merch\'i ve numaralı baskı posterler en koleksiyonluk parçalardır. Standart "stock" ürünler sürekli üretilirken, bu özel parçalar bir kez üretilir ve tekrar satışa sunulmaz.',
      },
      {
        heading: 'Koleksiyon Nasıl Saklanmalı?',
        body: 'Tişörtleri katlayarak nem almayan bir dolapta saklayın — askıda asılı kalan tişörtlerin omuzları zamanla deforme olur. Vinyl plakları dik ve gölgede saklayın. Posterleri çerçeveletmeden saklarken UV korumalı rulo tüplerde tutun.',
      },
      {
        heading: 'Koleksiyonu Belgelemek',
        body: 'Aldığınız her özel parçanın fotoğrafını, satın alma tarihini ve fiyatını not edin. Bu hem değerini takip etmek hem de sigorta amaçlı önemlidir. Bazı koleksiyoncular Instagram veya özel bir blog üzerinde koleksiyonlarını paylaşır.',
      },
    ],
    faq: [
      { q: 'Sanatçı koleksiyonu yatırım amaçlı mı yapılır?', a: 'Bazı koleksiyoncular için evet — sınırlı baskı tişörtler ve vinyl plakların fiyatı zaman içinde 5-10 katına çıkabilir. Ancak çoğu koleksiyoncu için duygusal değer öncelikli.' },
      { q: 'En değerli merch hangileridir?', a: 'Numaralı sınırlı baskılar, tur özel ürünleri, sanatçının imzaladığı parçalar ve artık yayında olmayan sanatçıların eski koleksiyonları en değerlidir.' },
    ],
  },
};
