import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'background0' | 'background1' | 'background2' | 'background3' | 'foreground0' | 'foreground1' | 'foreground2';
  cap?: 'square' | 'round' | 'triangle' | 'ribbon' | 'slant-top' | 'slant-bottom';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  cap,
  className = ''
}) => {
  const badgeProps: Record<string, string> = {};

  if (variant) {
    badgeProps[`variant-`] = variant;
  }

  if (cap) {
    badgeProps[`cap-`] = cap;
  }

  return (
    <span
      is-="badge"
      className={className}
      {...badgeProps}
    >
      {children}
    </span>
  );
};