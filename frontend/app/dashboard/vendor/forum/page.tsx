'use client';

import { useState } from 'react';
import { useAuthStore } from '../../../../store/auth.store';
import {
  useForumSettings,
  useUpdateForumSettings,
  useForumTopics,
  useForumChannels,
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useTogglePin,
  useToggleLock,
  useDeleteTopic,
} from '../../../../hooks/useForum';
import { useI18n } from '../../../../lib/i18n';
import type { ForumTopic, ForumChannel } from '../../../../types';

// ── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Channel row ───────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  onUpdate,
  onDelete,
}: {
  channel: ForumChannel & { _count?: { topics: number } };
  onUpdate: (id: string, data: { name?: string; emoji?: string; description?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.name);
  const [emoji, setEmoji] = useState(channel.emoji);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
      {editing ? (
        <>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className="w-12 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={() => { onUpdate(channel.id, { name, emoji }); setEditing(false); }}
            className="text-xs px-2.5 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            Kaydet
          </button>
          <button onClick={() => { setEditing(false); setName(channel.name); setEmoji(channel.emoji); }} className="text-xs text-gray-500">İptal</button>
        </>
      ) : (
        <>
          <span className="text-xl w-8 text-center">{channel.emoji}</span>
          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{channel.name}</span>
          <span className="text-xs text-gray-400">{(channel as any)._count?.topics ?? 0} konu</span>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Düzenle
          </button>
          <button
            onClick={() => onDelete(channel.id)}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Sil
          </button>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VendorForumPage() {
  const t = useI18n((s) => s.t);
  const { user } = useAuthStore();
  const tenantId = user?.tenantId ?? '';

  const { data: settings, isLoading: settingsLoading } = useForumSettings(tenantId);
  const { data: channels = [], isLoading: channelsLoading } = useForumChannels(tenantId);
  const { data: topicsData, isLoading: topicsLoading } = useForumTopics(tenantId, { limit: 20 });
  const updateSettings = useUpdateForumSettings();
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const togglePin = useTogglePin();
  const toggleLock = useToggleLock();
  const deleteTopic = useDeleteTopic();

  const [confirmDel, setConfirmDel] = useState<ForumTopic | null>(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChName, setNewChName] = useState('');
  const [newChEmoji, setNewChEmoji] = useState('💬');
  const [newChSlug, setNewChSlug] = useState('');

  async function handleToggle(key: 'enabled' | 'requireApproval' | 'allowGuestView') {
    if (!settings) return;
    await updateSettings.mutateAsync({ [key]: !settings[key] });
  }

  async function handleCreateChannel() {
    if (!newChName.trim() || !newChSlug.trim()) return;
    await createChannel.mutateAsync({ name: newChName.trim(), slug: newChSlug.trim(), emoji: newChEmoji });
    setNewChName('');
    setNewChSlug('');
    setNewChEmoji('💬');
    setShowNewChannel(false);
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forum Yönetimi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kanalları düzenle, konuları yönet ve forum ayarlarını yapılandır.</p>
      </div>

      {/* Settings */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">Forum Ayarları</h2>
        {settingsLoading ? (
          <p className="text-gray-400 text-sm">Yükleniyor…</p>
        ) : settings && (
          <div className="card p-5 space-y-4">
            {([
              ['enabled', 'Forumu Etkinleştir', 'Ziyaretçiler forumu görebilir ve üyeler konu açabilir.'],
              ['requireApproval', 'Moderasyon Gerektir', 'Yeni konular yayınlanmadan önce onaylanmalıdır.'],
              ['allowGuestView', 'Misafir Görüntüleme', 'Giriş yapmadan forum konuları görüntülenebilir.'],
            ] as const).map(([key, label, desc]) => (
              <label key={key} className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Toggle value={settings[key as keyof typeof settings] as boolean} onChange={() => handleToggle(key as any)} disabled={updateSettings.isPending} />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Channel Manager */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Kanallar</h2>
            <p className="text-xs text-gray-400 mt-0.5">Hayranların tartışma yapabileceği kategoriler</p>
          </div>
          <button
            onClick={() => setShowNewChannel(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            + Kanal Ekle
          </button>
        </div>

        {channelsLoading ? (
          <p className="text-gray-400 text-sm">Yükleniyor…</p>
        ) : (
          <div className="space-y-2">
            {channels.map((ch: any) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                onUpdate={(id, data) => updateChannel.mutate({ channelId: id, ...data })}
                onDelete={(id) => deleteChannel.mutate(id)}
              />
            ))}
            {channels.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">Henüz kanal yok. İlk kanalı oluştur!</p>
            )}
          </div>
        )}

        {/* New channel form */}
        {showNewChannel && (
          <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10 space-y-3">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">Yeni Kanal</p>
            <div className="flex gap-2">
              <input
                value={newChEmoji}
                onChange={(e) => setNewChEmoji(e.target.value)}
                maxLength={4}
                placeholder="💬"
                className="w-14 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                value={newChName}
                onChange={(e) => {
                  setNewChName(e.target.value);
                  setNewChSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }}
                placeholder="Kanal adı (örn. Genel)"
                maxLength={60}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slug (URL'de kullanılır)</label>
              <input
                value={newChSlug}
                onChange={(e) => setNewChSlug(e.target.value)}
                placeholder="genel"
                maxLength={60}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewChannel(false)} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">İptal</button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChName.trim() || !newChSlug.trim() || createChannel.isPending}
                className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {createChannel.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Topics table */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">Son Konular</h2>
        {topicsLoading ? (
          <p className="text-gray-400 text-sm">Yükleniyor…</p>
        ) : !topicsData?.items.length ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-12 text-sm">Henüz konu yok.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">Başlık</th>
                  <th className="text-left px-5 py-3">Kanal</th>
                  <th className="text-left px-5 py-3">Yazar</th>
                  <th className="text-center px-5 py-3">Yanıt</th>
                  <th className="text-center px-5 py-3">Görüntülenme</th>
                  <th className="text-left px-5 py-3">Durum</th>
                  <th className="text-left px-5 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {topicsData.items.map((topic: ForumTopic) => (
                  <tr key={topic.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{topic.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        {topic.isVendorPost && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">🎤 Artist</span>
                        )}
                        {topic.hasArtistReply && !topic.isVendorPost && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">✅ Cevaplandı</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {topic.channel ? `${topic.channel.emoji} ${topic.channel.name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 truncate max-w-[120px]">
                      {topic.author?.name ?? topic.author?.email?.split('@')[0] ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">{topic._count?.replies ?? 0}</td>
                    <td className="px-5 py-3 text-center text-gray-400">👁 {topic.viewCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {topic.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">📌</span>}
                        {topic.locked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700">🔒</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => togglePin.mutate(topic.id)} className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                          {topic.pinned ? 'Sabiti kaldır' : 'Sabitle'}
                        </button>
                        <button onClick={() => toggleLock.mutate(topic.id)} className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg">
                          {topic.locked ? 'Kilidi aç' : 'Kilitle'}
                        </button>
                        <button onClick={() => setConfirmDel(topic)} className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-300 px-2 py-1 rounded-lg">
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete confirm modal */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Konuyu sil?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">"{confirmDel.title}" konusu ve tüm yanıtları kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button
                onClick={async () => { await deleteTopic.mutateAsync(confirmDel.id); setConfirmDel(null); }}
                disabled={deleteTopic.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                {deleteTopic.isPending ? '…' : 'Sil'}
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-ghost">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
