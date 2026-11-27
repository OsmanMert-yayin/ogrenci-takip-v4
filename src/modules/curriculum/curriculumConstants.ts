import type { DayOfWeek, LessonSlot, ScheduleEntry, TopicCategory } from '../../types';

export interface DayOption {
  value: DayOfWeek;
  label: string;
  shortLabel: string;
}

export const DAYS_OF_WEEK: DayOption[] = [
  { value: 1, label: 'Pazartesi', shortLabel: 'Pzt' },
  { value: 2, label: 'Salı', shortLabel: 'Sal' },
  { value: 3, label: 'Çarşamba', shortLabel: 'Çar' },
  { value: 4, label: 'Perşembe', shortLabel: 'Per' },
  { value: 5, label: 'Cuma', shortLabel: 'Cum' },
  { value: 6, label: 'Cumartesi', shortLabel: 'Cmt' },
  { value: 7, label: 'Pazar', shortLabel: 'Paz' },
];

export const SUBJECT_PRESETS: string[] = [
  'Yüzüne',
  'Ezber',
  'Talim Tecvid',
  'Temel Dini Bilgiler',
  'Hafızlık',
  'Mütalaa',
  'Sosyal Etkinlik',
];

export const TOPIC_CATEGORIES: TopicCategory[] = [
  'Yüzüne',
  'Ezber',
  'Talim Tecvid',
  'Temel Dini Bilgiler',
  'Sosyal Etkinlik',
  'Hafızlık',
  'Diğer',
];

export const SUBGROUP_SUGGESTIONS: Record<TopicCategory, string[]> = {
  Yüzüne: ['Sayfa ve Cüz Takibi', 'Başlangıç'],
  Ezber: ['Sureler', 'Dualar & Ayetler', 'Toplu Cüz Seçenekleri'],
  'Talim Tecvid': ['Mahreçler (Tashih-i Huruf)', 'Tecvid Kuralları'],
  'Temel Dini Bilgiler': ['İtikad / Akaid', 'İbadet / Fıkıh', 'Siyer', 'Ahlak'],
  'Sosyal Etkinlik': ['Kültürel', 'Sosyal'],
  Hafızlık: ['Günlük Ders', 'Tekrar', 'Cüz Takibi'],
  Diğer: ['Genel'],
};

export function isEtutOrMutalaa(slot?: LessonSlot, entry?: ScheduleEntry): boolean {
  if (slot?.category === 'etut') return true;
  if (!entry) return false;
  const lower = entry.subjectName.toLocaleLowerCase('tr-TR');
  return lower.includes('mütalaa') || lower.includes('mutalaa') || lower.includes('etüt') || lower.includes('etut');
}

export function getDayLabel(day: DayOfWeek): string {
  return DAYS_OF_WEEK.find((d) => d.value === day)?.label ?? 'Pazartesi';
}
