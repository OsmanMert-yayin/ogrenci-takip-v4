import {
  BarChart3,
  BookMarked,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  HardDriveDownload,
  Home,
  Landmark,
  MessageSquareText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey, NavItemConfig } from '../../types';

export interface NavItemWithIcon extends NavItemConfig {
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItemWithIcon[] = [
  {
    key: 'home',
    label: 'Anasayfa',
    shortLabel: 'Anasayfa',
    description: 'Kurum özeti, dönem sayaçları ve hızlı erişim',
    phase: 1,
    isImplemented: true,
    icon: Home,
  },
  {
    key: 'institution',
    label: 'Kurum & Dönem',
    shortLabel: 'Kurum',
    description: 'Akademik dönemler, sınıf grupları ve ders saatleri',
    phase: 1,
    isImplemented: true,
    icon: Building2,
  },
  {
    key: 'records',
    label: 'Kayıtlar',
    shortLabel: 'Kayıtlar',
    description: 'Öğrenci kayıtları, veli iletişimi ve öğretmen atamaları',
    phase: 1,
    isImplemented: true,
    icon: Users,
  },
  {
    key: 'curriculum',
    label: 'Müfredat / Program',
    shortLabel: 'Müfredat',
    description: 'Haftalık ders programı ve konu / sure havuzu',
    phase: 2,
    isImplemented: true,
    icon: BookMarked,
  },
  {
    key: 'attendance',
    label: 'Yoklama',
    shortLabel: 'Yoklama',
    description: 'Ders saati bazlı hızlı yoklama ve devam takibi',
    phase: 2,
    isImplemented: true,
    icon: ClipboardCheck,
  },
  {
    key: 'lessons',
    label: 'Ders Takip',
    shortLabel: 'Ders Dinle',
    description: 'Yüzüne, ezber ve hafızlık ders dinleme kayıtları',
    phase: 3,
    isImplemented: true,
    icon: BookOpenCheck,
  },
  {
    key: 'grades',
    label: 'Not & Ödev',
    shortLabel: 'Not & Ödev',
    description: 'Sınav, kanaat notları ve ödev takibi',
    phase: 4,
    isImplemented: true,
    icon: FileSpreadsheet,
  },
  {
    key: 'friday',
    label: 'Cuma İzni',
    shortLabel: 'Cuma İzni',
    description: 'Hafta sonu ve Cuma çıkış / dönüş teslim takibi',
    phase: 4,
    isImplemented: true,
    icon: Landmark,
  },
  {
    key: 'analytics',
    label: 'Analiz & Rapor',
    shortLabel: 'Raporlar',
    description: 'Devamsızlık, ders performansı ve dönem raporları',
    phase: 4,
    isImplemented: true,
    icon: BarChart3,
  },
  {
    key: 'automation',
    label: 'Veli & Otomasyon',
    shortLabel: 'Veli',
    description: 'Zamanlı bildirimler, Puan+Tur rapor şablonları, Telegram ve Veli Portalı',
    phase: 5,
    isImplemented: true,
    icon: MessageSquareText,
  },
  {
    key: 'system',
    label: 'Sistem & Yedek',
    shortLabel: 'Sistem',
    description: 'JSON yedekleme, v3 veri aktarımı ve veri özeti',
    phase: 1,
    isImplemented: true,
    icon: HardDriveDownload,
  },
];

export function getNavItem(key: ModuleKey): NavItemWithIcon {
  return NAV_ITEMS.find((item) => item.key === key) ?? NAV_ITEMS[0];
}
