'use client';

import { useState, useEffect } from 'react';
import type { Tenant } from '../../types';
import { usePatchVendorFeatures, type VendorFeatures } from '../../hooks/useAdmin';

interface Props {
  vendor: Tenant;
  onClose: () => void;
  onOpenForumSettings: () => void;
}

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
  extraAction?: React.ReactNode;
}

function FeatureRow({ icon, title, description, enabled, onChange, extraAction }: FeatureRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            {description}
          </p>
          {extraAction && <div className="mt-2">{extraAction}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function VendorFeaturesModal({ vendor, onClose, onOpenForumSettings }: Props) {
  const patch = usePatchVendorFeatures();

  const [features, setFeatures] = useState<VendorFeatures>({
    forumEnabled: vendor.forumEnabled ?? true,
    mediaEnabled: vendor.mediaEnabled ?? true,
    eventsEnabled: vendor.eventsEnabled ?? true,
    nfcEnabled: vendor.nfcEnabled ?? true,
  });

  // Re-sync if the vendor prop changes (different vendor opened)
  useEffect(() => {
    setFeatures({
      forumEnabled: vendor.forumEnabled ?? true,
      mediaEnabled: vendor.mediaEnabled ?? true,
      eventsEnabled: vendor.eventsEnabled ?? true,
      nfcEnabled: vendor.nfcEnabled ?? true,
    });
  }, [vendor.id, vendor.forumEnabled, vendor.mediaEnabled, vendor.eventsEnabled, vendor.nfcEnabled]);

  const dirty =
    features.forumEnabled !== (vendor.forumEnabled ?? true) ||
    features.mediaEnabled !== (vendor.mediaEnabled ?? true) ||
    features.eventsEnabled !== (vendor.eventsEnabled ?? true) ||
    features.nfcEnabled !== (vendor.nfcEnabled ?? true);

  const [error, setError] = useState('');

  async function save() {
    setError('');
    try {
      await patch.mutateAsync({ id: vendor.id, features });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update features');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Vendor features
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {vendor.displayName} (@{vendor.slug})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Turn individual features on or off for this vendor. Disabled features
          are hidden from the storefront ribbon and their APIs return no data.
        </p>

        <div className="space-y-3">
          <FeatureRow
            icon="💬"
            title="Forum"
            description="Topics, replies, reactions, channels. Independent sub-settings (moderation, slow mode, content rules) when enabled."
            enabled={features.forumEnabled}
            onChange={(v) => setFeatures((f) => ({ ...f, forumEnabled: v }))}
            extraAction={
              features.forumEnabled ? (
                <button
                  type="button"
                  onClick={onOpenForumSettings}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Configure forum settings →
                </button>
              ) : null
            }
          />

          <FeatureRow
            icon="🎵"
            title="Media"
            description="Spotify / YouTube embeds shown on the vendor's storefront."
            enabled={features.mediaEnabled}
            onChange={(v) => setFeatures((f) => ({ ...f, mediaEnabled: v }))}
          />

          <FeatureRow
            icon="🎫"
            title="Events"
            description="Concert / tour listings on the vendor's storefront."
            enabled={features.eventsEnabled}
            onChange={(v) => setFeatures((f) => ({ ...f, eventsEnabled: v }))}
          />

          <FeatureRow
            icon="🏷️"
            title="NFC tags"
            description="Physical NFC tag management for this vendor."
            enabled={features.nfcEnabled}
            onChange={(v) => setFeatures((f) => ({ ...f, nfcEnabled: v }))}
          />
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={save}
            disabled={!dirty || patch.isPending}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {patch.isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="flex-1 btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
