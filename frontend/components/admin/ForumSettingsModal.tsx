'use client';

import { useState, useEffect } from 'react';
import type { Tenant } from '../../types';
import {
  useVendorForumSettings,
  usePatchVendorForumSettings,
  type ForumSettings,
} from '../../hooks/useAdmin';
import { useI18n } from '../../lib/i18n';

interface Props {
  vendor: Tenant;
  onClose: () => void;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200 dark:border-gray-800 pt-4 first:border-t-0 first:pt-0">
      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h4>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{description}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

export default function ForumSettingsModal({ vendor, onClose }: Props) {
  const { data: settings, isLoading } = useVendorForumSettings(vendor.id);
  const patch = usePatchVendorForumSettings();
  const t = useI18n((s) => s.t);

  const [form, setForm] = useState<Partial<ForumSettings>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled,
        requireApproval: settings.requireApproval,
        allowGuestView: settings.allowGuestView,
        moderationMode: settings.moderationMode,
        allowAnonymous: settings.allowAnonymous,
        minPostLength: settings.minPostLength,
        maxPostLength: settings.maxPostLength,
        allowImages: settings.allowImages,
        allowLinks: settings.allowLinks,
        allowMentions: settings.allowMentions,
        allowReactions: settings.allowReactions,
        allowReplies: settings.allowReplies,
        slowModeSeconds: settings.slowModeSeconds,
        visibility: settings.visibility,
        postingPolicy: settings.postingPolicy,
        bannedKeywords: settings.bannedKeywords,
        autoArchiveDays: settings.autoArchiveDays,
        welcomeMessage: settings.welcomeMessage,
        rulesText: settings.rulesText,
      });
    }
  }, [settings]);

  function update<K extends keyof ForumSettings>(key: K, value: ForumSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError('');
    try {
      await patch.mutateAsync({ id: vendor.id, settings: form });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('forumSettings.saveFailed'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>💬</span> {t('forumSettings.title')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {vendor.displayName} (@{vendor.slug}) — {t('forumSettings.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        {isLoading || !settings ? (
          <p className="text-sm text-gray-500 py-8 text-center">{t('common.loading')}</p>
        ) : (
          <div className="space-y-6">
            {/* Moderation */}
            <Section title={t('forumSettings.section.moderation')} description={t('forumSettings.section.moderationDesc')}>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('forumSettings.moderationMode')}</span>
                <select
                  value={form.moderationMode ?? 'OPEN'}
                  onChange={(e) => update('moderationMode', e.target.value as any)}
                  className="mt-1 input w-full"
                >
                  <option value="OPEN">{t('forumSettings.modeOpen')}</option>
                  <option value="PRE_MODERATED">{t('forumSettings.modePreModerated')}</option>
                  <option value="LOCKED">{t('forumSettings.modeLocked')}</option>
                </select>
              </label>
              <ToggleField
                label={t('forumSettings.allowAnonymous')}
                checked={!!form.allowAnonymous}
                onChange={(v) => update('allowAnonymous', v)}
                hint={t('forumSettings.allowAnonymousHint')}
              />
              <ToggleField
                label={t('forumSettings.requireApproval')}
                checked={!!form.requireApproval}
                onChange={(v) => update('requireApproval', v)}
                hint={t('forumSettings.requireApprovalHint')}
              />
            </Section>

            {/* Access & Posting Policy */}
            <Section title={t('forumSettings.section.access')}>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('forumSettings.visibility')}</span>
                <select
                  value={form.visibility ?? 'PUBLIC'}
                  onChange={(e) => update('visibility', e.target.value as any)}
                  className="mt-1 input w-full"
                >
                  <option value="PUBLIC">{t('forumSettings.visPublic')}</option>
                  <option value="MEMBERS_ONLY">{t('forumSettings.visMembers')}</option>
                  <option value="FOLLOWERS_ONLY">{t('forumSettings.visFollowers')}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('forumSettings.postingPolicy')}</span>
                <select
                  value={form.postingPolicy ?? 'EVERYONE'}
                  onChange={(e) => update('postingPolicy', e.target.value as any)}
                  className="mt-1 input w-full"
                >
                  <option value="EVERYONE">{t('forumSettings.policyEveryone')}</option>
                  <option value="VERIFIED_ONLY">{t('forumSettings.policyVerified')}</option>
                  <option value="FOLLOWERS_ONLY">{t('forumSettings.policyFollowers')}</option>
                </select>
              </label>
              <ToggleField
                label={t('forumSettings.allowGuestView')}
                checked={!!form.allowGuestView}
                onChange={(v) => update('allowGuestView', v)}
                hint={t('forumSettings.allowGuestViewHint')}
              />
            </Section>

            {/* Content rules */}
            <Section title={t('forumSettings.section.content')} description={t('forumSettings.section.contentDesc')}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('forumSettings.minPostLength')}</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={form.minPostLength ?? 1}
                    onChange={(e) => update('minPostLength', Number(e.target.value))}
                    className="mt-1 input w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('forumSettings.maxPostLength')}</span>
                  <input
                    type="number"
                    min={10}
                    max={100000}
                    value={form.maxPostLength ?? 5000}
                    onChange={(e) => update('maxPostLength', Number(e.target.value))}
                    className="mt-1 input w-full"
                  />
                </label>
              </div>
              <ToggleField label={t('forumSettings.allowImages')}   checked={!!form.allowImages}    onChange={(v) => update('allowImages', v)} />
              <ToggleField label={t('forumSettings.allowLinks')}    checked={!!form.allowLinks}     onChange={(v) => update('allowLinks', v)} />
              <ToggleField label={t('forumSettings.allowMentions')} checked={!!form.allowMentions}  onChange={(v) => update('allowMentions', v)} />
              <ToggleField label={t('forumSettings.allowReactions')} checked={!!form.allowReactions} onChange={(v) => update('allowReactions', v)} />
              <ToggleField label={t('forumSettings.allowReplies')}  checked={!!form.allowReplies}   onChange={(v) => update('allowReplies', v)} hint={t('forumSettings.allowRepliesHint')} />
            </Section>

            {/* Rate limit */}
            <Section title={t('forumSettings.section.rate')}>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('forumSettings.slowModeLabel')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={3600}
                  value={form.slowModeSeconds ?? 0}
                  onChange={(e) => update('slowModeSeconds', Number(e.target.value))}
                  className="mt-1 input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{t('forumSettings.slowModeHint')}</p>
              </label>
            </Section>

            {/* Auto-moderation */}
            <Section title={t('forumSettings.section.automod')}>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('forumSettings.bannedKeywords')}
                </span>
                <textarea
                  value={(form.bannedKeywords ?? []).join('\n')}
                  onChange={(e) =>
                    update(
                      'bannedKeywords',
                      e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  rows={4}
                  placeholder="spam&#10;scam&#10;crypto airdrop"
                  className="mt-1 input w-full font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('forumSettings.bannedKeywordsHint')}
                </p>
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('forumSettings.autoArchive')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={form.autoArchiveDays ?? 0}
                  onChange={(e) => update('autoArchiveDays', Number(e.target.value))}
                  className="mt-1 input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{t('forumSettings.autoArchiveHint')}</p>
              </label>
            </Section>

            {/* Community */}
            <Section title={t('forumSettings.section.community')}>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('forumSettings.welcomeMessage')}</span>
                <textarea
                  value={form.welcomeMessage ?? ''}
                  onChange={(e) => update('welcomeMessage', e.target.value || null)}
                  rows={2}
                  placeholder={t('forumSettings.welcomePlaceholder')}
                  className="mt-1 input w-full"
                  maxLength={1000}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('forumSettings.rulesText')}</span>
                <textarea
                  value={form.rulesText ?? ''}
                  onChange={(e) => update('rulesText', e.target.value || null)}
                  rows={4}
                  placeholder={t('forumSettings.rulesPlaceholder')}
                  className="mt-1 input w-full font-mono text-xs"
                  maxLength={20000}
                />
              </label>
            </Section>
          </div>
        )}

        {error && <p className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 mt-6 sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={save}
            disabled={isLoading || patch.isPending}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {patch.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button onClick={onClose} className="flex-1 btn-ghost">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
