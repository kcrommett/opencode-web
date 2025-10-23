import React from 'react';
import { Badge } from './badge';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: React.ReactNode;
  cap?: 'square' | 'round' | 'triangle' | 'ribbon' | 'slant-top' | 'slant-bottom';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  cap = 'round',
  className = ''
}) => {
  const getStatusClass = () => {
    switch (status) {
      case 'success': return 'status-badge-success';
      case 'warning': return 'status-badge-warning';
      case 'error': return 'status-badge-error';
      case 'info': return 'status-badge-info';
      default: return 'status-badge-pending';
    }
  };

  return (
    <Badge cap={cap} className={`${getStatusClass()} ${className}`}>
      {children}
    </Badge>
  );
};
