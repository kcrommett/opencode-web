import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'background0' | 'background1' | 'background2' | 'background3' | 'foreground0' | 'foreground1' | 'foreground2';
  box?: 'square' | 'round' | 'double';
  size?: 'small' | 'large';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  box,
  size,
  className = '',
  ...props
}) => {
  const buttonProps: Record<string, string> = {};

  if (variant) {
    buttonProps[`data-variant`] = variant;
  }

  if (box) {
    buttonProps[`data-box`] = box;
  }

  if (size) {
    buttonProps[`data-size`] = size;
  }

  return (
    <button
      is-="button"
      className={className}
      {...buttonProps}
      {...props}
    >
      {children}
    </button>
  );
};