'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600 dark:text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Order placed!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mb-8 break-all">
            Order #{id}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/profile/orders" className="btn-primary px-6 py-2.5 text-sm">
              View my orders
            </Link>
            <Link href="/" className="btn-ghost px-6 py-2.5 text-sm">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
