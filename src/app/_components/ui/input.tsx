import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'small' | 'large';
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  size,
  className = '',
  ...props
}) => {
  const inputProps: Record<string, string> = {};

  if (size) {
    inputProps[`data-size`] = size;
  }

  return (
    <input
      is-="input"
      className={className}
      {...inputProps}
      {...props}
    />
  );
};