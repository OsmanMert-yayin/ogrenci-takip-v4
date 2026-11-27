export type ModuleKey =
  | 'home'
  | 'institution'
  | 'records'
  | 'curriculum'
  | 'attendance'
  | 'lessons'
  | 'grades'
  | 'friday'
  | 'analytics'
  | 'automation'
  | 'system';

export type MobileTabKey = 'attendance' | 'lessons' | 'friday' | 'menu';

export interface NavItemConfig {
  key: ModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5;
  isImplemented?: boolean;
}
