import React from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'boxed';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className,
}) => {
  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5',
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-dim hover:bg-inset'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  activeTab === tab.id
                    ? 'bg-surface/20 text-white'
                    : 'bg-slate-200 text-dim'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className={cn('flex border-b border-base', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5',
              activeTab === tab.id
                ? 'text-hi after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                : 'text-dim hover:text-body'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="bg-inset text-dim text-xs px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // boxed
  return (
    <div className={cn('flex bg-inset rounded-xl p-1 gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all',
            activeTab === tab.id
              ? 'bg-surface text-hi shadow-sm'
              : 'text-dim hover:text-body'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
