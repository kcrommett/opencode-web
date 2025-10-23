import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  children: React.ReactNode;
  size?: 'full';
  container?: 'fill';
  className?: string;
  onClose?: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const Dialog: React.FC<DialogProps> = ({
  children,
  size,
  container,
  className = '',
  onClose,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const dialogProps: Record<string, string> = {};

  if (size) {
    dialogProps[`data-size`] = size;
  }

  if (container) {
    dialogProps[`data-container`] = container;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeObserver: ResizeObserver | undefined;
    let observedElement: Element | null = null;

    const updateOffset = () => {
      const parent = containerRef.current?.parentElement ?? undefined;
      if (!parent) {
        setHorizontalOffset(0);
        if (resizeObserver && observedElement) {
          resizeObserver.unobserve(observedElement);
          observedElement = null;
        }
        return;
      }

      const anchor = (parent.querySelector('[data-dialog-anchor]') as HTMLElement | null) ?? parent;
      if (typeof ResizeObserver !== 'undefined') {
        if (!resizeObserver) {
          resizeObserver = new ResizeObserver(() => updateOffset());
        }
        if (observedElement && observedElement !== anchor) {
          resizeObserver.unobserve(observedElement);
          observedElement = null;
        }
        if (anchor && observedElement !== anchor) {
          resizeObserver.observe(anchor);
          observedElement = anchor;
        }
      }

      const rect = anchor.getBoundingClientRect();
      const chatCenter = rect.left + rect.width / 2;
      const viewportCenter = window.innerWidth / 2;
      const nextOffset = chatCenter - viewportCenter;

      setHorizontalOffset((current) => {
        if (Number.isFinite(nextOffset) && Math.abs(current - nextOffset) > 0.5) {
          return nextOffset;
        }
        if (!Number.isFinite(nextOffset)) {
          return 0;
        }
        return current;
      });
    };

    updateOffset();

    window.addEventListener('resize', updateOffset);
    window.addEventListener('scroll', updateOffset, true);

    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('scroll', updateOffset, true);
      if (resizeObserver && observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      resizeObserver?.disconnect();
    };
  }, []);

  const { style, ...restProps } = props;
  const offsetPx = Number.isFinite(horizontalOffset)
    ? `${horizontalOffset.toFixed(2)}px`
    : '0px';
  const dialogStyle = {
    ...style,
    translate: style?.translate ?? `calc(-50% + ${offsetPx})`,
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <dialog
        is-="dialog"
        className={`${className} shadow-2xl`}
        {...dialogProps}
        {...restProps}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </dialog>
    </div>
  );
};
