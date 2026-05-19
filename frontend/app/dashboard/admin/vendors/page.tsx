'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminVendors, usePatchVendorStatus, usePatchCommission, useAdminUpdateTenant, useAdminCreateVendor } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';
import type { Tenant } from '../../../../types';

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: 'badge-yellow',
  ACTIVE: 'badge-green',
  FROZEN: 'badge-blue',
  REJECTED: 'badge-red',
};

export default function AdminVendorsPage() {
  const t = useI18n((s) => s.t);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [commissionModal, setCommissionModal] = useState<Tenant | null>(null);
  const [commissionValue, setCommissionValue] = useState('');
  const [editModal, setEditModal] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<{
    slug: string;
    displayName: string;
    artistType: string;
    bio: string;
    logoUrl: string;
    bannerUrl: string;
  }>({ slug: '', displayName: '', artistType: 'OTHER', bio: '', logoUrl: '', bannerUrl: '' });
  const [editError, setEditError] = useState('');

  const { data, isLoading } = useAdminVendors({ page, limit: 20, search: search || undefined, status: statusFilter || undefined });
  const patchStatus = usePatchVendorStatus();
  const patchCommission = usePatchCommission();
  const updateTenant = useAdminUpdateTenant();
  const createVendor = useAdminCreateVendor();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    slug: '',
    displayName: '',
    artistType: 'OTHER',
    status: 'ACTIVE',
    commissionRate: '0.10',
    bio: '',
    ownerEmail: '',
    ownerPassword: '',
    withOwner: false,
  });
  const [createError, setCreateError] = useState('');

  async function saveCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    try {
      await createVendor.mutateAsync({
        slug: createForm.slug.trim(),
        displayName: createForm.displayName.trim(),
        artistType: createForm.artistType,
        status: createForm.status,
        commissionRate: Number(createForm.commissionRate),
        bio: createForm.bio.trim() || undefined,
        ownerEmail: createForm.withOwner ? createForm.ownerEmail.trim() : undefined,
        ownerPassword: createForm.withOwner ? createForm.ownerPassword : undefined,
      });
      setCreateOpen(false);
      setCreateForm({
        slug: '',
        displayName: '',
        artistType: 'OTHER',
        status: 'ACTIVE',
        commissionRate: '0.10',
        bio: '',
        ownerEmail: '',
        ownerPassword: '',
        withOwner: false,
      });
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create vendor');
    }
  }

  async function setStatus(id: string, status: string) {
    try { await patchStatus.mutateAsync({ id, status }); } catch {}
  }

  async function saveCommission() {
    if (!commissionModal) return;
    const rate = parseFloat(commissionValue);
    if (isNaN(rate) || rate < 0 || rate > 1) return;
    try {
      await patchCommission.mutateAsync({ id: commissionModal.id, commissionRate: rate });
      setCommissionModal(null);
    } catch {}
  }

  function openEdit(vendor: Tenant) {
    setEditError('');
    setEditModal(vendor);
    setEditForm({
      slug: vendor.slug ?? '',
      displayName: vendor.displayName ?? '',
      artistType: (vendor.artistType as string) ?? 'OTHER',
      bio: vendor.bio ?? '',
      logoUrl: vendor.logoUrl ?? '',
      bannerUrl: vendor.bannerUrl ?? '',
    });
  }

  async function saveEdit() {
    if (!editModal) return;
    setEditError('');
    try {
      await updateTenant.mutateAsync({
        id: editModal.id,
        slug: editForm.slug,
        displayName: editForm.displayName,
        artistType: editForm.artistType,
        bio: editForm.bio,
        logoUrl: editForm.logoUrl,
        bannerUrl: editForm.bannerUrl,
      });
      setEditModal(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to save');
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('admin.vendors')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">+ New vendor</button>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.search')}
          className="input w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="PENDING_REVIEW">{t('admin.pendingReview')}</option>
          <option value="ACTIVE">{t('admin.active')}</option>
          <option value="FROZEN">{t('admin.frozen')}</option>
          <option value="REJECTED">{t('admin.rejected')}</option>
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
                  <th className="text-left px-5 py-3">{t('admin.vendor')}</th>
                  <th className="text-left px-5 py-3">{t('admin.type')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.commission')}</th>
                  <th className="text-left px-5 py-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((vendor: Tenant) => (
                  <tr key={vendor.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{vendor.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{vendor.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 capitalize">{vendor.artistType?.toLowerCase()}</td>
                    <td className="px-5 py-3">
                      <span className={STATUS_COLORS[vendor.status as string] ?? 'badge-gray'}>
                        {(vendor.status as string).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{(Number(vendor.commissionRate) * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(vendor.status as string) === 'PENDING_REVIEW' && (
                          <>
                            <button onClick={() => setStatus(vendor.id, 'ACTIVE')} className="text-xs bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg transition-colors">{t('admin.approve')}</button>
                            <button onClick={() => setStatus(vendor.id, 'REJECTED')} className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg transition-colors">{t('admin.reject')}</button>
                          </>
                        )}
                        {(vendor.status as string) === 'ACTIVE' && (
                          <button onClick={() => setStatus(vendor.id, 'FROZEN')} className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg transition-colors">{t('admin.freeze')}</button>
                        )}
                        {(vendor.status as string) === 'FROZEN' && (
                          <button onClick={() => setStatus(vendor.id, 'ACTIVE')} className="text-xs bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg transition-colors">{t('admin.unfreeze')}</button>
                        )}
                        <button
                          onClick={() => { setCommissionModal(vendor); setCommissionValue(String(Number(vendor.commissionRate))); }}
                          className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {t('admin.setCommission')}
                        </button>
                        <button
                          onClick={() => openEdit(vendor)}
                          className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {t('adminVendor.editProfile')}
                        </button>
                        <Link
                          href={`/dashboard/admin/vendors/${vendor.id}/permissions`}
                          className="text-xs bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {t('adminVendor.permissions')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {commissionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 w-80 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.setCommission')} — {commissionModal.displayName}</h3>
            <div>
              <label className="label">{t('admin.commissionRate')}</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.0001"
                value={commissionValue}
                onChange={e => setCommissionValue(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={saveCommission} disabled={patchCommission.isPending} className="flex-1 btn-primary">{t('admin.save')}</button>
              <button onClick={() => setCommissionModal(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={saveCreate} className="card p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">Create vendor</h3>
            {createError && <p className="text-red-600 dark:text-red-400 text-sm">{createError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slug *</label>
                <input
                  required
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                  placeholder="my-band"
                  pattern="[a-z0-9-]+"
                  className="input font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">Display name *</label>
                <input
                  required
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Artist type</label>
                <select
                  value={createForm.artistType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, artistType: e.target.value }))}
                  className="input"
                >
                  <option value="BAND">Band</option>
                  <option value="COMEDIAN">Comedian</option>
                  <option value="INFLUENCER">Influencer</option>
                  <option value="ARTIST">Artist</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  className="input"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending review</option>
                  <option value="FROZEN">Frozen</option>
                </select>
              </div>
              <div>
                <label className="label">Commission rate (0–1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.0001"
                  value={createForm.commissionRate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, commissionRate: e.target.value }))}
                  className="input"
                />
              </div>
              <div></div>
              <div className="col-span-2">
                <label className="label">Bio (optional)</label>
                <textarea
                  value={createForm.bio}
                  onChange={(e) => setCreateForm((f) => ({ ...f, bio: e.target.value }))}
                  className="input min-h-[60px]"
                />
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <input
                    type="checkbox"
                    checked={createForm.withOwner}
                    onChange={(e) => setCreateForm((f) => ({ ...f, withOwner: e.target.checked }))}
                    className="h-4 w-4 accent-purple-600"
                  />
                  Also create a VENDOR_OWNER user for this store
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Skip to create an unowned tenant — you can attach a user later via the Users page.
                </p>
              </div>
              {createForm.withOwner && (
                <>
                  <div>
                    <label className="label">Owner email</label>
                    <input
                      type="email"
                      required={createForm.withOwner}
                      value={createForm.ownerEmail}
                      onChange={(e) => setCreateForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Owner password</label>
                    <input
                      type="password"
                      minLength={8}
                      required={createForm.withOwner}
                      value={createForm.ownerPassword}
                      onChange={(e) => setCreateForm((f) => ({ ...f, ownerPassword: e.target.value }))}
                      className="input"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createVendor.isPending} className="flex-1 btn-primary">
                {createVendor.isPending ? 'Creating…' : 'Create vendor'}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('adminVendor.editTitle')} — {editModal.displayName}
            </h3>
            {editError && <p className="text-red-600 dark:text-red-400 text-sm">{editError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('adminVendor.slug')}</label>
                <input
                  value={editForm.slug}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('adminVendor.displayName')}</label>
                <input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('adminVendor.artistType')}</label>
                <select
                  value={editForm.artistType}
                  onChange={(e) => setEditForm((f) => ({ ...f, artistType: e.target.value }))}
                  className="input"
                >
                  <option value="BAND">{t('store.band')}</option>
                  <option value="COMEDIAN">{t('store.comedian')}</option>
                  <option value="INFLUENCER">{t('store.influencer')}</option>
                  <option value="ARTIST">{t('store.artist')}</option>
                  <option value="OTHER">{t('store.other')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('adminVendor.logoUrl')}</label>
                <input
                  value={editForm.logoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">{t('adminVendor.bannerUrl')}</label>
                <input
                  value={editForm.bannerUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, bannerUrl: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">{t('adminVendor.bio')}</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  className="input min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveEdit}
                disabled={updateTenant.isPending}
                className="flex-1 btn-primary"
              >
                {updateTenant.isPending ? t('adminVendor.saving') : t('adminVendor.save')}
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 btn-ghost">
                {t('admin.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
