import React from 'react';

interface ProgressProps extends React.ProgressHTMLAttributes<HTMLProgressElement> {
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  className = '',
  ...props
}) => {
  return (
    <progress
      className={className}
      {...props}
    />
  );
};