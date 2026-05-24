'use client';

import { useState } from 'react';
import { useChangePassword } from '../../../hooks/useProfile';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { toast } from '../../../store/toast.store';
import { useI18n } from '../../../lib/i18n';

export default function ProfilePasswordPage() {
  const changePassword = useChangePassword();
  const t = useI18n((s) => s.t);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: t('profile.password.noMatch') });
      return;
    }

    if (form.newPassword.length < 8) {
      setMessage({ type: 'error', text: t('profile.password.minLengthErr') });
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast('success', t('profile.password.successToast'));
      setMessage({ type: 'success', text: t('profile.password.success') });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || t('profile.password.failed'),
      });
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('profile.password.title')}</h2>

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        {message && <Alert type={message.type} message={message.text} />}

        <div className="space-y-4">
          <Input
            label={t('profile.password.current')}
            type="password"
            value={form.currentPassword}
            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            required
          />

          <Input
            label={t('profile.password.new')}
            type="password"
            value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
            placeholder={t('profile.password.minCharsHint')}
            required
          />

          <Input
            label={t('profile.password.confirm')}
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            required
            error={form.confirmPassword && form.newPassword !== form.confirmPassword ? t('profile.password.noMatch') : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={changePassword.isPending}
          className="btn-primary mt-2"
        >
          {changePassword.isPending ? t('profile.password.changing') : t('profile.password.update')}
        </button>
      </form>
    </>
  );
}
