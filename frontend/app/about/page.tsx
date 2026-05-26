'use client';

import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useI18n } from '../../lib/i18n';
import { Reveal } from '../../components/ui/Reveal';

function StepCard({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center card p-8 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-purple-500/30">
        {number}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function AboutPage() {
  const t = useI18n((s) => s.t);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Hero */}
      <Reveal as="up">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900" />
          <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-purple-200 text-xs font-semibold uppercase tracking-widest mb-6">
              VibeHub
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              {t('about.subtitle')}
            </h1>
            <p className="text-purple-200 text-lg leading-relaxed max-w-2xl mx-auto">
              {t('about.heroDesc')}
            </p>
          </div>
        </section>
      </Reveal>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* How it works */}
        <Reveal as="up">
          <section>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-12">
              {t('about.howTitle')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StepCard number={1} title={t('about.step1Title')} desc={t('about.step1Desc')} />
              <StepCard number={2} title={t('about.step2Title')} desc={t('about.step2Desc')} />
              <StepCard number={3} title={t('about.step3Title')} desc={t('about.step3Desc')} />
            </div>
          </section>
        </Reveal>

        {/* Mission */}
        <Reveal as="up">
          <section className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800/30 p-10 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('about.missionTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              {t('about.missionDesc')}
            </p>
          </section>
        </Reveal>

        {/* CTA */}
        <Reveal as="up">
          <div className="text-center space-y-4">
            <Link href="/shop" className="btn-primary inline-flex px-8 py-3 text-base">
              {t('about.cta')} →
            </Link>
            <div>
              <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                ← {t('about.backToHome')}
              </Link>
            </div>
          </div>
        </Reveal>

      </div>

      <Footer />
    </div>
  );
}
