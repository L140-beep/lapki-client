import React, { useCallback, useEffect, useRef, useState } from 'react';

import './css/moving_window.css';
import { twMerge } from 'tailwind-merge';

import {
  type WindowAnimationType,
  useWindowManagerStore,
} from '../../../hooks/useWindowManagerStore';

/**
 * Props for the Window component
 */
export type WindowProps = {
  /** Unique identifier for the window */
  id: string;
  /** Window title - can be string or React component */
  header?: React.ReactNode;
  /** Window content */
  children?: React.ReactNode;
  /** Initial window position */
  position?: { x: number; y: number };
  /** Content to display in the toolbar */
  toolbar?: React.ReactNode | string;
  /** Additional CSS classes for the window */
  className?: string;
  /** Custom toolbar icons */
  icons?: {
    fullscreen?: React.ReactNode;
    fullscreenExit?: React.ReactNode;
    close?: React.ReactNode;
  };
  isOpen?: boolean;
  /** Animation type for fullscreen transitions (overrides global setting) */
  animation?: WindowAnimationType;
  /** Whether to allow fullscreen mode */
  allowFullscreen?: boolean;
  /** Callback when window is closed */
  onClose?: () => void;
  /** Callback when fullscreen state changes */
  onToggleFullscreen?: (isFullscreen: boolean) => void;
  /** Callback when window is resized */
  onResize?: (size: { width: number; height: number }) => void;
};

