'use client';

import { useEffect, useState, type ReactNode } from 'react';

export type ConfirmDanger = 'info' | 'warning' | 'critical';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  /** Color & icon tone. `critical` requires the user to type `confirmPhrase`. */
  danger?: ConfirmDanger;
  /** Label for the confirm button. Default: "Onayla". */
  confirmLabel?: string;
  /** Label for the cancel button. Default: "Vazgeç". */
  cancelLabel?: string;
  /** If set + danger='critical', user must type this exact phrase to enable confirm. */
  confirmPhrase?: string;
  /** Show spinner on the confirm button. */
  busy?: boolean;
  /** Extra content inside the body (e.g., reason input, summary table). */
  children?: ReactNode;
}

const DANGER_CONFIG: Record<ConfirmDanger, { icon: string; ring: string; text: string; btn: string }> = {
  info: {
    icon: 'ℹ️',
    ring: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  warning: {
    icon: '⚠️',
    ring: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  critical: {
    icon: '🚨',
    ring: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

/**
 * Reusable confirmation modal. Use for any destructive or irreversible admin action.
 *
 * For `danger='critical'`, set `confirmPhrase` to require typed confirmation (prevents
 * fat-finger accidents on push broadcasts, maintenance mode toggles, etc).
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  danger = 'warning',
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  confirmPhrase,
  busy = false,
  children,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const cfg = DANGER_CONFIG[danger];

  // Reset typed text whenever modal opens
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const typedMatches = !confirmPhrase || typed === confirmPhrase;
  const canConfirm = !busy && typedMatches;

  async function handleConfirm() {
    if (!canConfirm) return;
    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md card p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${cfg.ring} ${cfg.text} text-2xl`}>
          {cfg.icon}
        </div>

        {/* Title + description */}
        <h2 className="text-center text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            {description}
          </div>
        )}

        {/* Slot for custom body */}
        {children && <div className="mt-4">{children}</div>}

        {/* Typed-to-confirm guard (critical only) */}
        {confirmPhrase && (
          <div className="mt-5">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              Devam etmek için <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">{confirmPhrase}</code> yazın
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="input"
              autoFocus
              autoComplete="off"
              disabled={busy}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-ghost flex-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cfg.btn}`}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                İşleniyor…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
