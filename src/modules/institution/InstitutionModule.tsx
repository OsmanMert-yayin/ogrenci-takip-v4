import React, { useState } from 'react';
import { Building2, CalendarDays, Clock, Layers, Pencil } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../store/AppStoreContext';
import type { InstitutionInfo } from '../../types';
import { ClassesTab } from './ClassesTab';
import { LessonSlotsTab } from './LessonSlotsTab';
import { TermsTab } from './TermsTab';

type InstitutionTabKey = 'terms' | 'classes' | 'slots';

export const InstitutionModule: React.FC = () => {
  const { db, updateInstitution, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<InstitutionTabKey>('terms');
  const [editInstOpen, setEditInstOpen] = useState(false);
  const [instForm, setInstForm] = useState<InstitutionInfo>(db.institution);

  const openInstEdit = () => {
    setInstForm({ ...db.institution });
    setEditInstOpen(true);
  };

  const handleInstSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.name.trim()) return;
    updateInstitution({
      name: instForm.name.trim(),
      district: instForm.district.trim(),
      city: instForm.city.trim(),
      phone: instForm.phone.trim(),
      managerName: instForm.managerName.trim(),
      address: instForm.address.trim(),
    });
    setEditInstOpen(false);
    showToast('Kurum bilgileri güncellendi.');
  };

  const tabs: {
    key: InstitutionTabKey;
    label: string;
    count: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { key: 'terms', label: 'Akademik Dönem / Yıl', count: db.terms.length, icon: CalendarDays },
    { key: 'classes', label: 'Kurs / Sınıf & Gruplar', count: db.classes.length, icon: Layers },
    { key: 'slots', label: 'Ders Saatleri & Tanımlar', count: db.lessonSlots.length, icon: Clock },
  ];

  return (
    <div className="space-y-5">
      {/* Compact Institution Profile Strip */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {db.institution.name}
            </div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {db.institution.district} / {db.institution.city}
              {db.institution.managerName ? ` · Yönetici: ${db.institution.managerName}` : ''}
              {db.institution.phone ? ` · ${db.institution.phone}` : ''}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openInstEdit}
          className="inline-flex items-center gap-1.5 min-h-[38px] px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          Kurum Bilgilerini Düzenle
        </button>
      </div>

      {/* 3 Structured Top Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selected
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-xs text-slate-400 tabular-nums">({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'terms' && <TermsTab />}
        {activeTab === 'classes' && <ClassesTab />}
        {activeTab === 'slots' && <LessonSlotsTab />}
      </div>

      {/* Institution Edit Modal */}
      <Modal
        open={editInstOpen}
        onClose={() => setEditInstOpen(false)}
        title="Kurum Bilgilerini Düzenle"
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditInstOpen(false)}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              form="institution-info-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Kaydet
            </button>
          </>
        }
      >
        <form id="institution-info-form" onSubmit={handleInstSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Kurum Adı *</label>
            <input
              type="text"
              required
              value={instForm.name}
              onChange={(e) => setInstForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">İl</label>
              <input
                type="text"
                value={instForm.city}
                onChange={(e) => setInstForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">İlçe</label>
              <input
                type="text"
                value={instForm.district}
                onChange={(e) => setInstForm((p) => ({ ...p, district: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kurs Yöneticisi
              </label>
              <input
                type="text"
                value={instForm.managerName}
                onChange={(e) => setInstForm((p) => ({ ...p, managerName: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Telefon</label>
              <input
                type="tel"
                value={instForm.phone}
                onChange={(e) => setInstForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Adres</label>
            <input
              type="text"
              value={instForm.address}
              onChange={(e) => setInstForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
