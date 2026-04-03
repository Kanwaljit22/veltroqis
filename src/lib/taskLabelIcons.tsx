import {
  Bug,
  Cog,
  FileText,
  Flame,
  Palette,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import type { TaskLabel } from '../types';

/** Lucide icon per task label — single source for tag pickers and chips. */
export const TASK_LABEL_ICONS: Record<TaskLabel, LucideIcon> = {
  bug: Bug,
  feature: Rocket,
  enhancement: Cog,
  design: Palette,
  documentation: FileText,
  hotfix: Flame,
};

export function TaskLabelIcon({
  label,
  className = 'h-3.5 w-3.5 shrink-0',
  strokeWidth = 2,
}: {
  label: TaskLabel;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = TASK_LABEL_ICONS[label];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
