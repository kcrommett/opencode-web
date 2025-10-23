import React, { useEffect } from 'react';
import { View, Button } from './index';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  fullScreen = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        style={{ touchAction: 'none' }}
      />
      
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          transform transition-transform duration-300
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          ${fullScreen ? 'top-0' : 'max-h-[85vh] rounded-t-2xl'}
        `}
        style={{ backgroundColor: 'var(--theme-background)' }}
      >
        <View box="square" className="h-full flex flex-col">
          {!fullScreen && (
            <div className="flex justify-center pt-2 pb-2">
              <div className="w-12 h-1 rounded-full bg-[var(--theme-border)]" />
            </div>
          )}
          
          <div className="px-4 py-3 flex justify-between items-center border-b border-[var(--theme-border)]">
            <h2 className="text-lg font-bold">{title}</h2>
            <Button
              variant="foreground0"
              box="round"
              size="small"
              onClick={onClose}
              className="min-touch-target"
            >
              Close
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto smooth-scroll px-4 py-4">
            {children}
          </div>
        </View>
      </div>
    </>
  );
};
