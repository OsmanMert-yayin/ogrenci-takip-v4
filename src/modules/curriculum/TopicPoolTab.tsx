import React, { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { TopicCategory, TopicPoolItem } from '../../types';
import { createId } from '../../utils/id';
import { SUBGROUP_SUGGESTIONS, TOPIC_CATEGORIES } from './curriculumConstants';

interface TopicRowProps {
  topic: TopicPoolItem;
  index: number;
  total: number;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onEdit: (topic: TopicPoolItem) => void;
  onDelete: (topic: TopicPoolItem) => void;
}

const TopicRow: React.FC<TopicRowProps> = React.memo(
  ({ topic, index, total, onMove, onEdit, onDelete }) => (
    <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <span className="font-mono text-xs text-slate-400 tabular-nums pt-0.5 w-6 shrink-0">
          {index + 1}.
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 leading-snug">
            {topic.title}
            {!topic.isActive && (
              <span className="ml-2 text-xs font-normal text-amber-700">· Pasif</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
            <span className="font-medium text-emerald-700">{topic.category}</span>
            {topic.subGroup && (
              <>
                <span aria-hidden="true">·</span>
                <span>{topic.subGroup}</span>
              </>
            )}
            {topic.cuzNo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{topic.cuzNo}. Cüz</span>
              </>
            )}
            {topic.pageRange && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Syf. {topic.pageRange}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(topic.id, 'up')}
          aria-label="Yukarı taşı"
          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(topic.id, 'down')}
          aria-label="Aşağı taşı"
          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(topic)}
          aria-label="Konuyu düzenle"
          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(topic)}
          aria-label="Konuyu sil"
          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
);

TopicRow.displayName = 'TopicRow';

const emptyTopic = (nextOrder: number, defaultCategory: TopicCategory): TopicPoolItem => ({
  id: '',
  title: '',
  category: defaultCategory,
  subGroup: SUBGROUP_SUGGESTIONS[defaultCategory][0] ?? '',
  cuzNo: undefined,
  pageRange: '',
  order: nextOrder,
  isActive: true,
  notes: '',
});

