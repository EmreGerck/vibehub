'use client';

import { useState } from 'react';
import {
  useManufacturingUnits,
  useCreateManufacturingUnit,
  useUpdateManufacturingUnit,
  useDeleteManufacturingUnit,
  type ManufacturingUnit,
} from '../../../../hooks/useManufacturing';
import { useAuthStore } from '../../../../store/auth.store';

const EMPTY = { name: '', unitCostTRY: '', notes: '', active: true };

const tryFmt = (v: string | number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(v));

export default function AdminManufacturingPage() {
  const user = useAuthStore((s) => s.user);
  const isGod = user?.role === 'GOD_USER';

  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: units = [], isLoading } = useManufacturingUnits(includeInactive);
  const create = useCreateManufacturingUnit();
  const update = useUpdateManufacturingUnit();
  const remove = useDeleteManufacturingUnit();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isGod) {
    return (
      <div className="px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Erişim engellendi</h1>
        <p className="text-gray-400">
          Üretim birimleri yalnızca GOD_USER tarafından yönetilebilir. Maliyet bilgisi
          hassastır ve PLATFORM_ADMIN dahi kayıtları değiştiremez.
        </p>
      </div>
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
    setShowForm(true);
  }

  function openEdit(unit: ManufacturingUnit) {
    setEditingId(unit.id);
    setForm({
      name:        unit.name,
      unitCostTRY: String(unit.unitCostTRY),
      notes:       unit.notes ?? '',
      active:      unit.active,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name:        form.name.trim(),
      unitCostTRY: Number(form.unitCostTRY),
      notes:       form.notes.trim() || undefined,
      active:      form.active,
    };
    if (!payload.name || !Number.isFinite(payload.unitCostTRY) || payload.unitCostTRY <= 0) {
      setError('Ad ve birim maliyet zorunludur. Maliyet pozitif olmalıdır.');
      return;
    }

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Bir şeyler yanlış gitti');
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      await remove.mutateAsync(id);
      setDeleteId(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Silinemedi');
      setDeleteId(null);
    }
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Üretim Birimleri</h1>
          <p className="text-gray-400 text-sm mt-1">
            VibeHub-üretimli ürünlerin temel maliyet birimleri. Bu kayıtlar VIBEHUB_MANAGED
            ürünlere bağlanır ve sipariş anında kâr paylaşımı hesabında kullanılır.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
        >
          + Yeni Birim
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-surface-border bg-transparent"
          />
          Pasif birimleri de göster
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : units.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="mb-2">Henüz üretim birimi yok.</p>
          <p className="text-sm">İlk birimi oluşturarak başla — ör. "Oversize T-Shirt Beyaz — 300 TL".</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-gray-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Ad</th>
                <th className="text-right px-4 py-3 font-medium">Birim Maliyet</th>
                <th className="text-left px-4 py-3 font-medium">Notlar</th>
                <th className="text-center px-4 py-3 font-medium">Bağlı Ürün</th>
                <th className="text-center px-4 py-3 font-medium">Durum</th>
                <th className="text-right px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className={`border-t border-surface-border ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white tabular-nums">{tryFmt(u.unitCostTRY)}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{u.notes || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{u._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active
                        ? 'bg-green-900/30 text-green-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {u.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-brand-400 hover:text-brand-300 mr-3">Düzenle</button>
                    <button
                      onClick={() => setDeleteId(u.id)}
                      className={`hover:underline ${(u._count?.products ?? 0) > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-red-400 hover:text-red-300'}`}
                      title={(u._count?.products ?? 0) > 0 ? 'Önce bağlı ürünleri kaldır' : ''}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="card max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingId ? 'Üretim birimini düzenle' : 'Yeni üretim birimi'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-200">{error}</div>
              )}

              <div>
                <label className="label">Ad *</label>
                <input
                  className="input w-full"
                  placeholder="ör. Oversize T-Shirt Beyaz"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Birim maliyet (TRY) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input w-full"
                  placeholder="300"
                  value={form.unitCostTRY}
                  onChange={(e) => setForm((f) => ({ ...f, unitCostTRY: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Birim başına üretim maliyetin (KDV hariç). Satış anında bu rakam sabit kalır.
                </p>
              </div>

              <div>
                <label className="label">Notlar (isteğe bağlı)</label>
                <textarea
                  className="input resize-none w-full"
                  rows={3}
                  placeholder="ör. Tedarikçi X, MOQ 50, lead time 14 gün"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  maxLength={500}
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded border-surface-border bg-transparent"
                />
                <span className="text-sm text-gray-300">Aktif (yeni ürünlere bağlanabilir)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">İptal</button>
                <button type="submit" className="btn-primary" disabled={create.isPending || update.isPending}>
                  {editingId ? 'Kaydet' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Üretim birimini sil</h2>
            <p className="text-sm text-gray-400 mb-4">
              Bu işlem geri alınamaz. Bağlı ürün yoksa kayıt tamamen silinir; varsa hata alırsın.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost">İptal</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger" disabled={remove.isPending}>
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
