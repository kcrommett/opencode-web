import React from 'react';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical' | 'x' | 'y';
  cap?: 'edge' | 'bisect' | 'default';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  direction = 'horizontal',
  cap,
  className = '',
  ...props
}) => {
  const separatorProps: Record<string, string> = {};

  if (direction && direction !== 'horizontal') {
    separatorProps[`direction-`] = direction;
  }

  if (cap) {
    separatorProps[`cap-`] = cap;
  }

  return (
    <div
      is-="separator"
      className={className}
      {...separatorProps}
      {...props}
    />
  );
};