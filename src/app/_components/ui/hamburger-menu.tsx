import React from "react";
import { Button } from "./button";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClick,
}) => {
  return (
    <Button
      variant="foreground1"
      box="round"
      size="small"
      onClick={onClick}
      className="md:!hidden px-2 min-w-[44px]"
      aria-label="Toggle navigation menu"
      aria-expanded={isOpen}
      aria-controls="mobile-sidebar"
    >
      <div className="flex flex-col gap-[6px] justify-center items-center w-6">
        <span
          className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
            isOpen ? "rotate-45 translate-y-[8px]" : ""
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-current transition-opacity duration-300 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
            isOpen ? "-rotate-45 -translate-y-[8px]" : ""
          }`}
        />
      </div>
    </Button>
  );
};
