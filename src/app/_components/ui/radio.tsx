import React from 'react';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Radio: React.FC<RadioProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <label className={className}>
      <input
        type="radio"
        {...props}
      />
      {children}
    </label>
  );
};