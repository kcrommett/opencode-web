import { useState, useEffect, useCallback, useRef } from "react";

const isDevEnvironment = process.env.NODE_ENV !== "production";

// Debug logging utility
const debugLog = (...args: unknown[]) => {
  if (isDevEnvironment) console.log(...args);
};

const DOUBLE_ESCAPE_WINDOW = 400;

/**
 * Keyboard shortcut state management
 */
export interface KeyboardState {
  leaderActive: boolean;
  secondaryShortcutsActive: boolean;
  activeModal: string | null;
  selectedFrame: string | null;
  lastEscapeTime: number | null;
  doubleEscapeTime: number | null;
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
  requiresModal?: string;
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
    "dialog[open]",
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
    secondaryShortcutsActive: false,
    activeModal: null,
    selectedFrame: null,
    lastEscapeTime: null,
    doubleEscapeTime: null,
    focusStack: [],
  });

  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const leaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const secondaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeModalRef = useRef<string | null>(null);
  const spacePassthroughRef = useRef(false);
  const escapeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleEscapeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEscapeRef = useRef<number | null>(null);

  /**
   * Activate secondary shortcuts mode (when modal is open)
   */
  const activateSecondaryShortcuts = useCallback((_modalName: string) => {
    // Only activate secondary shortcuts display
    // Don't update activeModal here - it's managed by parent component
    setKeyboardState((prev) => ({ 
      ...prev, 
      secondaryShortcutsActive: true
    }));

    // Clear any existing timeout
    if (secondaryTimeoutRef.current) {
      clearTimeout(secondaryTimeoutRef.current);
      secondaryTimeoutRef.current = null;
    }

    // Don't auto-deactivate - let user dismiss with ESC
  }, []);

  /**
   * Deactivate secondary shortcuts mode
   */
  const deactivateSecondaryShortcuts = useCallback(() => {
    if (secondaryTimeoutRef.current) {
      clearTimeout(secondaryTimeoutRef.current);
      secondaryTimeoutRef.current = null;
    }

    setKeyboardState((prev) => ({
      ...prev,
      secondaryShortcutsActive: false,
    }));
  }, []);

  /**
   * Set active modal (called from parent component)
   */
  const setActiveModal = useCallback((modalName: string | null) => {
    activeModalRef.current = modalName;
    setKeyboardState((prev) => ({ ...prev, activeModal: modalName }));
  }, []);

  /**
   * Activate leader mode
   */
  const activateLeader = useCallback(() => {
    if (spacePassthroughRef.current) {
      return;
    }
    debugLog('[activateLeader] Called');
    debugLog('[activateLeader] isInputFocused:', isInputFocused());
    const dialogVisible = isDialogOpen();
    debugLog('[activateLeader] isDialogOpen:', dialogVisible);
    debugLog('[activateLeader] activeModalRef.current:', activeModalRef.current);
    const modalName = activeModalRef.current;
    const modalOpen = dialogVisible || Boolean(modalName);
    debugLog('[activateLeader] modalOpen:', modalOpen);
    
    // Don't activate if input is focused
    if (isInputFocused()) {
      debugLog('[activateLeader] Skipping - input focused');
      return;
    }

    // If a modal is open, activate secondary shortcuts instead
    if (modalOpen) {
      const resolvedModalName = modalName || "unknown";
      debugLog('[activateLeader] Dialog open - activating secondary shortcuts for:', resolvedModalName);
      activateSecondaryShortcuts(resolvedModalName);
      return;
    }

    debugLog('[activateLeader] Activating primary leader mode');
    setKeyboardState((prev) => ({ ...prev, leaderActive: true }));

    // Auto-deactivate after 3 seconds
    if (leaderTimeoutRef.current) {
      clearTimeout(leaderTimeoutRef.current);
    }

    leaderTimeoutRef.current = setTimeout(() => {
      setKeyboardState((prev) => ({ ...prev, leaderActive: false }));
    }, 3000);
  }, [activateSecondaryShortcuts]);

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

  const setSpacePassthrough = useCallback(
    (value: boolean) => {
      spacePassthroughRef.current = value;
      if (value) {
        deactivateSecondaryShortcuts();
        setKeyboardState((prev) => ({
          ...prev,
          leaderActive: false,
        }));
      }
    },
    [deactivateSecondaryShortcuts, setKeyboardState],
  );

  /**
   * Register a keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    debugLog('[registerShortcut] Registering:', {
      key: shortcut.key,
      description: shortcut.description,
      requiresLeader: shortcut.requiresLeader,
      requiresModal: shortcut.requiresModal,
      requiresFrame: shortcut.requiresFrame,
    });
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

      // Debug logging
      if (key === " " || key === "n" || key === "e" || key === "s" || key === "p") {
        debugLog('[Keyboard] Key pressed:', key);
        debugLog('[Keyboard] State:', {
          leaderActive: keyboardState.leaderActive,
          activeModal: keyboardState.activeModal,
          secondaryShortcutsActive: keyboardState.secondaryShortcutsActive,
          isInputFocused: isInputFocused(),
          isDialogOpen: isDialogOpen(),
        });
        debugLog('[Keyboard] Registered shortcuts:', shortcuts.length);
      }

      // Handle Space key for leader activation or secondary shortcuts
      if (key === " " && !isInputFocused()) {
        if (spacePassthroughRef.current) {
          return;
        }
        event.preventDefault();
        debugLog('[Keyboard] Space pressed - calling activateLeader');
        activateLeader();
        return;
      }

      // Handle ESC key
      if (key === "Escape") {
        // If secondary shortcuts are active but no dialog, dismiss them
        if (keyboardState.secondaryShortcutsActive && !isDialogOpen()) {
          event.preventDefault();
          deactivateSecondaryShortcuts();
          return;
        }

        if (isDialogOpen()) {
          return;
        }

        const now = Date.now();
        const lastEsc = lastEscapeRef.current;
        const focusedElement = getFocusedElement();
        const isDoubleEscape =
          typeof lastEsc === "number" && now - lastEsc < DOUBLE_ESCAPE_WINDOW;

        if (isDoubleEscape) {
          event.preventDefault();

          if (escapeResetTimeoutRef.current) {
            clearTimeout(escapeResetTimeoutRef.current);
            escapeResetTimeoutRef.current = null;
          }

          lastEscapeRef.current = null;

          if (keyboardState.leaderActive) {
            deactivateLeader();
          }

          if (keyboardState.secondaryShortcutsActive) {
            deactivateSecondaryShortcuts();
          }

          setKeyboardState((prev) => ({
            ...prev,
            leaderActive: false,
            selectedFrame: null,
            lastEscapeTime: null,
            doubleEscapeTime: now,
          }));

          if (doubleEscapeResetTimeoutRef.current) {
            clearTimeout(doubleEscapeResetTimeoutRef.current);
          }

          doubleEscapeResetTimeoutRef.current = setTimeout(() => {
            setKeyboardState((prev) => ({ ...prev, doubleEscapeTime: null }));
            doubleEscapeResetTimeoutRef.current = null;
          }, DOUBLE_ESCAPE_WINDOW);

          if (focusedElement && focusedElement !== document.body) {
            focusedElement.blur();
          }

          return;
        }

        if (escapeResetTimeoutRef.current) {
          clearTimeout(escapeResetTimeoutRef.current);
        }

        lastEscapeRef.current = now;

        if (keyboardState.leaderActive) {
          event.preventDefault();
          deactivateLeader();
        }

        if (focusedElement && focusedElement !== document.body) {
          event.preventDefault();
          focusedElement.blur();
        } else {
          event.preventDefault();
        }

        setKeyboardState((prev) => ({
          ...prev,
          leaderActive: false,
          selectedFrame: null,
          lastEscapeTime: now,
          doubleEscapeTime: null,
        }));

        escapeResetTimeoutRef.current = setTimeout(() => {
          lastEscapeRef.current = null;
          setKeyboardState((prev) => ({ ...prev, lastEscapeTime: null }));
          escapeResetTimeoutRef.current = null;
        }, DOUBLE_ESCAPE_WINDOW);

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
          debugLog('[Keyboard] Leader shortcut matched:', matchingShortcut.description);
          event.preventDefault();
          matchingShortcut.handler();
          deactivateLeader();
        } else if (key !== " ") {
          debugLog('[Keyboard] No leader shortcut found for key:', key);
        }
      }

      // Handle modal-specific shortcuts (when modal is open)
      if (keyboardState.activeModal && !keyboardState.leaderActive) {
        debugLog('[Keyboard] Checking modal shortcuts for modal:', keyboardState.activeModal);
        const modalShortcuts = shortcuts.filter(s => s.requiresModal === keyboardState.activeModal);
        debugLog('[Keyboard] Available modal shortcuts:', modalShortcuts.map(s => `${s.key}:${s.description}`));
        
        const matchingModalShortcut = shortcuts.find(
          (shortcut) =>
            shortcut.key.toLowerCase() === key.toLowerCase() &&
            shortcut.requiresModal === keyboardState.activeModal
        );

        if (matchingModalShortcut) {
          debugLog('[Keyboard] Modal shortcut matched:', matchingModalShortcut.description);
          event.preventDefault();
          matchingModalShortcut.handler();
          return;
        } else {
          debugLog('[Keyboard] No modal shortcut found for key:', key);
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
      if (escapeResetTimeoutRef.current) {
        clearTimeout(escapeResetTimeoutRef.current);
        escapeResetTimeoutRef.current = null;
      }
      if (doubleEscapeResetTimeoutRef.current) {
        clearTimeout(doubleEscapeResetTimeoutRef.current);
        doubleEscapeResetTimeoutRef.current = null;
      }
      lastEscapeRef.current = null;
    };
  }, [
    keyboardState.leaderActive,
    keyboardState.selectedFrame,
    keyboardState.activeModal,
    keyboardState.lastEscapeTime,
    keyboardState.secondaryShortcutsActive,
    shortcuts,
    activateLeader,
    deactivateLeader,
    deactivateSecondaryShortcuts,
  ]);

  return {
    keyboardState,
    setKeyboardState,
    registerShortcut,
    activateLeader,
    deactivateLeader,
    activateSecondaryShortcuts,
    deactivateSecondaryShortcuts,
    setActiveModal,
    setSpacePassthrough,
    isInputFocused,
    isDialogOpen,
    getFocusedElement,
  };
}