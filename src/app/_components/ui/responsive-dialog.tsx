import React from 'react';
import { useIsMobile } from '@/lib/breakpoints';
import { Dialog } from './dialog';
import { BottomSheet } from './bottom-sheet';

interface ResponsiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreenOnMobile?: boolean;
}

export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  fullScreenOnMobile = false,
}) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        fullScreen={fullScreenOnMobile}
      >
        {children}
      </BottomSheet>
    );
  }
  
  return isOpen ? (
    <Dialog open={isOpen}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
           <button
             onClick={onClose}
             className="text-2xl leading-none hover:opacity-70 rounded"
             style={{
               backgroundColor: 'transparent',
               border: 'none',
               color: 'var(--theme-foreground)'
             }}
             aria-label="Close"
           >
             X
           </button>
        </div>
        {children}
      </div>
    </Dialog>
  ) : null;
};
