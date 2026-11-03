import { h, VNode } from 'preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => VNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  rowHeight,
  overscan = 5,
  renderItem,
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Update viewport height on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setViewportHeight(el.clientHeight || 600);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Handle scroll with requestAnimationFrame for 60fps smoothness
  const animFrameRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (animFrameRef.current !== null) return;

    animFrameRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
      animFrameRef.current = null;
    });
  }, []);

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

  const visibleItems: VNode[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    const item = items[i];
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: `${i * rowHeight}px`,
          left: 0,
          right: 0,
          height: `${rowHeight}px`
        }}
      >
        {renderItem(item, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`virtual-list-container ${className}`}
      style={{
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        width: '100%'
      }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}
