import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <label className={className}>
      <input
        type="checkbox"
        {...props}
      />
      {children}
    </label>
  );
};