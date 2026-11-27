export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now().toString(36).slice(-5);
  return `${prefix}_${stamp}${rand}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatTurkishDate(isoDate?: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function formatTodayHeader(): string {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `9${digits}`;
  if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`;
  return digits;
}

export function formatPhoneLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function formatWhatsAppLink(phone: string): string {
  const normalized = normalizePhoneDigits(phone);
  return `https://wa.me/${normalized}`;
}

export const HOUR_OPTIONS: string[] = Array.from({ length: 18 }, (_, i) =>
  String(i + 5).padStart(2, '0')
); // 05 .. 22

export const MINUTE_OPTIONS: string[] = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
];

export function splitHHmm(time: string): { hour: string; minute: string } {
  const [h = '08', m = '00'] = (time || '08:00').split(':');
  return {
    hour: h.padStart(2, '0'),
    minute: m.padStart(2, '0'),
  };
}
