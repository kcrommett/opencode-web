import React from 'react';

interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  box?: 'square' | 'round' | 'double';
  shear?: 'top' | 'bottom' | 'both';
  className?: string;
}

export const View: React.FC<ViewProps> = ({
  children,
  box,
  shear,
  className = '',
  ...props
}) => {
  const viewProps: Record<string, string> = {};

  if (box) {
    viewProps[`box-`] = box;
  }

  if (shear) {
    viewProps[`shear-`] = shear;
  }

  return (
    <div
      className={className}
      {...viewProps}
      {...props}
    >
      {children}
    </div>
  );
};