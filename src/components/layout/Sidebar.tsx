import React from 'react';
import { BookOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ModuleKey } from '../../types';
import { NAV_ITEMS } from './navConfig';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  institutionName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelect,
  collapsed,
  onToggleCollapse,
  institutionName,
}) => {
  return (
    <aside
      aria-label="Ana menü"
      className={`print-hidden hidden lg:flex flex-col shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 transition-[width] duration-150 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Row */}
      <div className="h-14 px-3.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onSelect('home')}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
          title={institutionName}
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </span>
          {!collapsed && (
            <span className="font-display font-bold text-sm tracking-tight text-slate-900 truncate whitespace-nowrap">
              Öğrenci Takip v4
            </span>
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Menüyü daralt"
            title="Menüyü daralt"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 min-h-[40px] px-3 rounded-lg text-sm transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? 'text-emerald-700' : 'text-slate-400'
                }`}
              />
              {!collapsed && (
                <span className="truncate whitespace-nowrap flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && !item.isImplemented && (
                <span className="text-[11px] font-normal text-slate-400 tabular-nums shrink-0">
                  A{item.phase}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="p-2.5 border-t border-slate-200 flex justify-center shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
