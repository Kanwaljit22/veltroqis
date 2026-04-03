import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Checkbox } from './Checkbox';

export interface MultiUserSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** User id → display label */
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  id?: string;
}

export const MultiUserSelect: React.FC<MultiUserSelectProps> = ({
  label,
  error,
  hint,
  placeholder = 'Unassigned',
  searchPlaceholder = 'Search members...',
  options,
  value,
  onChange,
  disabled,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'multi-user-select';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus the search input when dropdown opens
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  const toggle = (userId: string) => {
    if (value.includes(userId)) onChange(value.filter((x) => x !== userId));
    else onChange([...value, userId]);
  };

  const removeChip = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((x) => x !== userId));
  };

  const labelById = Object.fromEntries(options.map((o) => [o.value, o.label]));

  const filteredOptions = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="w-full relative" ref={ref}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-body mb-1.5">
          {label}
        </label>
      )}
      <div
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen((o) => !o);
          }
          if (e.key === 'Escape') { setOpen(false); setSearch(''); }
        }}
        className={cn(
          'w-full min-h-10 rounded-lg border bg-surface px-3 py-2 text-left text-sm transition-colors',
          'inline-flex items-start justify-between gap-2',
          'focus:outline-none focus:ring-2 focus:ring-hi focus:border-transparent',
          error ? 'border-red-400 focus:ring-red-400' : 'border-base hover:border-base',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 pt-0.5">
          {value.length === 0 ? (
            <span className="text-weak">{placeholder}</span>
          ) : (
            value.map((uid) => (
              <span
                key={uid}
                className="inline-flex items-center gap-0.5 max-w-full pl-2 pr-1 py-0.5 rounded-md bg-inset text-hi text-xs font-medium"
              >
                <span className="truncate">{labelById[uid] ?? uid.slice(0, 8)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeChip(uid, e)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-dim shrink-0"
                    aria-label={`Remove ${labelById[uid]}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-weak shrink-0 mt-1 transition-transform', open && 'rotate-180')}
        />
      </div>

      {open && !disabled && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-[min(100%,320px)] rounded-xl border border-base',
            'bg-surface shadow-lg flex flex-col'
          )}
        >
          {/* Search input */}
          <div className="p-2 border-b border-base">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-weak pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-base bg-inset text-body placeholder:text-weak focus:outline-none focus:ring-1 focus:ring-hi focus:border-transparent"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-weak">
                {options.length === 0 ? 'No users available' : 'No results found'}
              </p>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="px-3 py-2 hover:bg-inset cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(opt.value)}
                >
                  <Checkbox
                    checked={value.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    label={opt.label}
                    className="w-full pointer-events-none"
                  />
                </div>
              ))
            )}
          </div>

          {/* Footer summary */}
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-base flex items-center justify-between">
              <span className="text-xs text-dim">{value.length} selected</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange([])}
                className="text-xs text-dim hover:text-hi transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-dim">{hint}</p>}
    </div>
  );
};
