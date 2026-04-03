import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md',
}) => {
  const pads = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-base shadow-sm',
        hover && 'transition-shadow hover:shadow-md cursor-pointer',
        pads[padding],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconBg = 'bg-blue-50',
}) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-500',
    neutral: 'text-dim',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dim font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold text-hi tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium', changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', iconBg)}>{icon}</div>
      </div>
    </Card>
  );
};
