import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface PanelCoords {
  top: number;
  left?: number;
  right?: number;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}): string => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Compute viewport-relative position from the trigger element.
  // Uses fixed coordinates so the panel escapes every overflow/clip ancestor.
  const computeCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      ...(align === 'right'
        ? { right: window.innerWidth - rect.right }
        : { left: rect.left }),
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;

    computeCoords();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return;
      setOpen(false);
    };

    // Close on any scroll so the panel never drifts away from its trigger.
    const handleScroll = () => setOpen(false);
    const handleResize = () => computeCoords();

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleResize);
    };
  }, [open, computeCoords]);

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top:  coords.top,
        left: coords.left,
        right: coords.right,
        zIndex: 9999,
      }}
      className="min-w-[160px] rounded-xl border border-base bg-overlay py-1 shadow-lg animate-fade-in"
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} className="my-1 border-t border-subtle" />;
        }
        const { label, icon, onClick, danger, disabled } = item as DropdownItem;
        return (
          <button
            key={i}
            className={cn(
              'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
              danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                : 'text-body hover:bg-inset',
              disabled && 'opacity-50 cursor-not-allowed',
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
  ) : null;

  return (
    <div className={cn('relative inline-block', className)} ref={triggerRef}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {createPortal(panel, document.body)}
    </div>
  );
};
