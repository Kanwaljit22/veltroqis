import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | { separator: true })[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={cn('relative inline-block', className)} ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) => {
            if ('separator' in item && item.separator) {
              return <div key={i} className="my-1 border-t border-slate-100" />;
            }
            const { label, icon, onClick, danger, disabled } = item as DropdownItem;
            return (
              <button
                key={i}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                  danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onClick();
                    setOpen(false);
                  }
                }}
              >
                {icon && <span className="text-current opacity-70">{icon}</span>}
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
