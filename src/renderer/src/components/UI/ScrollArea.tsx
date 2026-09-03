import {
  forwardRef,
  type ForwardedRef,
  type HTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { twMerge } from 'tailwind-merge';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string;
}

const setRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, viewportClassName, onScroll, ...props }, forwardedRef) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const [hasOverflow, setHasOverflow] = useState(false);
    const [thumb, setThumb] = useState({ height: 0, top: 0 });

    const updateScrollbar = useCallback(() => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const { clientHeight, scrollHeight, scrollTop } = viewport;
      const nextHasOverflow = scrollHeight > clientHeight;

      setHasOverflow(nextHasOverflow);

      if (!nextHasOverflow) {
        setThumb({ height: 0, top: 0 });
        return;
      }

      // 5px сверху + 5px снизу для дорожки.
      const trackHeight = Math.max(0, clientHeight - 10);

      const height = Math.min(
        trackHeight,
        Math.max(20, (clientHeight / scrollHeight) * trackHeight)
      );

      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - height;

      setThumb({
        height,
        top: (scrollTop / maxScrollTop) * maxThumbTop,
      });
    }, []);

    const handleViewportRef = useCallback(
      (node: HTMLDivElement | null) => {
        viewportRef.current = node;
        setRef(forwardedRef, node);
      },
      [forwardedRef]
    );

    useLayoutEffect(() => {
      const viewport = viewportRef.current;
      const content = contentRef.current;

      if (!viewport || !content) {
        return;
      }

      updateScrollbar();

      const observer = new ResizeObserver(updateScrollbar);
      observer.observe(viewport);
      observer.observe(content);

      return () => observer.disconnect();
    }, [updateScrollbar]);

    return (
      <div
        {...props}
        className={twMerge(
          'flex h-full min-h-0 min-w-0 flex-col overflow-hidden py-[5px]',
          className
        )}
      >
        <div className="flex min-h-0 flex-1">
          <div
            ref={handleViewportRef}
            onScroll={(event) => {
              updateScrollbar();
              onScroll?.(event);
            }}
            className={twMerge(
              'min-h-0 min-w-0 flex-1 overflow-auto',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              viewportClassName
            )}
          >
            <div ref={contentRef}>{children}</div>
          </div>

          {hasOverflow && (
            <div className="relative my-[5px] w-[18px] shrink-0">
              {/* Scrollbar track */}
              <div className="absolute inset-y-0 left-[10px] w-[2px] rounded-lg bg-scrollbar-track">
                {/* Scrollbar thumb */}
                <div
                  className="absolute left-0 w-full rounded-lg bg-scrollbar-thumb"
                  style={{
                    height: `${thumb.height}px`,
                    transform: `translateY(${thumb.top}px)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
