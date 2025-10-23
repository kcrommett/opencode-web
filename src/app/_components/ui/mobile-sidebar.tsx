import React from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          style={{ touchAction: 'none' }}
        />
      )}
      
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 flex justify-between items-center border-b flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
            <h2 className="text-lg font-semibold">Menu</h2>
             <button
               onClick={onClose}
                className="flex items-center justify-center text-2xl transition-opacity"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-primaryHover)';
                  e.currentTarget.style.borderColor = 'var(--theme-primaryHover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
                  e.currentTarget.style.borderColor = 'var(--theme-primary)';
                }}
                style={{ 
                  minWidth: '44px', 
                  minHeight: '44px',
                  backgroundColor: 'var(--theme-primary)',
                  border: '1px solid var(--theme-primary)',
                  borderRadius: '0',
                  color: 'var(--theme-background)'
                }}
               aria-label="Close menu"
             >
               X
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
