'use client';

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  useAnalyticsOverview, useRevenueTrend, useUserGrowth,
  useTopProducts, useCustomerSegments, useOrderStatusBreakdown,
  useRoleBreakdown,
} from '../../../../hooks/useAdmin';
import { useAuthStore } from '../../../../store/auth.store';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const STATUS_COLORS: Record<string, string> = {
  PLACED: '#f59e0b',
  CONFIRMED: '#818cf8',
  SHIPPED: '#60a5fa',
  DELIVERED: '#34d399',
  CANCELLED: '#f87171',
  REFUNDED: '#94a3b8',
};

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: '#94a3b8',
  VENDOR_OWNER: '#60a5fa',
  VENDOR_MANAGER: '#818cf8',
  PLATFORM_ADMIN: '#a78bfa',
  GOD_USER: '#7c3aed',
};

function KpiCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string | number; sub?: string; icon: string; accent?: boolean;
}) {
  return (
    <div className={`card p-5 flex items-center gap-4 ${accent ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10' : ''}`}>
      <span className="text-3xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${accent ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{children}</h2>;
}

export default function AnalyticsDashboardPage() {
  const { user } = useAuthStore();
  const [revenueDays, setRevenueDays] = useState(30);

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: revenueTrend = [] } = useRevenueTrend(revenueDays);
  const { data: userGrowth = [] } = useUserGrowth(12);
  const { data: topProducts = [] } = useTopProducts();
  const { data: segments = [] } = useCustomerSegments();
  const { data: orderStatuses = [] } = useOrderStatusBreakdown();
  const { data: roles = [] } = useRoleBreakdown();

  if (user?.role !== 'GOD_USER') {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Analytics are only available to the platform owner.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Business intelligence from your platform data
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
          Live · refreshes every 5 min
        </div>
      </div>

      {/* KPI Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Users" value={overview.totalUsers.toLocaleString()} sub={`+${overview.newUsersThisMonth} this month`} icon="👥" />
          <KpiCard label="Revenue (Month)" value={`₺${overview.revenueThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`₺${overview.revenueAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })} all time`} icon="💰" accent />
          <KpiCard label="Orders (Month)" value={overview.ordersThisMonth.toLocaleString()} sub={`${overview.totalOrders.toLocaleString()} all time`} icon="📦" />
          <KpiCard label="Conversion Rate" value={`${overview.conversionRate}%`} sub="Registered → Purchased" icon="📈" accent />
          <KpiCard label="Active Vendors" value={overview.activeVendors.toLocaleString()} icon="🏪" />
          <KpiCard label="Live Products" value={overview.totalProducts.toLocaleString()} icon="🛍" />
          <KpiCard label="Buyers" value={overview.purchasers.toLocaleString()} sub="Have placed ≥1 order" icon="🛒" />
          <KpiCard label="Browsers" value={overview.browsers.toLocaleString()} sub="Registered, never ordered" icon="👀" />
        </div>
      ) : null}

      {/* Revenue Trend + Customer Segments */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Revenue Trend</SectionTitle>
            <div className="flex gap-1">
              {[7, 14, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setRevenueDays(d)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    revenueDays === d ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₺${(v/1000).toFixed(0)}k`} width={50} />
              <Tooltip
                formatter={(v: number) => [`₺${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Revenue']}
                labelFormatter={l => `Date: ${l}`}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <SectionTitle>Customer Segments</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="count"
                nameKey="segment"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={35}
              >
                {segments.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {segments.map(s => (
              <div key={s.segment} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{s.segment}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900 dark:text-white">{s.count.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">— {s.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Growth + Order Status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <SectionTitle>User Growth (Last 12 Weeks)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, 'New users']}
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <SectionTitle>Order Status Breakdown</SectionTitle>
          <div className="space-y-3 mt-2">
            {orderStatuses.map(s => {
              const total = orderStatuses.reduce((a, b) => a + b.count, 0);
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{s.status}</span>
                    <span className="text-gray-500">{s.count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] ?? '#94a3b8' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Products + Visitor Intel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <SectionTitle>Top Products by Units Sold</SectionTitle>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((p, i) => {
                const max = topProducts[0]?.qty ?? 1;
                const pct = Math.round((p.qty / max) * 100);
                return (
                  <div key={p.variantId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[220px]" title={`${p.productTitle} — ${p.vendorName}`}>
                        <span className="text-purple-500 font-bold mr-1">#{i + 1}</span>
                        {p.productTitle}
                        <span className="text-gray-400 ml-1">by {p.vendorName}</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white shrink-0 ml-2">{p.qty} units</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <SectionTitle>Visitor Intelligence (Google Analytics)</SectionTitle>
          {GA_ID ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                GA4 tracking active ({GA_ID})
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Full visitor analytics — demographics, acquisition channels, real-time users, and behavior flow — are available in your Google Analytics 4 dashboard.
              </p>
              <a
                href={`https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/intelligenthome`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                Open GA4 Dashboard ↗
              </a>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                {[
                  { label: 'Demographics', desc: 'Age, gender, location' },
                  { label: 'Acquisition', desc: 'How users find you' },
                  { label: 'Anonymous visitors', desc: 'Unregistered browse sessions' },
                  { label: 'Behavior flow', desc: 'Page paths & drop-offs' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                    <p className="mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                <span>⚠️</span> GA4 not configured
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connect Google Analytics 4 to track anonymous visitors, demographics, acquisition channels, and real-time activity that can't be captured from your database alone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
                <p className="font-sans font-semibold text-gray-900 dark:text-white mb-2">Setup in 3 steps:</p>
                <p>1. Create a GA4 property at <span className="text-purple-600">analytics.google.com</span></p>
                <p>2. Copy your Measurement ID (format: <strong>G-XXXXXXXXXX</strong>)</p>
                <p>3. Add <strong>NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX</strong> to Vercel environment variables and redeploy</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Health */}
      <div className="card p-6">
        <SectionTitle>Platform Composition</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {roles.map(r => (
            <div key={r.role} className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold"
                style={{ background: ROLE_COLORS[r.role] ?? '#94a3b8' }}
              >
                {r.count > 999 ? `${(r.count / 1000).toFixed(1)}k` : r.count}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{r.role.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
