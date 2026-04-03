import * as Tooltip from '@radix-ui/react-tooltip';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

type EllipsisTooltipProps = {
  /** Full string shown in the tooltip when truncated */
  text: string;
  className?: string;
  /** When true, skip tooltip (e.g. drag overlay clone) */
  disabled?: boolean;
};

/**
 * Renders clamped text and shows a Radix tooltip only when content overflows (ellipsis).
 */
export const EllipsisTooltip: React.FC<EllipsisTooltipProps> = ({
  text,
  className,
  disabled = false,
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // line-clamp: overflow means scroll height exceeds visible box
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useLayoutEffect(() => {
    if (disabled) return;
    measure();
  }, [text, measure, disabled]);

  useLayoutEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, disabled]);

  const paragraph = (
    <p ref={ref} className={cn(className)}>
      {text}
    </p>
  );

  if (disabled || !isTruncated) {
    return paragraph;
  }

  return (
    <Tooltip.Root delayDuration={350}>
      <Tooltip.Trigger asChild>{paragraph}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className={cn(
            'z-200 max-w-xs rounded-lg border border-base bg-surface px-3 py-2 text-xs text-body shadow-md',
            'whitespace-pre-wrap wrap-break-word select-none'
          )}
        >
          {text}
          <Tooltip.Arrow className="fill-white" width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
