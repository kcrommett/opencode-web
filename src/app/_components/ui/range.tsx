import React from 'react';

interface RangeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Range: React.FC<RangeProps> = ({
  className = '',
  ...props
}) => {
  return (
    <input
      type="range"
      className={className}
      {...props}
    />
  );
};