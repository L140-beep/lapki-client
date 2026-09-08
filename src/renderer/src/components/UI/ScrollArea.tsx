import {
  forwardRef,
  type ForwardedRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { twMerge } from 'tailwind-merge';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Classes applied to the scrollable viewport. Use these for content padding and typography. */
  viewportClassName?: string;
  /** Classes applied to the element that directly wraps `children`. Use these for content layout. */
  contentClassName?: string;
}

/**
 * A scrollable container with the application scrollbar.
 *
 * Usage:
 * ```tsx
 * <ScrollArea
 *   className="h-56 rounded-lg border border-border-primary bg-bg-control"
 *   viewportClassName="px-2"
 *   contentClassName="space-y-2"
 * >
 *   {content}
 * </ScrollArea>
 * ```
 *
 * Put sizing, borders, backgrounds and external spacing on `className`; put
 * content padding and text styles on `viewportClassName`; put flex/grid/gap and
 * sibling-spacing styles on `contentClassName`. Do not add a wrapper solely to
 * decorate or size the scroll area. The forwarded ref and `onScroll` point to
 * the viewport so callers can read or update its scroll position.
 */

const setRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { children, className, viewportClassName, contentClassName, onScroll, ...props },
    forwardedRef
  ) => {
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

      const resizeObserver = new ResizeObserver(updateScrollbar);
      resizeObserver.observe(viewport);
      resizeObserver.observe(content);

      // The content wrapper may have a fixed height while its descendants change
      // the viewport's scrollHeight, so ResizeObserver alone is not sufficient.
      const mutationObserver = new MutationObserver(updateScrollbar);
      mutationObserver.observe(content, {
        childList: true,
        characterData: true,
        subtree: true,
      });

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    }, [updateScrollbar]);

    const dragRef = useRef<{
      startY: number;
      startScrollTop: number;
    } | null>(null);

    const handleThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      event.currentTarget.setPointerCapture(event.pointerId);

      dragRef.current = {
        startY: event.clientY,
        startScrollTop: viewport.scrollTop,
      };
    };

    const handleThumbPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;
      const drag = dragRef.current;

      if (!viewport || !drag) {
        return;
      }

      const trackHeight = viewport.clientHeight - 10;
      const maxThumbTop = trackHeight - thumb.height;
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;

      if (maxThumbTop <= 0) {
        return;
      }

      const pointerDelta = event.clientY - drag.startY;
      const scrollDelta = pointerDelta * (maxScrollTop / maxThumbTop);

      viewport.scrollTop = drag.startScrollTop + scrollDelta;
    };

    const handleThumbPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      dragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

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
            <div ref={contentRef} className={contentClassName}>
              {children}
            </div>
          </div>

          {hasOverflow && (
            <div className="relative my-[5px] w-[18px] shrink-0">
              {/* Scrollbar track */}
              <div className="absolute inset-y-0 left-[10px] w-[2px] rounded-lg bg-scrollbar-track">
                {/* Scrollbar thumb */}
                <div
                  className="absolute left-0 w-full rounded-full bg-scrollbar-thumb"
                  style={{
                    height: `${thumb.height}px`,
                    transform: `translateY(${thumb.top}px)`,
                  }}
                  onPointerDown={handleThumbPointerDown}
                  onPointerMove={handleThumbPointerMove}
                  onPointerUp={handleThumbPointerUp}
                  onPointerCancel={handleThumbPointerUp}
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
