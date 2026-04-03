import { useEffect, useRef, useState } from 'react';

const HIGHLIGHT_DURATION_MS = 5000;

/**
 * Tracks newly added items and returns a Set of their IDs.
 * Each ID is automatically removed from the set after HIGHLIGHT_DURATION_MS.
 *
 * Pass `isReady = false` while the data is still loading so the initial
 * population of the list is never mistaken for "new" items.
 */
export function useNewItemHighlight<T extends { id: string }>(
  items: T[],
  isReady = true,
): Set<string> {
  const prevIdsRef = useRef<Set<string> | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isReady) return;

    const currentIds = new Set(items.map((i) => i.id));

    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds;
      return;
    }

    const newIds = [...currentIds].filter((id) => !prevIdsRef.current!.has(id));
    prevIdsRef.current = currentIds;

    if (newIds.length === 0) return;

    setHighlightedIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });

    const timer = setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    }, HIGHLIGHT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [items, isReady]);

  return highlightedIds;
}
