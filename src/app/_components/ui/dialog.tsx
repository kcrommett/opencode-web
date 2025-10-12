import React, { useEffect } from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  children: React.ReactNode;
  size?: 'full';
  container?: 'fill';
  className?: string;
  onClose?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  size,
  container,
  className = '',
  onClose,
  ...props
}) => {
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

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <dialog
        is-="dialog"
        className={`${className} shadow-2xl`}
        {...dialogProps}
        {...props}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </dialog>
    </div>
  );
};