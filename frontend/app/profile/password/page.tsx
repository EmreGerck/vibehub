'use client';

import { useState } from 'react';
import { useChangePassword } from '../../../hooks/useProfile';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { toast } from '../../../store/toast.store';

export default function ProfilePasswordPage() {
  const changePassword = useChangePassword();
  
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    if (form.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    
    try {
      await changePassword.mutateAsync({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast('success', 'Password changed successfully');
      setMessage({ type: 'success', text: 'Password changed successfully. You will stay logged in on this device.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to change password'
      });
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Change Password</h2>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        {message && <Alert type={message.type} message={message.text} />}
        
        <div className="space-y-4">
          <Input 
            label="Current password" 
            type="password"
            value={form.currentPassword} 
            onChange={e => setForm({ ...form, currentPassword: e.target.value })} 
            required
          />
          
          <Input 
            label="New password" 
            type="password"
            value={form.newPassword} 
            onChange={e => setForm({ ...form, newPassword: e.target.value })} 
            placeholder="Minimum 8 characters"
            required
          />
          
          <Input 
            label="Confirm new password" 
            type="password"
            value={form.confirmPassword} 
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })} 
            required
            error={form.confirmPassword && form.newPassword !== form.confirmPassword ? 'Does not match' : undefined}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={changePassword.isPending}
          className="btn-primary mt-2"
        >
          {changePassword.isPending ? 'Changing password...' : 'Update password'}
        </button>
      </form>
    </>
  );
}
