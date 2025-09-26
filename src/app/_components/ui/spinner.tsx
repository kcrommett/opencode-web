import React from 'react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'small' | 'large';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size,
  className = '',
  ...props
}) => {
  const spinnerProps: Record<string, string> = {};

  if (size) {
    spinnerProps[`size-`] = size;
  }

  return (
    <div
      is-="spinner"
      className={className}
      {...spinnerProps}
      {...props}
    />
  );
};