export const TopicPoolTab: React.FC = () => {
  const { db, upsertTopic, deleteTopic, reorderTopic, showToast } = useAppStore();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TopicPoolItem>(() => emptyTopic(1, 'Ezber'));

  const subGroupOptions = useMemo(() => {
    const set = new Set<string>();
    db.topicPool.forEach((t) => {
      if (t.subGroup) set.add(t.subGroup);
    });
    return Array.from(set).map((sg) => ({ value: sg, label: sg }));
  }, [db.topicPool]);

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'category',
        label: 'Kategori',
        type: 'select',
        placeholder: 'Kategori: Tümü',
        options: TOPIC_CATEGORIES.map((c) => ({ value: c, label: c })),
      },
      {
        id: 'q',
        label: 'Konu / Sure Ara',
        type: 'search',
        placeholder: 'Sure, dua, tecvid kuralı veya konu ara...',
      },
    ],
    []
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'subGroup',
        label: 'Alt Grup',
        type: 'select',
        placeholder: 'Alt Grup: Tümü',
        options: subGroupOptions,
      },
      {
        id: 'status',
        label: 'Durum',
        type: 'select',
        placeholder: 'Durum: Tümü',
        options: [
          { value: 'active', label: 'Aktif Konular' },
          { value: 'inactive', label: 'Pasif Konular' },
        ],
      },
    ],
    [subGroupOptions]
  );

  const filteredTopics = useMemo(() => {
    const q = (filters.q ?? '').trim().toLocaleLowerCase('tr-TR');
    const category = filters.category ?? '';
    const subGroup = filters.subGroup ?? '';
    const status = filters.status ?? '';

    return [...db.topicPool]
      .sort((a, b) => a.order - b.order)
      .filter((t) => {
        if (category && t.category !== category) return false;
        if (subGroup && t.subGroup !== subGroup) return false;
        if (status === 'active' && !t.isActive) return false;
        if (status === 'inactive' && t.isActive) return false;
        if (q) {
          const hay = `${t.title} ${t.category} ${t.subGroup ?? ''} ${t.notes ?? ''}`.toLocaleLowerCase(
            'tr-TR'
          );
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [db.topicPool, filters]);

  const openNew = () => {
    const activeCat = (filters.category as TopicCategory) || 'Ezber';
    const maxOrder = db.topicPool.reduce((m, t) => Math.max(m, t.order), 0);
    setForm(emptyTopic(maxOrder + 1, activeCat));
    setModalOpen(true);
  };

  const handleEdit = useCallback((topic: TopicPoolItem) => {
    setForm({ ...topic });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (topic: TopicPoolItem) => {
      deleteTopic(topic.id);
      showToast(`"${topic.title}" konu havuzundan silindi.`, 'info');
    },
    [deleteTopic, showToast]
  );

  const handleMove = useCallback(
    (id: string, dir: 'up' | 'down') => {
      reorderTopic(id, dir, filters.category || undefined);
    },
    [reorderTopic, filters.category]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const isEdit = Boolean(form.id);
    upsertTopic({
      ...form,
      id: form.id || createId('top'),
      title: form.title.trim(),
      subGroup: form.subGroup?.trim() || undefined,
      pageRange: form.pageRange?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setModalOpen(false);
    showToast(isEdit ? 'Konu güncellendi.' : 'Yeni konu havuza eklendi.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Ders, Konu ve Sure Havuzu</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Yüzüne, Ezber (Sureler, Dualar, Toplu Cüzler), Talim Tecvid ve Dini Bilgiler müfredatını yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Yeni Konu / Sure Ekle
        </button>
      </div>

      {/* Category Quick Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilters((p) => ({ ...p, category: '' }))}
          className={`min-h-[34px] px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            !filters.category
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tümü ({db.topicPool.length})
        </button>
        {TOPIC_CATEGORIES.filter((c) => c !== 'Diğer').map((cat) => {
          const count = db.topicPool.filter((t) => t.category === cat).length;
          const active = filters.category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilters((p) => ({ ...p, category: active ? '' : cat }))}
              className={`min-h-[34px] px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <SmartFilterBar
        pageKey="curriculum_topics"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({})}
        resultSummary={`${filteredTopics.length} konu`}
      />

      {filteredTopics.length === 0 ? (
        <EmptyState
          title="Eşleşen konu veya sure bulunamadı"
          description="Filtreleri sıfırlayabilir veya müfredata yeni bir konu ekleyebilirsiniz."
          actionLabel="Yeni Konu Ekle"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {filteredTopics.map((topic, idx) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              index={idx}
              total={filteredTopics.length}
              onMove={handleMove}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Konu / Sure Düzenle' : 'Yeni Konu / Sure Ekle'}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              form="topic-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Kaydet
            </button>
          </>
        }
      >
        <form id="topic-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Konu / Sure / Kural Adı *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Örn: 30. Cüz (Tamamı - Amme Cüzü) veya İdğam-ı Meal Gunne"
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => {
                  const cat = e.target.value as TopicCategory;
                  setForm((p) => ({
                    ...p,
                    category: cat,
                    subGroup: SUBGROUP_SUGGESTIONS[cat][0] ?? p.subGroup,
                  }));
                }}
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              >
                {TOPIC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Alt Grup</label>
              <input
                type="text"
                list="topic-subgroup-list"
                value={form.subGroup ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, subGroup: e.target.value }))}
                placeholder="Örn: Sureler, Tecvid Kuralları"
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <datalist id="topic-subgroup-list">
                {(SUBGROUP_SUGGESTIONS[form.category] ?? []).map((sg) => (
                  <option key={sg} value={sg} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Cüz No (İsteğe Bağlı)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.cuzNo ?? ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    cuzNo: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full min-h-[42px] px-3 text-sm tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Sayfa Aralığı
              </label>
              <input
                type="text"
                value={form.pageRange ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, pageRange: e.target.value }))}
                placeholder="Örn: 582-604"
                className="w-full min-h-[42px] px-3 text-sm tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-700"
            />
            <span>Konu havuzda aktif görünsün</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};
