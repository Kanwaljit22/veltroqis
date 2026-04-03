import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

let toastStore: ((toast: ToastMessage) => void) | null = null;

export const toast = {
  success: (title: string, message?: string) =>
    toastStore?.({ id: Date.now().toString(), type: 'success', title, message }),
  error: (title: string, message?: string) =>
    toastStore?.({ id: Date.now().toString(), type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    toastStore?.({ id: Date.now().toString(), type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    toastStore?.({ id: Date.now().toString(), type: 'info', title, message }),
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({
  toast: t,
  onRemove,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t.id, onRemove]);

  const configs = {
    success: {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      border: 'border-l-4 border-green-500',
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      border: 'border-l-4 border-red-500',
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
      border: 'border-l-4 border-yellow-500',
    },
    info: {
      icon: <Info className="h-5 w-5 text-blue-600" />,
      border: 'border-l-4 border-blue-500',
    },
  };

  const config = configs[t.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-surface rounded-xl shadow-lg p-4 min-w-[300px] max-w-sm animate-fade-in',
        config.border
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-hi">{t.title}</p>
        {t.message && <p className="mt-0.5 text-xs text-dim">{t.message}</p>}
      </div>
      <button
        onClick={() => onRemove(t.id)}
        className="flex-shrink-0 text-weak hover:text-dim transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastStore = (t: ToastMessage) => setToasts((prev) => [...prev, t]);
    return () => { toastStore = null; };
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  );
};
