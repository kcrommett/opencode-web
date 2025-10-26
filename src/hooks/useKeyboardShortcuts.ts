import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Keyboard shortcut state management
 */
export interface KeyboardState {
  leaderActive: boolean;
  selectedFrame: string | null;
  lastEscapeTime: number | null;
  focusStack: HTMLElement[];
}

/**
 * Individual keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  handler: () => void;
  requiresLeader?: boolean;
  requiresFrame?: string;
  description: string;
  category: "navigation" | "action" | "global";
}

/**
 * Focus detection utilities
 */
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

const isDialogOpen = (): boolean => {
  // Check for common dialog selectors
  const dialogSelectors = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    ".dialog-overlay",
    "[data-dialog-open]",
  ];

  return dialogSelectors.some(
    (selector) => document.querySelector(selector) !== null
  );
};

const getFocusedElement = (): HTMLElement | null => {
  return document.activeElement as HTMLElement | null;
};

/**
 * Global keyboard shortcut manager hook
 * Coordinates all keyboard interactions in the application
 */
export function useKeyboardShortcuts() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    leaderActive: false,
    selectedFrame: null,
    lastEscapeTime: null,
    focusStack: [],
  });

  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const leaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Activate leader mode
   */
  const activateLeader = useCallback(() => {
    // Don't activate if input is focused or dialog is open
    if (isInputFocused() || isDialogOpen()) {
      return;
    }

    setKeyboardState((prev) => ({ ...prev, leaderActive: true }));

    // Auto-deactivate after 3 seconds
    if (leaderTimeoutRef.current) {
      clearTimeout(leaderTimeoutRef.current);
    }

    leaderTimeoutRef.current = setTimeout(() => {
      setKeyboardState((prev) => ({ ...prev, leaderActive: false }));
    }, 3000);
  }, []);

  /**
   * Deactivate leader mode
   */
  const deactivateLeader = useCallback(() => {
    if (leaderTimeoutRef.current) {
      clearTimeout(leaderTimeoutRef.current);
      leaderTimeoutRef.current = null;
    }

    setKeyboardState((prev) => ({
      ...prev,
      leaderActive: false,
      selectedFrame: null,
    }));
  }, []);

  /**
   * Register a keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [...prev, shortcut]);
    return () => {
      setShortcuts((prev) => prev.filter((s) => s !== shortcut));
    };
  }, []);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;

      // Handle Space key for leader activation
      if (key === " " && !isInputFocused() && !isDialogOpen()) {
        event.preventDefault();
        activateLeader();
        return;
      }

      // Handle ESC key
      if (key === "Escape") {
        // If dialog is open, let dialog handler take precedence
        if (isDialogOpen()) {
          return;
        }

        // If leader mode is active, deactivate it
        if (keyboardState.leaderActive) {
          event.preventDefault();
          deactivateLeader();
          return;
        }

        // Track double ESC
        const now = Date.now();
        const lastEsc = keyboardState.lastEscapeTime;
        
        if (lastEsc && now - lastEsc < 500) {
          // Double ESC detected - will be handled by app-level logic
          setKeyboardState((prev) => ({ ...prev, lastEscapeTime: null }));
          return;
        }

        setKeyboardState((prev) => ({ ...prev, lastEscapeTime: now }));

        // Blur focused element
        const focused = getFocusedElement();
        if (focused && focused !== document.body) {
          event.preventDefault();
          focused.blur();
        }
        return;
      }

      // Handle shortcuts when leader is active
      if (keyboardState.leaderActive) {
        const matchingShortcut = shortcuts.find(
          (shortcut) =>
            shortcut.key.toLowerCase() === key.toLowerCase() &&
            shortcut.requiresLeader
        );

        if (matchingShortcut) {
          event.preventDefault();
          matchingShortcut.handler();
          deactivateLeader();
        }
      }

      // Handle secondary actions when frame is selected
      if (keyboardState.selectedFrame && !keyboardState.leaderActive) {
        const matchingAction = shortcuts.find(
          (shortcut) =>
            shortcut.key.toLowerCase() === key.toLowerCase() &&
            shortcut.requiresFrame === keyboardState.selectedFrame
        );

        if (matchingAction) {
          event.preventDefault();
          matchingAction.handler();
          setKeyboardState((prev) => ({ ...prev, selectedFrame: null }));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (leaderTimeoutRef.current) {
        clearTimeout(leaderTimeoutRef.current);
      }
    };
  }, [
    keyboardState.leaderActive,
    keyboardState.selectedFrame,
    keyboardState.lastEscapeTime,
    shortcuts,
    activateLeader,
    deactivateLeader,
  ]);

  return {
    keyboardState,
    setKeyboardState,
    registerShortcut,
    activateLeader,
    deactivateLeader,
    isInputFocused,
    isDialogOpen,
    getFocusedElement,
  };
}
