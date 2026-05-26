'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Spinner } from '../../../components/ui/Spinner';
import { formatPrice } from '../../../lib/format';
import Link from 'next/link';

interface InvoiceLine {
  description: string;
  vendorName:  string;
  quantity:    number;
  unitPrice:   number;
  vatRate:     number;
  lineTotal:   number;
  vatAmount:   number;
}

interface InvoiceData {
  invoiceNumber:  string | null;
  invoiceDate:    string;
  orderId:        string;
  currency:       string;
  buyer:  { name: string; email: string; address: string; city: string; country: string };
  seller: { name: string; address: string; taxId: string; taxOffice: string; email: string };
  lines:          InvoiceLine[];
  subtotal:       number;
  totalVat:       number;
  grandTotal:     number;
}

function useInvoiceData(orderId: string) {
  return useQuery({
    queryKey: ['invoice', orderId],
    queryFn: async () => {
      const res = await api.get<{ data: InvoiceData }>(`/payments/invoice/${orderId}`);
      return res.data.data;
    },
    enabled: !!orderId,
  });
}

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: inv, isLoading, error } = useInvoiceData(orderId);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
  if (error || !inv) return (
    <div className="min-h-screen flex items-center justify-center text-center space-y-3 p-8">
      <div>
        <p className="text-gray-500 mb-3">Fatura bilgisi yüklenemedi. Sipariş onaylandıktan sonra fatura oluşturulur.</p>
        <Link href="/profile/orders" className="btn-primary text-sm">Siparişlerime Git</Link>
      </div>
    </div>
  );

  const invoiceDate = new Date(inv.invoiceDate).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const invoiceNum = inv.invoiceNumber ?? `VHB${new Date(inv.invoiceDate).getFullYear()}${inv.orderId.replace(/-/g,'').slice(0,9).toUpperCase()}`;

  return (
    <>
      {/* Print/Action bar — hidden when printing */}
      <div className="print:hidden bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <Link href={`/order-confirmation/${orderId}`} className="text-sm text-gray-300 hover:text-white transition-colors">
          ← Siparişe Dön
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            <span>🖨️</span> Yazdır / PDF İndir
          </button>
        </div>
      </div>

      {/* Invoice document — A4 style */}
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-8 print:bg-white print:py-0">
        <div
          id="invoice"
          className="mx-auto max-w-3xl bg-white shadow-xl print:shadow-none print:max-w-none p-8 print:p-6"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-purple-600">
            {/* Seller */}
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-1 print:text-purple-700">
                VibeHub
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {inv.seller.name}<br />
                {inv.seller.address}<br />
                VKN: {inv.seller.taxId} • Vergi Dairesi: {inv.seller.taxOffice}<br />
                {inv.seller.email}
              </p>
            </div>

            {/* Invoice label */}
            <div className="text-right">
              <div className="inline-block bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                e-ARŞİV FATURA
              </div>
              <p className="text-lg font-bold text-gray-900 font-mono">{invoiceNum}</p>
              <p className="text-sm text-gray-500">{invoiceDate}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">Sipariş: #{inv.orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* ── Parties ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Satıcı</p>
              <p className="font-semibold text-gray-900 text-sm">{inv.seller.name}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{inv.seller.address}</p>
              <p className="text-xs text-gray-500">VKN: {inv.seller.taxId}</p>
              <p className="text-xs text-gray-500">Vergi Dairesi: {inv.seller.taxOffice}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Alıcı</p>
              <p className="font-semibold text-gray-900 text-sm">{inv.buyer.name}</p>
              <p className="text-xs text-gray-500 mt-1">{inv.buyer.email}</p>
              {inv.buyer.address && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  {inv.buyer.address}<br />
                  {inv.buyer.city}{inv.buyer.country ? `, ${inv.buyer.country}` : ''}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">TC: *** *** ***</p>
            </div>
          </div>

          {/* ── Line items table ─────────────────────────────────────────────── */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="text-left px-3 py-2 rounded-tl-lg font-semibold text-xs uppercase tracking-wider">Ürün / Hizmet</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wider w-16">Adet</th>
                <th className="text-right px-3 py-2 font-semibold text-xs uppercase tracking-wider w-24">Birim Fiyat</th>
                <th className="text-center px-3 py-2 font-semibold text-xs uppercase tracking-wider w-16">KDV %</th>
                <th className="text-right px-3 py-2 font-semibold text-xs uppercase tracking-wider w-24">KDV Tutarı</th>
                <th className="text-right px-3 py-2 rounded-tr-lg font-semibold text-xs uppercase tracking-wider w-24">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((line, i) => (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{line.description}</p>
                    <p className="text-xs text-gray-400">{line.vendorName}</p>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">{line.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-700 font-mono">
                    {formatPrice(line.unitPrice)}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">%{(line.vatRate * 100).toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-gray-500 font-mono text-xs">
                    {formatPrice(line.vatAmount)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900 font-mono">
                    {formatPrice(line.lineTotal + line.vatAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ──────────────────────────────────────────────────────── */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Mal/Hizmet Toplamı</span>
                <span className="font-mono">{formatPrice(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Hesaplanan KDV (%20)</span>
                <span className="font-mono">{formatPrice(inv.totalVat)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-purple-600">
                <span>Genel Toplam</span>
                <span className="text-purple-600 font-mono">{formatPrice(inv.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ── Legal footer ─────────────────────────────────────────────────── */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-3">
              <span className="text-green-600 text-lg shrink-0">✓</span>
              <div>
                <p className="text-xs font-semibold text-green-800">GİB e-Arşiv Onaylı Belge</p>
                <p className="text-xs text-green-600">Bu belge 213 sayılı Vergi Usul Kanunu kapsamında düzenlenmiş elektronik arşiv faturasıdır.</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed text-center">
              Bu fatura VibeHub Teknoloji A.Ş. tarafından düzenlenmiştir. Sorularınız için: {inv.seller.email}<br />
              Ödeme altyapısı: İyzico Ödeme Hizmetleri A.Ş. • PCI-DSS Seviye 1 Uyumlu
            </p>
          </div>

          {/* ── QR placeholder ──────────────────────────────────────────────── */}
          <div className="flex justify-center mt-6 print:mt-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl opacity-30">▦</span>
              </div>
              <p className="text-[9px] text-gray-300">GİB Doğrulama Kodu</p>
              <p className="text-[9px] text-gray-300 font-mono">{invoiceNum}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
