import React from "react";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex flex-col justify-center items-center p-2 transition-opacity"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--theme-primaryHover)";
        e.currentTarget.style.borderColor = "var(--theme-primaryHover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--theme-primary)";
        e.currentTarget.style.borderColor = "var(--theme-primary)";
      }}
      aria-label="Toggle menu"
      style={{
        minWidth: "44px",
        minHeight: "44px",
        gap: "6px",
        backgroundColor: "var(--theme-primary)",
        border: "1px solid var(--theme-primary)",
        borderRadius: "0",
        color: "var(--theme-background)",
      }}
    >
      <span
        className={`block w-6 h-0.5 transition-all duration-300 ${
          isOpen ? "rotate-45 translate-y-[8px]" : ""
        }`}
        style={{ backgroundColor: "var(--theme-background)" }}
      />
      <span
        className={`block w-6 h-0.5 transition-opacity duration-300 ${
          isOpen ? "opacity-0" : ""
        }`}
        style={{ backgroundColor: "var(--theme-background)" }}
      />
      <span
        className={`block w-6 h-0.5 transition-all duration-300 ${
          isOpen ? "-rotate-45 -translate-y-[8px]" : ""
        }`}
        style={{ backgroundColor: "var(--theme-background)" }}
      />
    </button>
  );
};
