'use client';

import { useState } from 'react';
import {
  useAdminReviews,
  useAdminUpdateReview,
  useAdminDeleteReview,
} from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';

export default function AdminReviewsPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');

  const { data, isLoading } = useAdminReviews({
    page,
    limit: 20,
    productId: productId || undefined,
    minRating: minRating ? Number(minRating) : undefined,
    maxRating: maxRating ? Number(maxRating) : undefined,
  });
  const updateReview = useAdminUpdateReview();
  const deleteReview = useAdminDeleteReview();

  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ rating: number; comment: string }>({ rating: 5, comment: '' });
  const [editError, setEditError] = useState('');

  const [confirmDel, setConfirmDel] = useState<any | null>(null);

  function openEdit(r: any) {
    setEditing(r);
    setEditForm({ rating: r.rating, comment: r.comment ?? '' });
    setEditError('');
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError('');
    try {
      await updateReview.mutateAsync({ id: editing.id, rating: editForm.rating, comment: editForm.comment });
      setEditing(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to save');
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    try {
      await deleteReview.mutateAsync(confirmDel.id);
      setConfirmDel(null);
    } catch {}
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminReview.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{data?.total ?? 0} {t('admin.total')}</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={productId}
          onChange={(e) => { setProductId(e.target.value); setPage(1); }}
          placeholder={t('adminReview.filterProduct')}
          className="input w-full sm:w-72 font-mono text-xs"
        />
        <input
          type="number"
          min="1"
          max="5"
          value={minRating}
          onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
          placeholder={t('adminReview.minStar')}
          className="input w-24"
        />
        <input
          type="number"
          min="1"
          max="5"
          value={maxRating}
          onChange={(e) => { setMaxRating(e.target.value); setPage(1); }}
          placeholder={t('adminReview.maxStar')}
          className="input w-24"
        />
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('adminReview.product')}</th>
                  <th className="text-left px-5 py-3">{t('adminReview.customer')}</th>
                  <th className="text-left px-5 py-3">{t('adminReview.rating')}</th>
                  <th className="text-left px-5 py-3">{t('adminReview.comment')}</th>
                  <th className="text-left px-5 py-3">{t('adminReview.date')}</th>
                  <th className="text-left px-5 py-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <td className="px-5 py-3 text-gray-900 dark:text-white">{r.product?.title}</td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.customer?.email}</td>
                    <td className="px-5 py-3 text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-md truncate">{r.comment ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                        >
                          {t('adminReview.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDel(r)}
                          className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                        >
                          {t('adminReview.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      {t('adminReview.none')}
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

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminReview.editTitle')}</h3>
            {editError && <p className="text-red-600 dark:text-red-400 text-sm">{editError}</p>}
            <div>
              <label className="label">{t('adminReview.ratingLabel')}</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editForm.rating}
                onChange={(e) => setEditForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('adminReview.commentLabel')}</label>
              <textarea
                value={editForm.comment}
                onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
                className="input min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={updateReview.isPending} className="flex-1 btn-primary">
                {updateReview.isPending ? t('adminReview.saving') : t('adminReview.save')}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminReview.deleteTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('adminReview.deletePermanent')}</p>
            <div className="flex gap-3">
              <button
                onClick={doDelete}
                disabled={deleteReview.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                {deleteReview.isPending ? t('adminReview.deleting') : t('adminReview.delete')}
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
