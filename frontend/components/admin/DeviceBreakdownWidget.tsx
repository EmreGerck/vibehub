'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../types';
import { Spinner } from '../ui/Spinner';

interface DeviceBreakdown {
  windowDays: number;
  totalViews: number;
  brands: Array<{ label: string; count: number }>;
  models: Array<{ label: string; count: number }>;
  operatingSystems: Array<{ label: string; count: number }>;
  deviceTypes: Array<{ label: string; count: number }>;
}

function useDeviceBreakdown(days: number) {
  return useQuery({
    queryKey: ['admin-devices', days],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DeviceBreakdown>>('/analytics/devices', { params: { days } });
      return res.data.data;
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}

/**
 * Admin dashboard widget — shows what brand/model phones customers use.
 * "Most fans on Samsung Galaxy → make hoodie pocket fit S24 Ultra"
 */
export function DeviceBreakdownWidget() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useDeviceBreakdown(days);

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📱 Ziyaretçi Cihazları
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Son {days} gündeki sayfa görüntülemeleri · {data?.totalViews ?? '—'} kayıt
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                days === d
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400'
              }`}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : !data || data.totalViews === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          Henüz veri yok. Ziyaretçiler geldikçe burada görünecek.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DeviceList title="📱 En Çok Telefon Modelleri" items={data.models.slice(0, 8)} total={data.totalViews} />
          <DeviceList title="🏷️ Marka Dağılımı" items={data.brands.slice(0, 8)} total={data.totalViews} />
          <DeviceList title="💻 İşletim Sistemi" items={data.operatingSystems.slice(0, 6)} total={data.totalViews} />
          <DeviceList title="📊 Cihaz Tipi" items={data.deviceTypes.slice(0, 6)} total={data.totalViews} />
        </div>
      )}
    </section>
  );
}

function DeviceList({
  title, items, total,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  total: number;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
        <p className="text-xs text-gray-400">Veri yok</p>
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.count));

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      <div className="space-y-1.5">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          const widthPct = max > 0 ? (item.count / max) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-700 dark:text-gray-300 truncate pr-2" title={item.label}>{item.label}</span>
                <span className="text-gray-500 dark:text-gray-400 shrink-0">
                  {item.count.toLocaleString('tr-TR')} <span className="text-gray-400">({pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
