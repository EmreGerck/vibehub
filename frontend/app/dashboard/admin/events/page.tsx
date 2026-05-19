'use client';

import { useState } from 'react';
import { useAdminEvents, useAdminCreateEvent, useAdminUpdateEvent, useAdminDeleteEvent } from '../../../../hooks/useEvents';
import { useAdminVendors } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import type { VendorEvent, EventProvider } from '../../../../types';

const PROVIDERS: EventProvider[] = ['BILETINO', 'BILETIX', 'BILETINIAL', 'OTHER'];

const PROVIDER_COLORS: Record<string, string> = {
  BILETINO: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  BILETIX: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  BILETINIAL: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  OTHER: 'badge-gray',
};

function emptyForm() {
  return { tenantId: '', title: '', description: '', href: '', provider: 'OTHER' as EventProvider, date: '', venue: '', imageUrl: '', active: true };
}

export default function AdminEventsPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [tenantFilter, setTenantFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');

  const { data, isLoading } = useAdminEvents({ page, limit: 20, tenantId: tenantFilter || undefined, provider: providerFilter as EventProvider || undefined });
  const { data: vendorList } = useAdminVendors({ limit: 100 });
  const create = useAdminCreateEvent();
  const update = useAdminUpdateEvent();
  const del = useAdminDeleteEvent();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const [editEvent, setEditEvent] = useState<VendorEvent | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editError, setEditError] = useState('');

  const [confirmDel, setConfirmDel] = useState<VendorEvent | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await create.mutateAsync({
        tenantId: form.tenantId,
        title: form.title,
        description: form.description || undefined,
        href: form.href,
        provider: form.provider,
        date: new Date(form.date).toISOString(),
        venue: form.venue || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create event');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editEvent) return;
    setEditError('');
    try {
      await update.mutateAsync({
        id: editEvent.id,
        title: editForm.title,
        description: editForm.description || undefined,
        href: editForm.href,
        provider: editForm.provider,
        date: new Date(editForm.date).toISOString(),
        venue: editForm.venue || undefined,
        imageUrl: editForm.imageUrl || undefined,
        active: editForm.active,
      });
      setEditEvent(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to update event');
    }
  }

  function openEdit(ev: VendorEvent) {
    setEditEvent(ev);
    setEditForm({
      tenantId: ev.tenantId,
      title: ev.title,
      description: ev.description ?? '',
      href: ev.href,
      provider: ev.provider,
      date: ev.date.slice(0, 16),
      venue: ev.venue ?? '',
      imageUrl: ev.imageUrl ?? '',
      active: ev.active,
    });
    setEditError('');
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('event.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('admin.cancel') : t('event.newEvent')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('event.createEvent')}</h2>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <EventFormFields form={form} setForm={setForm} vendorList={vendorList?.items ?? []} t={t} showVendor />
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? t('event.saving') : t('event.createEvent')}
          </button>
        </form>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">{t('event.allProviders')}</option>
          {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={tenantFilter} onChange={e => { setTenantFilter(e.target.value); setPage(1); }} className="input w-auto min-w-[12rem]">
          <option value="">{t('event.allVendors')}</option>
          {(vendorList?.items ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('event.title')}</th>
                  <th className="text-left px-5 py-3">{t('adminPayout.vendor')}</th>
                  <th className="text-left px-5 py-3">{t('event.date')}</th>
                  <th className="text-left px-5 py-3">{t('event.venue')}</th>
                  <th className="text-left px-5 py-3">{t('event.provider')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((ev: VendorEvent & { tenant?: any }) => (
                  <tr key={ev.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{ev.title}</p>
                      <a href={ev.href} target="_blank" rel="noreferrer" className="text-xs text-purple-500 hover:underline">↗ {t('event.ticketLink')}</a>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{(ev as any).tenant?.displayName ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{new Date(ev.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{ev.venue ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[ev.provider] ?? 'badge-gray'}`}>{ev.provider}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.active ? 'badge-green' : 'badge-red'}`}>
                        {ev.active ? t('event.active') : t('event.inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(ev)} className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg">{t('adminReview.edit')}</button>
                        <button onClick={() => update.mutate({ id: ev.id, active: !ev.active })} className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg">{t('event.toggle')}</button>
                        <button onClick={() => setConfirmDel(ev)} className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg">{t('event.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">{t('event.noEvents')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEdit} className="card p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('event.editEvent')}</h3>
            {editError && <p className="text-red-600 text-sm">{editError}</p>}
            <EventFormFields form={editForm} setForm={setEditForm} vendorList={vendorList?.items ?? []} t={t} showVendor={false} />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 accent-purple-600" />
              {t('event.active')}
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={update.isPending} className="flex-1 btn-primary">
                {update.isPending ? t('event.saving') : t('event.save')}
              </button>
              <button type="button" onClick={() => setEditEvent(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('event.deleteConfirm')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">"{confirmDel.title}"</p>
            <div className="flex gap-3">
              <button onClick={async () => { await del.mutateAsync(confirmDel.id); setConfirmDel(null); }} disabled={del.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                {del.isPending ? '…' : t('event.delete')}
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventFormFields({ form, setForm, vendorList, t, showVendor }: { form: any; setForm: any; vendorList: any[]; t: any; showVendor: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {showVendor && (
        <div className="col-span-2">
          <label className="label">{t('adminPayout.vendor')}</label>
          <select value={form.tenantId} onChange={e => setForm((f: any) => ({ ...f, tenantId: e.target.value }))} className="input" required>
            <option value="">{t('adminPayout.select')}</option>
            {vendorList.map((v: any) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
          </select>
        </div>
      )}
      <div className="col-span-2">
        <label className="label">{t('event.title')}</label>
        <input required value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">{t('event.date')}</label>
        <input required type="datetime-local" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">{t('event.provider')}</label>
        <select value={form.provider} onChange={e => setForm((f: any) => ({ ...f, provider: e.target.value }))} className="input">
          <option value="BILETINO">Biletino</option>
          <option value="BILETIX">Biletix</option>
          <option value="BILETINIAL">Biletinial</option>
          <option value="OTHER">{t('event.other')}</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="label">{t('event.ticketLink')}</label>
        <input required type="url" value={form.href} onChange={e => setForm((f: any) => ({ ...f, href: e.target.value }))} className="input" placeholder="https://..." />
      </div>
      <div>
        <label className="label">{t('event.venue')}</label>
        <input value={form.venue} onChange={e => setForm((f: any) => ({ ...f, venue: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">{t('event.imageUrl')}</label>
        <input type="url" value={form.imageUrl} onChange={e => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))} className="input" placeholder="https://..." />
      </div>
      <div className="col-span-2">
        <label className="label">{t('event.description')}</label>
        <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input resize-none" rows={2} />
      </div>
    </div>
  );
}
