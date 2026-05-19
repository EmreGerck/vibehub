'use client';

import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile } from '../../../hooks/useProfile';
import { useAuth } from '../../../hooks/useAuth';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { toast } from '../../../store/toast.store';

export default function ProfileSettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { deleteAccount, updateMarketingConsent } = useAuth();

  const [form, setForm] = useState({ name: '', phone: '' });
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError('');
    try {
      await deleteAccount.mutateAsync({ password: deletePassword });
      // onSettled in the hook handles redirect
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete account. Check your password.');
    }
  }

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await updateProfile.mutateAsync({
        name: form.name || undefined,
        phone: form.phone || undefined,
      });
      toast('success', 'Profile updated successfully');
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update profile'
      });
    }
  }

  if (isLoading) return <div className="py-12 flex justify-center"><Spinner /></div>;

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Account Settings</h2>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        {message && <Alert type={message.type} message={message.text} />}
        
        <div className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input 
              type="text" 
              value={profile?.email || ''} 
              disabled 
              className="input opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
          </div>
          
          <Input 
            label="Full name" 
            value={form.name} 
            onChange={e => setForm({ ...form, name: e.target.value })} 
            placeholder="John Doe"
          />
          
          <Input 
            label="Phone number" 
            value={form.phone} 
            onChange={e => setForm({ ...form, phone: e.target.value })} 
            type="tel"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="btn-primary mt-2"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* ── Marketing Consent ─────────────────────────────────────────── */}
      <div className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-lg font-semibold mb-1">Marketing Communications</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Manage whether you receive promotional emails and updates from us.
        </p>
        <label className="flex items-center gap-3 cursor-pointer group w-fit">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={profile?.marketingConsent ?? false}
              onChange={async (e) => {
                try {
                  await updateMarketingConsent.mutateAsync(e.target.checked);
                  toast('success', e.target.checked ? 'Marketing emails enabled' : 'Marketing emails disabled');
                } catch {
                  toast('error', 'Failed to update preference');
                }
              }}
              disabled={updateMarketingConsent.isPending}
            />
            {/* pill toggle */}
            <div className={`w-11 h-6 rounded-full transition-colors ${profile?.marketingConsent ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${profile?.marketingConsent ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {profile?.marketingConsent ? 'Enabled — receiving marketing emails' : 'Disabled — no marketing emails'}
          </span>
        </label>
      </div>

      {/* ── Danger Zone: Delete Account ─────────────────────────────── */}
      <div className="mt-12 border-t border-red-200 dark:border-red-900/40 pt-8">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
          Under KVKK Art. 11, you have the right to request erasure of your personal data.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="max-w-md space-y-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-5">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              ⚠️ This will permanently delete your account, orders, and all personal data. Enter your password to confirm.
            </p>
            {deleteError && <Alert type="error" message={deleteError} />}
            <Input
              label="Confirm password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your current password"
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleteAccount.isPending || !deletePassword}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
