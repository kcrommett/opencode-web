import React from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  children: React.ReactNode;
  size?: 'full';
  container?: 'fill';
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  size,
  container,
  className = '',
  ...props
}) => {
  const dialogProps: Record<string, string> = {};

  if (size) {
    dialogProps[`data-size`] = size;
  }

  if (container) {
    dialogProps[`data-container`] = container;
  }

  return (
    <dialog
      is-="dialog"
      className={className}
      {...dialogProps}
      {...props}
    >
      {children}
    </dialog>
  );
};