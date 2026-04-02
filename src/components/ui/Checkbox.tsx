import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  label,
  className,
  disabled,
}) => {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        className={cn(
          'h-4 w-4 rounded flex items-center justify-center border transition-colors',
          checked
            ? 'bg-slate-900 border-slate-900'
            : 'bg-white border-slate-300 hover:border-slate-400'
        )}
        onClick={() => !disabled && onChange?.(!checked)}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
};