export const Window = ({
  id,
  header,
  children,
  position = { x: 100, y: 100 },
  toolbar,
  className = '',
  animation: animationType,
  icons,
  isOpen = false,
  allowFullscreen = true,
  onClose,
  onToggleFullscreen,
  onResize,
}: WindowProps) => {
  const {
    updateWindow,
    removeWindow,
    activeWindowId,
    setActiveWindow,
    bringToFront,
    endSplitOnDrag,
    windows,
    windowAnimation,
  } = useWindowManagerStore();

  // Get selected animation type - if provided in props, use it, otherwise use the store's value
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [windowPosition, setWindowPosition] = useState(position);

  // Drag state refs
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, windowX: 0, windowY: 0 });

  // Touch event refs for mobile support
  const touchStartPos = useRef({
    touchX: 0,
    touchY: 0,
    windowX: 0,
    windowY: 0,
  });

  // Animation frame Id for cleanup
  const animationFrameId = useRef<number | null>(null);

  // Get the current window's zIndex
  const currentWindow = windows.find((w) => w.id === id);
  const zIndex = currentWindow?.zIndex || 1;

  // Clamp the window position to the screen boundaries
  const clampPositionToScreen = (x: number, y: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // computed width
    // // Clamp the position to the screen boundaries
    // const clampedX = Math.max(0, Math.min(x, windowWidth - windowSize.width));
    // const clampedY = Math.max(0, Math.min(y, windowHeight - windowSize.height));

    return { x: windowWidth, y: windowHeight };
  };

  // Window activation and bring to front
  const handleWindowActivation = (e: React.MouseEvent) => {
    // Ensure the event is from the window, not child elements
    if (
      e.target === e.currentTarget ||
      (e.currentTarget as HTMLElement).contains(e.target as Node)
    ) {
      setActiveWindow(id);
      bringToFront(id);
    }
  };
  useEffect(() => {
    console.log('state', windowPosition.x, 'dom', windowRef.current?.getBoundingClientRect().left);
  }, [windowPosition]);
  // Component mount/unmount event listeners for mouse and touch events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current && !isResizing.current) {
        return;
      }

      e.preventDefault(); // Prevent text selection

      if (isDragging.current) {
        // If there's an ongoing animation, cancel it
        if (animationFrameId.current !== null) {
          cancelAnimationFrame(animationFrameId.current);
        }

        // Request a new animation frame
        animationFrameId.current = requestAnimationFrame(() => {
          const deltaX = e.clientX - dragStartPos.current.mouseX;
          const deltaY = e.clientY - dragStartPos.current.mouseY;

          const newX = dragStartPos.current.windowX + deltaX;
          const newY = dragStartPos.current.windowY + deltaY;

          // const { x: clampedX, y: clampedY } = clampPositionToScreen(newX, newY);
          setWindowPosition({ x: newX, y: newY });

          animationFrameId.current = null;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) {
        return;
      }

      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartPos.current.touchX;
      const deltaY = touch.clientY - touchStartPos.current.touchY;

      const newX = touchStartPos.current.windowX + deltaX;
      const newY = touchStartPos.current.windowY + deltaY;
      // const { x: clampedX, y: clampedY } = clampPositionToScreen(newX, newY);
      setWindowPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        updateWindow(id, { position: windowPosition });
        endSplitOnDrag(id);
      }

      // If there's an ongoing animation, cancel it
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };

    const handleTouchEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        endSplitOnDrag(id);
      }
    };

    const handleResize = () => {
      // Check if the window position is within the screen boundaries when the screen size changes
      setWindowPosition((prevPos) => {
        const { x: clampedX, y: clampedY } = clampPositionToScreen(prevPos.x, prevPos.y);
        return { x: clampedX, y: clampedY };
      });
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);

      // Clean up animation
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [id]); // windowSize dependency'lerini ekle

  useEffect(() => {
    if (!windowRef.current) return;

    const style = windowRef.current.style;
    windowRef.current.style.left = windowPosition.x.toString() + 'px';
    windowRef.current.style.top = windowPosition.y.toString() + 'px';
    style.zIndex = zIndex.toString();
  }, [windowRef, zIndex, windowPosition]);

  useEffect(() => {
    if (!windowRef.current) return;

    windowRef.current.style.display = isOpen ? 'flex' : 'none';
  }, [isOpen, windowRef]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    isDragging.current = true;

    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: windowPosition.x,
      windowY: windowPosition.y,
    };

    // Activate the window and bring it to front
    setActiveWindow(id);
    bringToFront(id);
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // if (allowFullscreen) {
    //   toggleFullscreen();
    // }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;

    isDragging.current = true;

    touchStartPos.current = {
      touchX: touch.clientX,
      touchY: touch.clientY,
      windowX: windowPosition.x,
      windowY: windowPosition.y,
    };

    // Activate the window and bring it to front
    setActiveWindow(id);
    bringToFront(id);
  };

  // Update the window state

  // Window opening animation
  // useEffect(() => {
  // if (windowRef.current) {
  // Determine the opening animation based on the selected animation type
  // let animation;

  //     switch (selectedAnimation) {
  //       case 'fade':
  //         animation = windowRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
  //           duration: 200,
  //           easing: 'ease-out',
  //           fill: 'forwards',
  //         });
  //         break;
  //       case 'scale':
  //         animation = windowRef.current.animate(
  //           [
  //             { opacity: 0, transform: 'scale(0.8)' },
  //             { opacity: 1, transform: 'scale(1)' },
  //           ],
  //           { duration: 200, easing: 'ease-out', fill: 'forwards' }
  //         );
  //         break;
  //       case 'slide':
  //         animation = windowRef.current.animate(
  //           [
  //             { opacity: 0, transform: 'translateY(20px)' },
  //             { opacity: 1, transform: 'translateY(0)' },
  //           ],
  //           { duration: 200, easing: 'ease-out', fill: 'forwards' }
  //         );
  //         break;
  //       case 'flip':
  //         animation = windowRef.current.animate(
  //           [
  //             { opacity: 0, transform: 'rotateX(15deg)' },
  //             { opacity: 1, transform: 'rotateX(0deg)' },
  //           ],
  //           { duration: 300, easing: 'ease-out', fill: 'forwards' }
  //         );
  //         break;
  //       case 'rotate':
  //         animation = windowRef.current.animate(
  //           [
  //             { opacity: 0, transform: 'rotate(-2deg)' },
  //             { opacity: 1, transform: 'rotate(0deg)' },
  //           ],
  //           { duration: 300, easing: 'ease-out', fill: 'forwards' }
  //         );
  //         break;
  //       case 'jellyfish':
  //         animation = windowRef.current.animate(
  //           [
  //             { opacity: 0, transform: 'scale(0.7)' },
  //             { opacity: 1, transform: 'scale(1)' },
  //           ],
  //           {
  //             duration: 400,
  //             easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like easing
  //             fill: 'forwards',
  //           }
  //         );
  //         break;
  //       default:
  //         // If there's no animation, do nothing
  //         break;
  //     }
  //   }
  // }, [id]); // Only run when the component is mounted and the ID changes

  // Add the window ID to the global window object - this will be used by the inside applications
  useEffect(() => {
    // Store the window ID in the global object
    (window as any).__WINDOW_ID__ = id;

    return () => {
      // Clean up, when the window is closed
      if ((window as any).__WINDOW_ID__ === id) {
        delete (window as any).__WINDOW_ID__;
      }
    };
  }, [id]);

  return (
    <div
      ref={windowRef}
      className={twMerge(
        `react-window-manager window ${activeWindowId === id ? 'active' : ''}`,
        className
      )}
      onMouseDown={handleWindowActivation}
      data-window-id={id}
    >
      {/* Header */}
      <div
        ref={headerRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleHeaderDoubleClick}
        className="cursor-grab"
      >
        {header}
      </div>

      {/* Content */}
      <div className="react-window-manager content">{children}</div>
    </div>
  );
};
