'use client';

import { useState } from 'react';
import { useVendorOrders, useUpdateOrderStatus } from '../../../../hooks/useOrders';
import { useCreateShipment } from '../../../../hooks/useCart';
import { useCan } from '../../../../hooks/usePermissions';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { toast } from '../../../../store/toast.store';
import { PermissionDenied } from '../../../../components/shared/PermissionDenied';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  SHIPPED:
    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  REFUNDED: 'badge-gray',
};

interface ShipmentDraft {
  orderId: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  receiverDistrict: string;
  weight: string;
  description: string;
  carrier: 'aras' | 'yurtici' | 'other';
  notes: string;
}

const EMPTY_DRAFT: ShipmentDraft = {
  orderId: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  receiverCity: '',
  receiverDistrict: '',
  weight: '1',
  description: '',
  carrier: 'aras',
  notes: '',
};

export default function VendorOrdersPage() {
  const t = useI18n((s) => s.t);
  const can = useCan();
  const canView = can('ORDER_VIEW');
  const canFulfill = can('ORDER_FULFILL');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useVendorOrders({ page, limit: 20, status: statusFilter || undefined });
  const updateStatus = useUpdateOrderStatus();
  const createShipment = useCreateShipment();

  // ── Shipment modal state ──────────────────────────────────────────────────
  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft | null>(null);
  const [shipmentError, setShipmentError] = useState<string | null>(null);

  async function handleConfirm(orderId: string) {
    try {
      await updateStatus.mutateAsync({ orderId, status: 'CONFIRMED' });
      toast('success', t('vendor.saved'));
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  function openShipModal(order: any) {
    const addr = order.shippingAddress ?? {};
    const description = (order.items ?? [])
      .map((it: any) => it?.variant?.product?.title)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') || 'Order items';
    setShipmentDraft({
      orderId: order.id,
      receiverName: addr.name ?? '',
      receiverPhone: addr.phone ?? '',
      receiverAddress: [addr.line1, addr.line2].filter(Boolean).join(', '),
      receiverCity: addr.city ?? '',
      receiverDistrict: addr.state ?? '',
      weight: '1',
      description: description.slice(0, 100),
      carrier: 'aras',
      notes: '',
    });
    setShipmentError(null);
  }

  async function handleSubmitShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!shipmentDraft) return;
    setShipmentError(null);

    const carrierForApi: 'aras' | 'yurtici' | undefined =
      shipmentDraft.carrier === 'other' ? undefined : shipmentDraft.carrier;

    try {
      // 1) Create the shipment FIRST. If this fails, do NOT transition status.
      await createShipment.mutateAsync({
        orderId: shipmentDraft.orderId,
        receiverName: shipmentDraft.receiverName,
        receiverPhone: shipmentDraft.receiverPhone,
        receiverAddress: shipmentDraft.receiverAddress,
        receiverCity: shipmentDraft.receiverCity,
        receiverDistrict: shipmentDraft.receiverDistrict,
        weight: parseFloat(shipmentDraft.weight) || 1,
        description: shipmentDraft.description,
        carrier: carrierForApi,
      });

      // 2) Only after shipment succeeds, mark order as SHIPPED
      await updateStatus.mutateAsync({ orderId: shipmentDraft.orderId, status: 'SHIPPED' });

      toast('success', t('vendor.saved'));
      setShipmentDraft(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('vendor.shipment.failed');
      setShipmentError(msg);
      toast('error', msg);
    }
  }

  if (!canView) {
    return <PermissionDenied requiredPermission="ORDER_VIEW" />;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('vendor.orders')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="PLACED">{t('admin.placed')}</option>
          <option value="CONFIRMED">{t('admin.confirmed')}</option>
          <option value="SHIPPED">{t('admin.shipped')}</option>
          <option value="DELIVERED">{t('admin.delivered')}</option>
          <option value="CANCELLED">{t('admin.cancelled')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : data?.items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('vendor.noOrdersFound')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('admin.order')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.items')}</th>
                  <th className="text-left px-5 py-3">{t('cart.total')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.date')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.action')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((order: any) => {
                  // Stage 2: surface the vendor's actual take per order (sum of
                  // vendorPayoutAmount across this vendor's items) + a "VibeHub gönderir"
                  // marker when any item in this order is co-manufactured.
                  const vendorTake = (order.items ?? []).reduce(
                    (s: number, i: any) => s + Number(i.vendorPayoutAmount ?? 0),
                    0,
                  );
                  const hasVibehubManaged = (order.items ?? []).some(
                    (i: any) => i.fulfilment === 'VIBEHUB_MANAGED',
                  );
                  return (
                  <tr key={order.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {order.id.slice(0, 8)}…
                      {hasVibehubManaged && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                          🏭 VibeHub
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{order.items?.length ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="text-gray-900 dark:text-white font-medium">{formatPrice(order.totalAmount)}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                        Senin payın: <strong>{formatPrice(vendorTake)}</strong>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'badge-gray'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {!canFulfill ? (
                        <span
                          className="text-xs text-gray-500 italic"
                          title={t('perm.revokedNote')}
                        >
                          {t('perm.fulfillDisabled')}
                        </span>
                      ) : (
                        <>
                          {order.status === 'PLACED' && (
                            <button
                              onClick={() => handleConfirm(order.id)}
                              disabled={updateStatus.isPending}
                              className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {t('vendor.markConfirmed')}
                            </button>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button
                              onClick={() => openShipModal(order)}
                              disabled={updateStatus.isPending || createShipment.isPending}
                              className="text-xs bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {t('vendor.markShipped')}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">
              {t('admin.prev')}
            </button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button
              disabled={(data?.items.length ?? 0) < 20}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost px-3 py-1 disabled:opacity-40"
            >
              {t('admin.next')}
            </button>
          </div>
        </>
      )}

      {/* ── Shipment Modal ───────────────────────────────────────────── */}
      {shipmentDraft && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm"
          onClick={() => !createShipment.isPending && !updateStatus.isPending && setShipmentDraft(null)}
        >
          <div
            className="w-full max-w-lg card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('vendor.shipment.modalTitle')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {shipmentDraft.orderId.slice(0, 8)}…
            </p>

            {shipmentError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                {shipmentError}
              </div>
            )}

            <form onSubmit={handleSubmitShipment} className="space-y-3">
              <div>
                <label className="label">{t('vendor.shipment.carrier')}</label>
                <select
                  value={shipmentDraft.carrier}
                  onChange={(e) =>
                    setShipmentDraft({
                      ...shipmentDraft,
                      carrier: e.target.value as ShipmentDraft['carrier'],
                    })
                  }
                  className="input"
                >
                  <option value="aras">{t('vendor.shipment.aras')}</option>
                  <option value="yurtici">{t('vendor.shipment.yurtici')}</option>
                  <option value="other">{t('vendor.shipment.other')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('vendor.shipment.weight')}</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={shipmentDraft.weight}
                    onChange={(e) => setShipmentDraft({ ...shipmentDraft, weight: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">{t('vendor.shipment.description')}</label>
                  <input
                    required
                    maxLength={100}
                    value={shipmentDraft.description}
                    onChange={(e) => setShipmentDraft({ ...shipmentDraft, description: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                {/* Tracking number is auto-generated by the carrier (or DEMO during dev) and emailed to the customer on shipment. */}
                Takip numarası kargo firması tarafından otomatik üretilir ve müşteriye e-posta ile gönderilir.
              </p>

              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                  {t('checkout.shippingAddress') ?? 'Receiver address'}
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="col-span-2">
                    <label className="label">Name</label>
                    <input
                      required
                      maxLength={100}
                      value={shipmentDraft.receiverName}
                      onChange={(e) => setShipmentDraft({ ...shipmentDraft, receiverName: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      required
                      maxLength={20}
                      value={shipmentDraft.receiverPhone}
                      onChange={(e) => setShipmentDraft({ ...shipmentDraft, receiverPhone: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input
                      required
                      maxLength={80}
                      value={shipmentDraft.receiverCity}
                      onChange={(e) => setShipmentDraft({ ...shipmentDraft, receiverCity: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input
                      required
                      maxLength={300}
                      value={shipmentDraft.receiverAddress}
                      onChange={(e) => setShipmentDraft({ ...shipmentDraft, receiverAddress: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">District</label>
                    <input
                      required
                      maxLength={80}
                      value={shipmentDraft.receiverDistrict}
                      onChange={(e) => setShipmentDraft({ ...shipmentDraft, receiverDistrict: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </details>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShipmentDraft(null)}
                  disabled={createShipment.isPending || updateStatus.isPending}
                  className="btn-ghost flex-1"
                >
                  {t('vendor.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createShipment.isPending || updateStatus.isPending}
                  className="btn-primary flex-1"
                >
                  {createShipment.isPending || updateStatus.isPending
                    ? t('vendor.shipment.creating')
                    : t('vendor.shipment.markShipped')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
