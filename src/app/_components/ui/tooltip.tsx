import React from 'react';

interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      is-="tooltip"
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      is-="tooltip-trigger"
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export const TooltipContent: React.FC<TooltipContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      is-="tooltip-content"
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};