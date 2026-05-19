'use client';

import { useState } from 'react';
import {
  useAdminPayouts,
  useCreatePayout,
  useUpdatePayoutStatus,
  useDeletePayout,
  useAdminVendors,
} from '../../../../hooks/useAdmin';
import { formatPrice } from '../../../../lib/format';
import { useI18n } from '../../../../lib/i18n';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow',
  PROCESSING: 'badge-blue',
  PAID: 'badge-green',
  FAILED: 'badge-red',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'PAID', 'FAILED'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED: ['PENDING'],
  PAID: [],
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoMonthAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function AdminPayoutsPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const { data, isLoading } = useAdminPayouts({
    page,
    limit: 20,
    status: statusFilter || undefined,
    tenantId: tenantFilter || undefined,
  });
  const { data: vendorList } = useAdminVendors({ limit: 200 });
  const create = useCreatePayout();
  const updateStatus = useUpdatePayoutStatus();
  const del = useDeletePayout();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tenantId: '',
    periodStart: isoMonthAgo(),
    periodEnd: isoToday(),
    grossAmount: '',
    platformFee: '',
    netAmount: '',
  });
  const [formError, setFormError] = useState('');
  const [statusModal, setStatusModal] = useState<{ payout: any; target: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.tenantId) {
      setFormError(t('adminPayout.vendor'));
      return;
    }
    try {
      await create.mutateAsync({
        tenantId: form.tenantId,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
        grossAmount: form.grossAmount ? Number(form.grossAmount) : undefined,
        platformFee: form.platformFee ? Number(form.platformFee) : undefined,
        netAmount: form.netAmount ? Number(form.netAmount) : undefined,
      });
      setForm({
        tenantId: '',
        periodStart: isoMonthAgo(),
        periodEnd: isoToday(),
        grossAmount: '',
        platformFee: '',
        netAmount: '',
      });
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create payout');
    }
  }

  async function runStatus() {
    if (!statusModal) return;
    try {
      await updateStatus.mutateAsync({
        id: statusModal.payout.id,
        status: statusModal.target,
        reason: statusReason || undefined,
      });
      setStatusModal(null);
      setStatusReason('');
    } catch {}
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminPayout.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('admin.cancel') : t('adminPayout.new')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('adminPayout.create')}</h2>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminPayout.autoCompute')}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="label">{t('adminPayout.vendor')}</label>
              <select
                value={form.tenantId}
                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                className="input"
              >
                <option value="">{t('adminPayout.select')}</option>
                {(vendorList?.items ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.displayName} (@{v.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('adminPayout.periodStart')}</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('adminPayout.periodEnd')}</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="input"
              />
            </div>
            <div></div>
            <div>
              <label className="label">{t('adminPayout.gross')}</label>
              <input
                type="number"
                step="0.01"
                value={form.grossAmount}
                onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('adminPayout.fee')}</label>
              <input
                type="number"
                step="0.01"
                value={form.platformFee}
                onChange={(e) => setForm((f) => ({ ...f, platformFee: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('adminPayout.net')}</label>
              <input
                type="number"
                step="0.01"
                value={form.netAmount}
                onChange={(e) => setForm((f) => ({ ...f, netAmount: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? t('adminPayout.creating') : t('adminPayout.create')}
          </button>
        </form>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('adminPayout.allStatuses')}</option>
          <option value="PENDING">{t('vendor.pending')}</option>
          <option value="PROCESSING">{t('admin.confirmed')}</option>
          <option value="PAID">{t('admin.delivered')}</option>
          <option value="FAILED">{t('admin.rejected')}</option>
        </select>
        <select
          value={tenantFilter}
          onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[12rem]"
        >
          <option value="">{t('adminPayout.allVendors')}</option>
          {(vendorList?.items ?? []).map((v: any) => (
            <option key={v.id} value={v.id}>{v.displayName}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('adminPayout.vendor')}</th>
                  <th className="text-left px-5 py-3">{t('adminPayout.colPeriod')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.gross')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.platformFee')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.net')}</th>
                  <th className="text-left px-5 py-3">{t('adminPayout.colStatus')}</th>
                  <th className="text-left px-5 py-3">{t('adminPayout.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((p: any) => {
                  const next = STATUS_TRANSITIONS[p.status] ?? [];
                  return (
                    <tr key={p.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-5 py-3">
                        <p className="text-gray-900 dark:text-white">{p.tenant?.displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">@{p.tenant?.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {new Date(p.periodStart).toLocaleDateString()} –{' '}
                        {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white">{formatPrice(p.grossAmount)}</td>
                      <td className="px-5 py-3 text-red-600 dark:text-red-400">-{formatPrice(p.platformFee)}</td>
                      <td className="px-5 py-3 text-green-600 dark:text-green-400 font-semibold">{formatPrice(p.netAmount)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {next.map((target) => (
                            <button
                              key={target}
                              onClick={() => { setStatusModal({ payout: p, target }); setStatusReason(''); }}
                              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                            >
                              → {target}
                            </button>
                          ))}
                          {p.status !== 'PAID' && (
                            <button
                              onClick={() => del.mutate(p.id)}
                              className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                            >
                              {t('adminPayout.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(data?.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      {t('adminPayout.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {statusModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {statusModal.payout.status} → {statusModal.target}
            </h3>
            <div>
              <label className="label">{t('adminPayout.statusReason')}</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="input min-h-[60px]"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={runStatus} disabled={updateStatus.isPending} className="flex-1 btn-primary">
                {updateStatus.isPending ? t('adminPayout.saving') : t('adminPayout.apply')}
              </button>
              <button onClick={() => setStatusModal(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
