import React from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <label className={className}>
      <input
        type="checkbox"
        is-="switch"
        {...props}
      />
      {children}
    </label>
  );
};