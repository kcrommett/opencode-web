import React from "react";

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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          style={{ touchAction: "none" }}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ backgroundColor: "var(--theme-backgroundAlt)" }}
      >
        <div className="h-full flex flex-col">
          <div
            className="p-4 flex justify-between items-center border-b flex-shrink-0"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-all"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.backgroundColor = "var(--theme-backgroundAccent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.backgroundColor = "var(--theme-border)";
              }}
              style={{
                minWidth: "36px",
                minHeight: "36px",
                backgroundColor: "var(--theme-border)",
                opacity: 0.7,
                color: "var(--theme-foreground)",
              }}
              aria-label="Close menu"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </div>
    </>
  );
};
