import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "./input";

interface ProjectSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

interface ProjectSearchInputRef {
  focus: () => void;
}

export const ProjectSearchInput = forwardRef<ProjectSearchInputRef, ProjectSearchInputProps>(({
  value,
  onChange,
  onClear,
  placeholder = "Search projects...",
}, ref) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyRef = useRef<string>("");
  const keyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    const isInputFocused = (): boolean => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;

      const tagName = activeElement.tagName.toLowerCase();
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        activeElement.getAttribute("contenteditable") === "true";

      return isEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // P+S to focus search (projects modal shortcut)
      if (e.key === "s" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Check if previous key was 'p' within timeout
        if (lastKeyRef.current === "p") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
      
      // / to focus search (universal search shortcut)
      // Only trigger if NO input/textarea is currently focused
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to clear search (only if input is focused)
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        e.stopPropagation(); // Prevent dialog from closing
        setLocalValue("");
        onClear();
      }
      
      // Update last key reference and reset timeout
      lastKeyRef.current = e.key;
      clearTimeout(keyTimeoutRef.current);
      keyTimeoutRef.current = setTimeout(() => {
        lastKeyRef.current = "";
      }, 1000); // Reset after 1 second
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(keyTimeoutRef.current);
    };
  }, [onClear]);

  const handleClear = () => {
    setLocalValue("");
    onClear();
    inputRef.current?.focus();
  };

  // Expose focus method via ref
  useEffect(() => {
    if (ref) {
      (ref as React.RefObject<ProjectSearchInputRef>).current = {
        focus: () => inputRef.current?.focus(),
      };
    }
  }, [ref]);

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
          aria-label="Search projects"
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
});

ProjectSearchInput.displayName = "ProjectSearchInput";
