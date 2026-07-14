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
  /** Initial window size */
  size?: { width: number; height: number };
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
  /** Whether to allow resizing the window */
  resize?: boolean | 'horizontal' | 'vertical' | 'both' | 'left' | 'right' | 'top' | 'bottom';
  /** Minimum window size */
  minSize?: { width: number; height: number };
  /** Maximum window size */
  maxSize?: { width: number; height: number };
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
  size = { width: 800, height: 600 },
  toolbar,
  className = '',
  animation: animationType,
  icons,
  resize = true,
  isOpen = false,
  minSize = { width: 200, height: 150 },
  maxSize,
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
  const selectedAnimation = animationType || windowAnimation;

  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [windowPosition, setWindowPosition] = useState(position);
  const [windowSize, setWindowSize] = useState(size);
  // Previous state before fullscreen
  const [previousState, setPreviousState] = useState({
    position: position,
    size: size,
  });

  useEffect(() => {
    if (onResize) {
      onResize({
        width: windowSize.width,
        height: windowSize.height,
      });
    }
  }, [windowSize]);

  // Drag state refs
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, windowX: 0, windowY: 0 });
  const resizeStartInfo = useRef({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    cursorType: '',
    initialX: 0,
    initialY: 0,
  });

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

    // Clamp the position to the screen boundaries
    const clampedX = Math.max(0, Math.min(x, windowWidth - windowSize.width));
    const clampedY = Math.max(0, Math.min(y, windowHeight - windowSize.height));

    return { x: clampedX, y: clampedY };
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

          const { x: clampedX, y: clampedY } = clampPositionToScreen(newX, newY);
          setWindowPosition({ x: clampedX, y: clampedY });

          animationFrameId.current = null;
        });
      } else if (isResizing.current) {
        // If there's an ongoing animation, cancel it
        if (animationFrameId.current !== null) {
          cancelAnimationFrame(animationFrameId.current);
        }

        // Request a new animation frame
        animationFrameId.current = requestAnimationFrame(() => {
          const deltaX = e.clientX - resizeStartInfo.current.mouseX;
          const deltaY = e.clientY - resizeStartInfo.current.mouseY;
          const cursorType = resizeStartInfo.current.cursorType;

          let newWidth = resizeStartInfo.current.width;
          let newHeight = resizeStartInfo.current.height;
          let newX = resizeStartInfo.current.initialX;
          let newY = resizeStartInfo.current.initialY;

          // Set the width and position based on the resize type
          if (cursorType === 'se-resize') {
            // Bottom right corner (original behavior)
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width + deltaX);
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height + deltaY);
          } else if (cursorType === 'sw-resize') {
            // Bottom left corner
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width - deltaX);
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height + deltaY);
            newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
          } else if (cursorType === 'ne-resize') {
            // Top right corner
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width + deltaX);
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height - deltaY);
            newY = resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
          } else if (cursorType === 'nw-resize') {
            // Top left corner
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width - deltaX);
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height - deltaY);
            newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
            newY = resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
          } else if (cursorType === 'n-resize') {
            // Only top edge
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height - deltaY);
            newY = resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
          } else if (cursorType === 's-resize') {
            // Only bottom edge
            newHeight = Math.max(minSize.height, resizeStartInfo.current.height + deltaY);
          } else if (cursorType === 'e-resize') {
            // Only right edge
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width + deltaX);
          } else if (cursorType === 'w-resize') {
            // Only left edge
            newWidth = Math.max(minSize.width, resizeStartInfo.current.width - deltaX);
            newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
          }

          // Check if MaxSize is set
          if (maxSize) {
            const originalWidth = newWidth;
            const originalHeight = newHeight;

            newWidth = Math.min(newWidth, maxSize.width);
            newHeight = Math.min(newHeight, maxSize.height);

            // If the size is clamped, recalculate the position
            if (cursorType === 'nw-resize') {
              // Top left corner - if the size is clamped, recalculate the position
              if (newWidth !== originalWidth) {
                newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
              }
              if (newHeight !== originalHeight) {
                newY =
                  resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
              }
            } else if (cursorType === 'ne-resize') {
              // Top right corner - only Y position'u düzelt
              if (newHeight !== originalHeight) {
                newY =
                  resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
              }
            } else if (cursorType === 'sw-resize') {
              // Bottom left corner - only X position'u düzelt
              if (newWidth !== originalWidth) {
                newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
              }
            } else if (cursorType === 'n-resize') {
              // Only top edge - Y position'u düzelt
              if (newHeight !== originalHeight) {
                newY =
                  resizeStartInfo.current.initialY + resizeStartInfo.current.height - newHeight;
              }
            } else if (cursorType === 'w-resize') {
              // Only left edge - X position'u düzelt
              if (newWidth !== originalWidth) {
                newX = resizeStartInfo.current.initialX + resizeStartInfo.current.width - newWidth;
              }
            }
          }
          // Prevent the window from going outside the screen
          const maxWidth = window.innerWidth - newX;
          const maxHeight = window.innerHeight - newY;

          const width = Math.min(newWidth, maxWidth);
          const height = Math.min(newHeight, maxHeight);

          setWindowSize({ width, height });
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
      debugger;
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
      if (isResizing.current) {
        isResizing.current = false;
        updateWindow(id, { position: windowPosition, size: windowSize });
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
      debugger;
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
  }, [id, windowSize.width, windowSize.height]); // windowSize dependency'lerini ekle

  useEffect(() => {
    if (!windowRef.current) return;

    const style = windowRef.current.style;
    style.width = windowSize.width.toString() + 'px';
    style.height = windowSize.height.toString() + 'px';
    windowRef.current.style.left = windowPosition.x.toString() + 'px';
    windowRef.current.style.top = windowPosition.y.toString() + 'px';
    style.zIndex = zIndex.toString();
  }, [windowRef, zIndex, windowPosition, windowSize]);

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

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;

    const target = e.target as HTMLElement;
    const cursorType = window.getComputedStyle(target).cursor;

    resizeStartInfo.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: windowSize.width,
      height: windowSize.height,
      cursorType,
      initialX: windowPosition.x,
      initialY: windowPosition.y,
    };

    // Activate the window and bring it to front
    setActiveWindow(id);
    bringToFront(id);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    // Switch to fullscreen mode
    setPreviousState({
      position: { ...windowPosition },
      size: { ...windowSize },
    });

    // Use Web Animations API for the transition
    if (windowRef.current) {
      // Clean up previous animations
      windowRef.current.getAnimations().forEach((animation) => animation.cancel());

      // Select the easing function
      let easing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Default easing
      let duration = 300; // Default duration

      // Set the easing and duration values based on the selected animation type
      if (selectedAnimation === 'jellyfish') {
        easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Spring-like easing
        duration = 400;
      }

      const controls = windowRef.current.animate(
        [
          {
            left: `${windowPosition.x}px`,
            top: `${windowPosition.y}px`,
            width: `${windowSize.width}px`,
            height: `${windowSize.height}px`,
            borderRadius: '0.5rem',
          },
          {
            left: '0px',
            top: '0px',
            width: `${window.innerWidth}px`,
            height: `${window.innerHeight}px`,
            borderRadius: '0',
          },
        ],
        {
          duration,
          easing,
          fill: 'forwards',
        }
      );

      controls.onfinish = () => {
        // Clean up all animation effects
        if (windowRef.current) {
          // Cancel all animations
          windowRef.current.getAnimations().forEach((animation) => animation.cancel());

          // Reset the CSS completely
          windowRef.current.style.cssText = '';
          windowRef.current.style.position = 'absolute';
          windowRef.current.style.left = '0px';
          windowRef.current.style.top = '0px';
          windowRef.current.style.width = `${window.innerWidth}px`;
          windowRef.current.style.height = `${window.innerHeight}px`;
          windowRef.current.style.transformOrigin = 'top center';
          windowRef.current.style.zIndex = zIndex.toString();
        }

        setWindowPosition({ x: 0, y: 0 });
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
    }
    // updateWindow(id, {
    //   position: previousState.position,
    //   size: previousState.size,
    // });
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

  // Determine which resize handles to show based on the resize prop
  const getResizeHandles = () => {
    if (resize === false) return [];

    const handles: string[] = [];

    switch (resize) {
      case true:
      case 'both':
        // Show all handles
        handles.push('se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w');
        break;
      case 'horizontal':
        // Only horizontal resize (including corners)
        handles.push('e', 'w', 'ne', 'nw', 'se', 'sw');
        break;
      case 'vertical':
        // Only vertical resize (including corners)
        handles.push('n', 's', 'ne', 'nw', 'se', 'sw');
        break;
      case 'left':
        // Only left edge (including corners)
        handles.push('w', 'nw', 'sw');
        break;
      case 'right':
        // Only right edge (including corners)
        handles.push('e', 'ne', 'se');
        break;
      case 'top':
        // Only top edge (no corners)
        handles.push('n');
        break;
      case 'bottom':
        // Only bottom edge (no corners)
        handles.push('s');
        break;
      default:
        handles.push('se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w');
        break;
    }

    return handles;
  };

  const resizeHandles = getResizeHandles();
  console.log(isOpen);
  return (
    <div
      ref={windowRef}
      className={twMerge(
        `react-window-manager window ${activeWindowId === id ? 'active' : ''} ${className}`,
        !isOpen && 'hidden'
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

      {/* Resizers - Show the handles based on the resize prop */}
      {resizeHandles.length > 0 && (
        <>
          {/* Corner handles */}
          {resizeHandles.includes('se') && (
            <div
              onMouseDown={handleResizeStart}
              className="react-window-manager resize-handle se"
            />
          )}
          {resizeHandles.includes('sw') && (
            <div
              onMouseDown={handleResizeStart}
              className="react-window-manager resize-handle sw"
            />
          )}
          {resizeHandles.includes('ne') && (
            <div
              onMouseDown={handleResizeStart}
              className="react-window-manager resize-handle ne"
            />
          )}
          {resizeHandles.includes('nw') && (
            <div
              onMouseDown={handleResizeStart}
              className="react-window-manager resize-handle nw"
            />
          )}

          {/* Edge handles */}
          {resizeHandles.includes('n') && (
            <div onMouseDown={handleResizeStart} className="react-window-manager resize-handle n" />
          )}
          {resizeHandles.includes('s') && (
            <div onMouseDown={handleResizeStart} className="react-window-manager resize-handle s" />
          )}
          {resizeHandles.includes('e') && (
            <div onMouseDown={handleResizeStart} className="react-window-manager resize-handle e" />
          )}
          {resizeHandles.includes('w') && (
            <div onMouseDown={handleResizeStart} className="react-window-manager resize-handle w" />
          )}
        </>
      )}
    </div>
  );
};
