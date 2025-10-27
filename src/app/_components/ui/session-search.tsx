import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";

interface SessionSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SessionSearchInput: React.FC<SessionSearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = "Search sessions...",
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce: update parent after 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to clear search (only if input is focused)
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        e.stopPropagation(); // Prevent dialog from closing
        setLocalValue("");
        onClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClear]);

  const handleClear = () => {
    setLocalValue("");
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="w-full"
          aria-label="Search sessions"
          style={{
            backgroundColor: "var(--theme-backgroundAlt)",
            color: "var(--theme-foreground)",
            borderColor: "var(--theme-border)",
            paddingLeft: "0.75rem",
            paddingRight: localValue ? "2.5rem" : "0.75rem",
            height: "2.5rem",
          }}
        />

        {/* Clear button - minimal circle with X */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 flex items-center justify-center rounded-full transition-all"
            aria-label="Clear search"
            style={{
              width: "18px",
              height: "18px",
              color: "var(--theme-foregroundAlt, var(--theme-foreground))",
              opacity: 0.6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.backgroundColor = "var(--theme-backgroundAccent, var(--theme-border, rgba(255,255,255,0.1)))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
