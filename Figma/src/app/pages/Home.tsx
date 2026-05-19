import { Link } from 'react-router';
import { ArrowRight, Music, Mic2, ShoppingBag } from 'lucide-react';
import Slider from 'react-slick';
import modeXLImage from '../../imports/Mode_XL.jpg';
import kaltImage from '../../imports/Kalt.jpg';

export function Home() {

  const bannerSliderSettings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    fade: false,
    cssEase: 'ease-in-out',
    pauseOnHover: false,
    arrows: true,
    rtl: false,
  };

  const merchSlides = [
    {
      id: 'modexl',
      title: 'Mode XL',
      subtitle: 'VibeHub x MODE XL',
      heading: 'Official Merch Drop: Mode XL',
      description: 'Limited-run tees, hoodies, and accessories crafted for the Mode XL rap collective—premium blanks, bold graphics, and tour-ready quality.',
      buttonText: 'Shop Mode XL',
      link: '/modexl',
      gradient: 'radial-gradient(1200px 600px at 20% 10%, rgba(124, 58, 237, 0.35), transparent 55%), radial-gradient(900px 500px at 85% 30%, rgba(236, 72, 153, 0.28), transparent 60%), linear-gradient(135deg, #070A12 0%, #0B1022 45%, #070A12 100%)',
      buttonGradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F97316 100%)',
      image: modeXLImage,
    },
    {
      id: 'kalt',
      title: 'KALT',
      subtitle: 'VibeHub x KALT (Turkey)',
      heading: 'Signature Collection: KALT',
      description: 'Designed for KALT\'s fans across Turkey—sleek silhouettes, elevated details, and a refined palette built for everyday wear.',
      buttonText: 'Shop KALT',
      link: '/kalt',
      gradient: 'radial-gradient(1100px 520px at 18% 18%, rgba(34, 211, 238, 0.22), transparent 55%), radial-gradient(900px 520px at 85% 20%, rgba(124, 58, 237, 0.22), transparent 60%), linear-gradient(135deg, rgb(6, 10, 16) 0%, rgb(7, 24, 38) 45%, rgb(6, 10, 16) 100%)',
      buttonGradient: 'linear-gradient(135deg, #22D3EE 0%, #7C3AED 55%, #0EA5E9 100%)',
      image: kaltImage,
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Hero Banner Slider */}
      <div className="mb-20">
        <Slider {...bannerSliderSettings} className="hero-banner-slider">
          {merchSlides.map((slide) => (
            <div key={slide.id}>
              <div
                className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8"
                style={{
                  background: slide.gradient,
                  minHeight: '500px'
                }}
              >
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `url(${slide.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 md:py-20 lg:py-24 relative">
                  <div className="max-w-3xl">
                    <h5 className="text-white/80 text-xs md:text-sm lg:text-base tracking-[0.14em] uppercase font-semibold mb-3">
                      {slide.subtitle}
                    </h5>
                    <h3 className="text-white text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight mb-4 md:mb-6">
                      {slide.heading}
                    </h3>
                    <p className="text-white/80 text-sm md:text-base lg:text-lg leading-relaxed mb-6 md:mb-8 max-w-2xl">
                      {slide.description}
                    </p>
                    <Link
                      to={slide.link}
                      className="inline-flex items-center gap-2 md:gap-3 px-5 md:px-6 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base text-white shadow-2xl hover:scale-105 transition-all duration-300"
                      style={{
                        background: slide.buttonGradient,
                        boxShadow: '0 18px 40px rgba(124, 58, 237, 0.25)'
                      }}
                    >
                      {slide.buttonText}
                      <ArrowRight size={18} className="md:w-5 md:h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 text-center mt-16">
          <div className="p-6">
            <ShoppingBag className="mx-auto mb-4 text-purple-400" size={40} />
            <h3 className="text-xl font-semibold mb-2">Official Merchandise</h3>
            <p className="text-gray-400">
              Authentic products directly from your favorite artists
            </p>
          </div>
          <div className="p-6">
            <Music className="mx-auto mb-4 text-pink-400" size={40} />
            <h3 className="text-xl font-semibold mb-2">Stay Updated</h3>
            <p className="text-gray-400">
              Follow concerts, albums, and exclusive content
            </p>
          </div>
          <div className="p-6">
            <Mic2 className="mx-auto mb-4 text-red-400" size={40} />
            <h3 className="text-xl font-semibold mb-2">Fan Community</h3>
            <p className="text-gray-400">
              Connect with other fans and support your artists
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
