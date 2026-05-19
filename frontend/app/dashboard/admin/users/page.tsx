'use client';

import { useState, useEffect } from 'react';
import { usePageSize } from '../../../../hooks/usePageSize';
import { PageSizeSelector } from '../../../../components/ui/PageSizeSelector';
import {
  useAdminUsers,
  useCreateAdminUser,
  useAdminUpdateUser,
  useAdminDeleteUser,
  useAdminResetUserPassword,
} from '../../../../hooks/useAdmin';
import {
  usePermissionCatalog,
  useVendorPermissions,
  useSetVendorPermissions,
  useResetVendorPermissions,
  type VendorPermission,
} from '../../../../hooks/usePermissions';
import { useAuthStore } from '../../../../store/auth.store';
import { useI18n } from '../../../../lib/i18n';

const ROLE_COLORS: Record<string, string> = {
  GOD_USER: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  PLATFORM_ADMIN: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  VENDOR_OWNER: 'badge-blue',
  VENDOR_MANAGER: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200',
  CUSTOMER: 'badge-gray',
};

const ROLE_ACCESS_DESC: Record<string, { icon: string; title: string; desc: string }> = {
  GOD_USER: {
    icon: '⚡',
    title: 'Superadmin — Unrestricted',
    desc: 'Full access to everything. Cannot be limited.',
  },
  PLATFORM_ADMIN: {
    icon: '🛡',
    title: 'Platform Administrator',
    desc: 'Full access to admin panel: vendors, products, orders, payouts, events, NFC tags, settings, audit log, and user management.',
  },
  CUSTOMER: {
    icon: '🛒',
    title: 'Customer',
    desc: 'Can browse the shop, place orders, write reviews, and manage their wishlist. No dashboard access.',
  },
};

// ── Inline Permissions Panel (for vendor users) ───────────────────────────────

