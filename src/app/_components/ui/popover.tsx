import React from 'react';

interface PopoverProps extends React.HTMLAttributes<HTMLDetailsElement> {
  children: React.ReactNode;
  position?: 'bottom right' | 'bottom left' | 'top right' | 'top left';
  className?: string;
}

interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  position,
  className = '',
  ...props
}) => {
  const popoverProps: Record<string, string> = {};

  if (position) {
    popoverProps[`position-`] = position;
  }

  return (
    <details
      is-="popover"
      className={className}
      {...popoverProps}
      {...props}
    >
      {children}
    </details>
  );
};

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <summary
      is-="popover-trigger"
      className={className}
      {...props}
    >
      {children}
    </summary>
  );
};

export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      is-="popover-content"
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};