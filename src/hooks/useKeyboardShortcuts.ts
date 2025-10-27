import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Keyboard shortcut state management
 */
export interface KeyboardState {
  leaderActive: boolean;
  secondaryShortcutsActive: boolean;
  activeModal: string | null;
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
    focusStack: [],
  });

  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const leaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const secondaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeModalRef = useRef<string | null>(null);

  /**
   * Activate secondary shortcuts mode (when modal is open)
   */
  const activateSecondaryShortcuts = useCallback((modalName: string) => {
    // Only activate secondary shortcuts display
    // Don't update activeModal here - it's managed by parent component
    setKeyboardState((prev) => ({ 
      ...prev, 
      secondaryShortcutsActive: true
    }));

    // Auto-deactivate after 2 seconds
    if (secondaryTimeoutRef.current) {
      clearTimeout(secondaryTimeoutRef.current);
    }

    secondaryTimeoutRef.current = setTimeout(() => {
      setKeyboardState((prev) => ({ 
        ...prev, 
        secondaryShortcutsActive: false 
      }));
    }, 2000);
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
    console.log('[activateLeader] Called');
    console.log('[activateLeader] isInputFocused:', isInputFocused());
    const dialogVisible = isDialogOpen();
    console.log('[activateLeader] isDialogOpen:', dialogVisible);
    console.log('[activateLeader] activeModalRef.current:', activeModalRef.current);
    const modalName = activeModalRef.current;
    const modalOpen = dialogVisible || Boolean(modalName);
    console.log('[activateLeader] modalOpen:', modalOpen);
    
    // Don't activate if input is focused
    if (isInputFocused()) {
      console.log('[activateLeader] Skipping - input focused');
      return;
    }

    // If a modal is open, activate secondary shortcuts instead
    if (modalOpen) {
      const resolvedModalName = modalName || "unknown";
      console.log('[activateLeader] Dialog open - activating secondary shortcuts for:', resolvedModalName);
      activateSecondaryShortcuts(resolvedModalName);
      return;
    }

    console.log('[activateLeader] Activating primary leader mode');
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

  /**
   * Register a keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    console.log('[registerShortcut] Registering:', {
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
        console.log('[Keyboard] Key pressed:', key);
        console.log('[Keyboard] State:', {
          leaderActive: keyboardState.leaderActive,
          activeModal: keyboardState.activeModal,
          secondaryShortcutsActive: keyboardState.secondaryShortcutsActive,
          isInputFocused: isInputFocused(),
          isDialogOpen: isDialogOpen(),
        });
        console.log('[Keyboard] Registered shortcuts:', shortcuts.length);
      }

      // Handle Space key for leader activation or secondary shortcuts
      if (key === " " && !isInputFocused()) {
        event.preventDefault();
        console.log('[Keyboard] Space pressed - calling activateLeader');
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
          console.log('[Keyboard] Leader shortcut matched:', matchingShortcut.description);
          event.preventDefault();
          matchingShortcut.handler();
          deactivateLeader();
        } else if (key !== " ") {
          console.log('[Keyboard] No leader shortcut found for key:', key);
        }
      }

      // Handle modal-specific shortcuts (when modal is open)
      if (keyboardState.activeModal && !keyboardState.leaderActive) {
        console.log('[Keyboard] Checking modal shortcuts for modal:', keyboardState.activeModal);
        const modalShortcuts = shortcuts.filter(s => s.requiresModal === keyboardState.activeModal);
        console.log('[Keyboard] Available modal shortcuts:', modalShortcuts.map(s => `${s.key}:${s.description}`));
        
        const matchingModalShortcut = shortcuts.find(
          (shortcut) =>
            shortcut.key.toLowerCase() === key.toLowerCase() &&
            shortcut.requiresModal === keyboardState.activeModal
        );

        if (matchingModalShortcut) {
          console.log('[Keyboard] Modal shortcut matched:', matchingModalShortcut.description);
          event.preventDefault();
          matchingModalShortcut.handler();
          return;
        } else {
          console.log('[Keyboard] No modal shortcut found for key:', key);
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
    keyboardState.activeModal,
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
    activateSecondaryShortcuts,
    deactivateSecondaryShortcuts,
    setActiveModal,
    isInputFocused,
    isDialogOpen,
    getFocusedElement,
  };
}
