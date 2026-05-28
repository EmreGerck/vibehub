'use client';

import Link from 'next/link';
import { useAdminOverview } from '../../../hooks/useAdmin';
import { Spinner } from '../../../components/ui/Spinner';

function StatCard({
  label,
  value,
  sub,
  href,
  color = 'purple',
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  color?: 'purple' | 'green' | 'blue' | 'yellow' | 'red';
}) {
  const border: Record<string, string> = {
    purple: 'border-purple-500',
    green: 'border-emerald-500',
    blue: 'border-blue-500',
    yellow: 'border-amber-500',
    red: 'border-rose-500',
  };
  const inner = (
    <div
      className={`card p-5 border-l-4 ${border[color]} hover:shadow-lg transition-shadow`}
    >
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

/** Compact action-required tile — animates a pulse for high-urgency counts. */
function ActionTile({
  href,
  icon,
  count,
  label,
  urgency,
}: {
  href: string;
  icon: string;
  count: number;
  label: string;
  urgency: 'high' | 'medium' | 'low';
}) {
  const cfg = {
    high:   { bg: 'bg-red-50 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    ring: 'ring-red-200 dark:ring-red-900/40 animate-pulse' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-900/40' },
    low:    { bg: 'bg-blue-50 dark:bg-blue-900/30',  text: 'text-blue-700 dark:text-blue-300',  ring: 'ring-blue-200 dark:ring-blue-900/40' },
  }[urgency];
  return (
    <Link
      href={href}
      className={`block rounded-xl ${cfg.bg} ${cfg.ring} ring-1 px-4 py-3 hover:scale-[1.02] transition-transform`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${cfg.text}`}>{count}</span>
      </div>
      <p className={`text-xs font-medium ${cfg.text}`}>{label}</p>
    </Link>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminOverview();

  // Pull action-required counts from overview (typed as `any` until shared types regenerate)
  const action = (data as any)?.actionRequired;
  const showActionRequired = action && action.totalActionable > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time snapshot — refreshes every 60 seconds
          </p>
        </div>
        {isLoading && <Spinner size="sm" />}
      </div>

      {error && (
        <div className="card p-4 border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-sm">
          Failed to load overview. Check your connection and try refreshing.
        </div>
      )}

      {/* ── ACTION REQUIRED — Top-priority operational inbox ───────────────── */}
      {showActionRequired && (
        <section className="-mb-2">
          <div className="card p-5 border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-950">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚡</span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Bana Bak — {action.totalActionable} işlem bekliyor
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Müşteriyi bekletmemek için bu işlemleri bugün halletmen önerilir
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {action.refundRequestsPending > 0 && (
                <ActionTile
                  href="/dashboard/admin/orders?status=REFUND_REQUESTED"
                  icon="↩️"
                  count={action.refundRequestsPending}
                  label="İade Talebi"
                  urgency="high"
                />
              )}
              {action.ordersAwaitingShipment > 0 && (
                <ActionTile
                  href="/dashboard/admin/orders?status=CONFIRMED"
                  icon="📦"
                  count={action.ordersAwaitingShipment}
                  label="Kargoya Çıkar"
                  urgency="medium"
                />
              )}
              {action.vendorApplicationsPending > 0 && (
                <ActionTile
                  href="/dashboard/admin/vendors?status=PENDING"
                  icon="🏪"
                  count={action.vendorApplicationsPending}
                  label="Bekleyen Satıcı"
                  urgency="medium"
                />
              )}
              {action.productsAwaitingApproval > 0 && (
                <ActionTile
                  href="/dashboard/admin/products"
                  icon="📝"
                  count={action.productsAwaitingApproval}
                  label="Ürün Onayı"
                  urgency="medium"
                />
              )}
              {action.returnShipmentsInTransit > 0 && (
                <ActionTile
                  href="/dashboard/admin/orders?status=REFUND_REQUESTED"
                  icon="🚚"
                  count={action.returnShipmentsInTransit}
                  label="Yolda İade"
                  urgency="low"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Orders & GMV */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Orders & Revenue
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total orders"
            value={data?.orders.total ?? '—'}
            sub="All time"
            href="/dashboard/admin/orders"
            color="purple"
          />
          <StatCard
            label="Orders (30d)"
            value={data?.orders.last30Days ?? '—'}
            sub="Last 30 days"
            href="/dashboard/admin/orders"
            color="purple"
          />
          <StatCard
            label="Total GMV"
            value={data ? formatCurrency(data.gmv.total) : '—'}
            sub="All time"
            href="/dashboard/admin/financials"
            color="green"
          />
          <StatCard
            label="GMV (30d)"
            value={data ? formatCurrency(data.gmv.last30Days) : '—'}
            sub="Last 30 days"
            href="/dashboard/admin/financials"
            color="green"
          />
        </div>
      </section>

      {/* Vendors & Users */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Vendors & Users
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active vendors"
            value={data?.vendors.active ?? '—'}
            href="/dashboard/admin/vendors"
            color="blue"
          />
          <StatCard
            label="Pending approval"
            value={data?.vendors.pending ?? '—'}
            href="/dashboard/admin/vendors?status=PENDING"
            color={data?.vendors.pending ? 'yellow' : 'blue'}
          />
          <StatCard
            label="Customers"
            value={data?.customers ?? '—'}
            href="/dashboard/admin/users"
            color="blue"
          />
          <StatCard
            label="Published products"
            value={data?.products ?? '—'}
            href="/dashboard/admin/products"
            color="blue"
          />
        </div>
      </section>

      {/* Action items */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Needs attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/admin/reviews" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <span className="text-3xl">⭐</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {data?.totalReviews ?? '—'} total reviews
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">All customer reviews</p>
            </div>
          </Link>

          <Link href="/dashboard/admin/vendors?status=PENDING" className="card p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <span className="text-3xl">🏪</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {data?.vendors.pending ?? '—'} vendors pending
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting review &amp; activation</p>
            </div>
            {(data?.vendors.pending ?? 0) > 0 && (
              <span className="ml-auto badge badge-yellow">{data!.vendors.pending}</span>
            )}
          </Link>
        </div>
      </section>

      {/* Recent audit events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recent activity
          </h2>
          <Link href="/dashboard/admin/audit-log" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
            View full log →
          </Link>
        </div>

        <div className="card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {isLoading && (
            <div className="flex justify-center p-6">
              <Spinner />
            </div>
          )}
          {!isLoading && !data?.recentAuditEvents.length && (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
          )}
          {data?.recentAuditEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{ev.action}</span>
                  {' on '}
                  <span className="font-medium">{ev.targetType}</span>
                  {ev.targetId && (
                    <span className="text-gray-400"> #{ev.targetId.slice(0, 8)}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ev.actorEmail}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(ev.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Quick links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/admin/banners', label: 'Banners', icon: '🖼' },
            { href: '/dashboard/admin/categories', label: 'Categories', icon: '🏷️' },
            { href: '/dashboard/admin/payouts', label: 'Payouts', icon: '💸' },
            { href: '/dashboard/admin/events', label: 'Events', icon: '🎫' },
            { href: '/dashboard/admin/nfc-tags', label: 'NFC Tags', icon: '📡' },
            { href: '/dashboard/admin/media', label: 'Media', icon: '🎵' },
            { href: '/dashboard/admin/settings', label: 'Settings', icon: '⚙️' },
            { href: '/dashboard/admin/analytics', label: 'Analytics', icon: '📈' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card p-4 flex items-center gap-3 hover:shadow-md hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