function VendorPermissionsPanel({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const { data: catalog = [], isLoading: catalogLoading } = usePermissionCatalog();
  const { data: granted = [], isLoading: grantedLoading } = useVendorPermissions(tenantId);
  const setPerms = useSetVendorPermissions();
  const resetPerms = useResetVendorPermissions();

  const [selected, setSelected] = useState<Set<VendorPermission>>(new Set());
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setSelected(new Set(granted as VendorPermission[]));
  }, [granted.join('|')]);

  const isLoading = catalogLoading || grantedLoading;

  const dirty = (() => {
    if (selected.size !== granted.length) return true;
    for (const p of granted) if (!selected.has(p as VendorPermission)) return true;
    return false;
  })();

  function toggle(p: VendorPermission) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  async function save() {
    await setPerms.mutateAsync({ tenantId, permissions: Array.from(selected) });
    setSavedAt(new Date());
  }

  async function reset() {
    await resetPerms.mutateAsync(tenantId);
    setConfirmReset(false);
    setSavedAt(new Date());
  }

  if (isLoading) {
    return (
      <td colSpan={6}>
        <div className="px-8 py-4 text-gray-400 text-sm">{`Loading permissions…`}</div>
      </td>
    );
  }

  return (
    <td colSpan={6} className="p-0">
      <div className="border-t border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
            🔑 Vendor Permissions
            <span className="font-normal text-purple-600 dark:text-purple-400 text-xs">
              {selected.size} / {catalog.length} granted
            </span>
          </h4>
          <div className="flex items-center gap-2">
            {savedAt && !dirty && (
              <span className="text-xs text-green-600 dark:text-green-400">✓ Saved {savedAt.toLocaleTimeString()}</span>
            )}
            {dirty && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
            <button
              onClick={() => setConfirmReset(true)}
              disabled={resetPerms.isPending}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
            >
              Reset defaults
            </button>
            <button
              onClick={save}
              disabled={!dirty || setPerms.isPending}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
            >
              {setPerms.isPending ? 'Saving…' : 'Save permissions'}
            </button>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map(entry => {
            const checked = selected.has(entry.permission as VendorPermission);
            return (
              <label
                key={entry.permission}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checked
                    ? 'bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-600 shadow-sm'
                    : 'bg-white/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(entry.permission as VendorPermission)}
                  className="h-4 w-4 mt-0.5 accent-purple-600 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white font-mono">
                    {entry.permission}
                    {entry.isDefault && (
                      <span className="ml-1.5 text-gray-400 font-sans font-normal">(default)</span>
                    )}
                    {!entry.isDefault && (
                      <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-sans font-normal">(opt-in)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{entry.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {confirmReset && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">Reset to platform defaults? This will restore all default permissions and remove opt-in ones.</p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={reset}
                disabled={resetPerms.isPending}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg"
              >
                {resetPerms.isPending ? 'Resetting…' : 'Reset'}
              </button>
              <button onClick={() => setConfirmReset(false)} className="text-xs btn-ghost py-1.5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </td>
  );
}

// ── Static role info panel (for non-vendor users) ─────────────────────────────

function RoleInfoPanel({ role, onClose }: { role: string; onClose: () => void }) {
  const info = ROLE_ACCESS_DESC[role];
  if (!info) return null;
  return (
    <td colSpan={6} className="p-0">
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-6 py-4 flex items-start gap-4">
        <span className="text-2xl shrink-0">{info.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{info.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{info.desc}</p>
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2">✕</button>
      </div>
    </td>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const t = useI18n((s) => s.t);
  const { user: currentUser } = useAuthStore();
  const isGodUser = currentUser?.role === 'GOD_USER';

  const [pageSize, setPageSize] = usePageSize('admin-users', 10);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'PLATFORM_ADMIN' });
  const [formError, setFormError] = useState('');

  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ email: string; name: string; role: string; tenantId: string }>(
    { email: '', name: '', role: 'CUSTOMER', tenantId: '' },
  );
  const [editError, setEditError] = useState('');

  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Track which user row has permissions expanded
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useAdminUsers(roleFilter || undefined);
  const createUser = useCreateAdminUser();
  const updateUser = useAdminUpdateUser();
  const deleteUserMut = useAdminDeleteUser();
  const resetPwd = useAdminResetUserPassword();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await createUser.mutateAsync(form);
      setForm({ email: '', password: '', role: 'PLATFORM_ADMIN' });
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create user');
    }
  }

  function openEdit(u: any) {
    setEditError('');
    setEditUser(u);
    setEditForm({
      email: u.email ?? '',
      name: u.name ?? '',
      role: u.role,
      tenantId: u.tenantId ?? '',
    });
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditError('');
    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        email: editForm.email,
        name: editForm.name || undefined,
        role: editForm.role,
        tenantId: editForm.tenantId || null,
      });
      setEditUser(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to update user');
    }
  }

  async function doReset() {
    if (!resetUser) return;
    setResetError('');
    setResetMsg('');
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    try {
      await resetPwd.mutateAsync({ id: resetUser.id, password: resetPassword });
      setResetMsg('Password reset. The user has been signed out everywhere.');
      setResetPassword('');
    } catch (err: any) {
      setResetError(err?.response?.data?.message ?? 'Failed to reset password');
    }
  }

  async function doDelete() {
    if (!deleteUser) return;
    setDeleteError('');
    try {
      await deleteUserMut.mutateAsync(deleteUser.id);
      setDeleteUser(null);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message ?? 'Failed to delete user');
    }
  }

  function toggleExpand(userId: string) {
    setExpandedUserId(prev => prev === userId ? null : userId);
  }

  const isVendorRole = (role: string) => role === 'VENDOR_OWNER' || role === 'VENDOR_MANAGER';

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.users')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{users?.length ?? 0} {t('admin.shown')} · Click a row to view/edit permissions</p>
        </div>
        <div className="flex gap-3 items-center">
          <PageSizeSelector value={pageSize} onChange={setPageSize} />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">{t('admin.allRoles')}</option>
            <option value="GOD_USER">{t('admin.godUser')}</option>
            <option value="PLATFORM_ADMIN">{t('admin.platformAdmin')}</option>
            <option value="VENDOR_OWNER">{t('admin.vendorOwner')}</option>
            <option value="VENDOR_MANAGER">{t('admin.vendorManager')}</option>
            <option value="CUSTOMER">{t('admin.customerRole')}</option>
          </select>
          {isGodUser && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? t('admin.cancel') : t('admin.newAdmin')}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('admin.createAdminUser')}</h2>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('admin.role')}</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="input"
              >
                <option value="PLATFORM_ADMIN">{t('admin.platformAdmin')}</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={createUser.isPending}
            className="btn-primary"
          >
            {createUser.isPending ? t('admin.creating') : t('admin.create')}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[740px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('auth.email')}</th>
                <th className="text-left px-5 py-3">{t('admin.role')}</th>
                <th className="text-left px-5 py-3">{t('admin.tenant')}</th>
                <th className="text-left px-5 py-3">{t('admin.joined')}</th>
                <th className="text-left px-5 py-3">Permissions</th>
                {isGodUser && <th className="text-left px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: any) => {
                const isExpanded = expandedUserId === u.id;
                const hasVendorPerms = isVendorRole(u.role) && !!u.tenantId;
                const hasRoleInfo = !!ROLE_ACCESS_DESC[u.role];

                return (
                  <>
                    <tr
                      key={u.id}
                      className={`border-b border-gray-200 dark:border-gray-800 cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-purple-50/50 dark:bg-purple-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                      }`}
                      onClick={() => (hasVendorPerms || hasRoleInfo) && toggleExpand(u.id)}
                    >
                      <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'badge-gray'}`}>
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {u.tenantId ? u.tenantId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        {hasVendorPerms ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(u.id); }}
                            className={`text-xs flex items-center gap-1 transition-colors ${
                              isExpanded ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                            }`}
                          >
                            <span>🔑</span>
                            {isExpanded ? 'Hide permissions' : 'View & edit permissions'}
                          </button>
                        ) : hasRoleInfo ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(u.id); }}
                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'View access level'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {isGodUser && (
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openEdit(u)}
                              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { setResetUser(u); setResetPassword(''); setResetError(''); setResetMsg(''); }}
                              className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg"
                            >
                              Reset pwd
                            </button>
                            {u.role !== 'GOD_USER' && u.id !== currentUser?.id && (
                              <button
                                onClick={() => { setDeleteUser(u); setDeleteError(''); }}
                                className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded permissions row */}
                    {isExpanded && (
                      <tr key={u.id + '-perms'} className="border-b border-gray-200 dark:border-gray-800">
                        {hasVendorPerms ? (
                          <VendorPermissionsPanel
                            tenantId={u.tenantId}
                            onClose={() => setExpandedUserId(null)}
                          />
                        ) : hasRoleInfo ? (
                          <RoleInfoPanel
                            role={u.role}
                            onClose={() => setExpandedUserId(null)}
                          />
                        ) : null}
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Edit user</h3>
            {editError && <p className="text-red-600 dark:text-red-400 text-sm">{editError}</p>}
            <div className="space-y-3">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="input"
                  disabled={editUser.role === 'GOD_USER'}
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR_OWNER">Vendor owner</option>
                  <option value="VENDOR_MANAGER">Vendor manager</option>
                  <option value="PLATFORM_ADMIN">Platform admin</option>
                  <option value="GOD_USER">God user</option>
                </select>
                {editUser.role === 'GOD_USER' && (
                  <p className="text-xs text-gray-500 mt-1">GOD_USER role cannot be downgraded.</p>
                )}
              </div>
              <div>
                <label className="label">Tenant ID (blank = none)</label>
                <input
                  value={editForm.tenantId}
                  onChange={(e) => setEditForm((f) => ({ ...f, tenantId: e.target.value }))}
                  placeholder="uuid"
                  className="input font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={updateUser.isPending} className="flex-1 btn-primary">
                {updateUser.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditUser(null)} className="flex-1 btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Reset password — {resetUser.email}
            </h3>
            {resetError && <p className="text-red-600 dark:text-red-400 text-sm">{resetError}</p>}
            {resetMsg && <p className="text-green-600 dark:text-green-400 text-sm">{resetMsg}</p>}
            <div>
              <label className="label">New password (min 8 chars)</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="input"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={doReset} disabled={resetPwd.isPending} className="flex-1 btn-primary">
                {resetPwd.isPending ? 'Resetting…' : 'Reset'}
              </button>
              <button onClick={() => setResetUser(null)} className="flex-1 btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Delete {deleteUser.email}?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This is permanent. Refused if the user has order or review history.
            </p>
            {deleteError && <p className="text-red-600 dark:text-red-400 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={doDelete}
                disabled={deleteUserMut.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                {deleteUserMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setDeleteUser(null)} className="flex-1 btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
