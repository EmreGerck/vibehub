'use client';

import { useEffect, useState } from 'react';
import { useToastStore, type Toast } from '../../store/toast.store';

const COLORS: Record<string, string> = {
  success: 'from-emerald-500 to-green-600',
  error: 'from-rose-500 to-red-600',
  info: 'from-purple-500 to-pink-600',
};

const ACCENT: Record<string, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  info: 'bg-purple-500',
};

const DURATION_MS = 3600;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const showId = requestAnimationFrame(() => setVisible(true));
    const leaveId = setTimeout(() => setLeaving(true), DURATION_MS - 250);
    return () => {
      cancelAnimationFrame(showId);
      clearTimeout(leaveId);
    };
  }, []);

  function dismiss() {
    setLeaving(true);
    setTimeout(onRemove, 200);
  }

  return (
    <div
      className={`relative overflow-hidden flex items-center gap-3 pl-3 pr-3 py-3 rounded-xl shadow-2xl text-white text-sm font-medium border border-white/10 transition-all duration-300 ease-out-expo will-change-transform ${
        leaving
          ? 'translate-x-4 opacity-0 scale-95'
          : visible
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-8 opacity-0 scale-95'
      }`}
      style={{ background: 'rgba(17, 24, 39, 0.92)', backdropFilter: 'blur(14px)' }}
    >
      {/* Left accent stripe */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${ACCENT[toast.type]}`} />
      {/* Animated progress bar */}
      <span
        className={`absolute left-0 bottom-0 h-0.5 ${ACCENT[toast.type]} origin-left`}
        style={{ animation: `toastProgress ${DURATION_MS}ms linear forwards` }}
      />
      <span className={`flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br ${COLORS[toast.type]} shadow-md shrink-0`}>
        <ToastIcon type={toast.type} />
      </span>
      <span className="flex-1 pr-2">{toast.message}</span>
      <button
        onClick={dismiss}
        className="text-white/40 hover:text-white hover:scale-110 active:scale-95 transition-all ml-1 shrink-0"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ type }: { type: string }) {
  if (type === 'success') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pop">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pop">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pop">
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function Toaster() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  );
}
