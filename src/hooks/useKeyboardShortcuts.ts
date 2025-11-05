import { useState, useEffect, useCallback, useRef } from "react";

const isDevEnvironment = process.env.NODE_ENV !== "production";

// Debug logging utility
const debugLog = (...args: unknown[]) => {
  if (isDevEnvironment) console.log(...args);
};

const DOUBLE_ESCAPE_WINDOW = 400;

const normalizeKey = (key: string): string =>
  key.length === 1 ? key.toLowerCase() : key;

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
 * Determine if a key should be handled based on current state
 */
const shouldHandleKey = (
  key: string,
  leaderActive: boolean,
  secondaryShortcutsActive: boolean,
  activeModal: string | null,
  trackedKeys: Set<string>,
): boolean => {
  // Always handle leader activation key (space)
  if (key === " ") return true;
  
  // Always handle escape for modal/leader management
  if (key === "Escape") return true;
  
  // Handle if leader mode is active
  if (leaderActive) return true;
  
  // Handle if secondary shortcuts are active (modal context)
  if (secondaryShortcutsActive) return true;
  
  // Handle if modal is open (modal-specific shortcuts might exist)
  if (activeModal) return true;
  
  // Otherwise, only handle tracked keys
  return trackedKeys.has(normalizeKey(key));
};

/**
 * Global keyboard shortcut manager hook
 * Coordinates all keyboard interactions in the application
 */
export function useKeyboardShortcuts() {
  // Performance instrumentation (dev-only)
  const keyEventCountRef = useRef(0);
  const keyEventStatsRef = useRef<{
    total: number;
    handled: number;
    ignored: number;
    lastReset: number;
    // Timing (ms)
    handledTime: number;
    ignoredTime: number;
    maxHandledTime: number;
    maxIgnoredTime: number;
  }>({
    total: 0,
    handled: 0,
    ignored: 0,
    lastReset: Date.now(),
    handledTime: 0,
    ignoredTime: 0,
    maxHandledTime: 0,
    maxIgnoredTime: 0,
  });

  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    leaderActive: false,
    secondaryShortcutsActive: false,
    activeModal: null,
    selectedFrame: null,
    lastEscapeTime: null,
    doubleEscapeTime: null,
    focusStack: [],
  });

  const shortcutsRef = useRef<Map<string, KeyboardShortcut[]>>(new Map());
  const shortcutCountRef = useRef(0);
  const trackedKeysRef = useRef<Set<string>>(
    new Set([normalizeKey(" "), "Escape"]),
  );
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

    const normalizedKey = normalizeKey(shortcut.key);
    const existing = shortcutsRef.current.get(normalizedKey);
    const nextList = existing ? [...existing, shortcut] : [shortcut];
    shortcutsRef.current.set(normalizedKey, nextList);
    shortcutCountRef.current += 1;

    if (!trackedKeysRef.current.has(normalizedKey)) {
      trackedKeysRef.current.add(normalizedKey);
    }

    return () => {
      const current = shortcutsRef.current.get(normalizedKey);
      if (!current) return;
      const updated = current.filter((entry) => entry !== shortcut);
      if (updated.length === current.length) return;

      shortcutCountRef.current = Math.max(0, shortcutCountRef.current - 1);

      if (updated.length === 0) {
        shortcutsRef.current.delete(normalizedKey);
        const isBaseKey =
          normalizedKey === normalizeKey(" ") || normalizedKey === "Escape";
        if (!isBaseKey) {
          trackedKeysRef.current.delete(normalizedKey);
        }
      } else {
        shortcutsRef.current.set(normalizedKey, updated);
      }
    };
  }, []);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      // Dev-only timing
      const measured = isDevEnvironment;
      const t0 = measured ? performance.now() : 0;
      let handledEvent = false;
      let ignoredEvent = false;
      try {
      
      // Early return for repeated keys when leader mode is irrelevant
      if (event.repeat && !keyboardState.leaderActive && !keyboardState.secondaryShortcutsActive && !keyboardState.activeModal) {
        keyEventStatsRef.current.total++;
        keyEventStatsRef.current.ignored++;
        ignoredEvent = true;
        return;
      }

      // Check if we should handle this key
      if (
        !shouldHandleKey(
          key,
          keyboardState.leaderActive,
          keyboardState.secondaryShortcutsActive,
          keyboardState.activeModal,
          trackedKeysRef.current,
        )
      ) {
        keyEventStatsRef.current.total++;
        keyEventStatsRef.current.ignored++;
        ignoredEvent = true;
        return;
      }

      // Cache DOM query results per event
      const inputFocused = isInputFocused();
      const dialogOpen = isDialogOpen();
      const focusedElement = getFocusedElement();
      const normalizedKey = normalizeKey(key);
      const shortcutsForKey = shortcutsRef.current.get(normalizedKey) ?? [];

      // Debug logging (conditional and only for specific keys)
      if (
        isDevEnvironment &&
        (key === " " || key === "Escape" || trackedKeysRef.current.has(normalizedKey))
      ) {
        debugLog('[Keyboard] Key pressed:', key, {
          repeat: event.repeat,
          leaderActive: keyboardState.leaderActive,
          activeModal: keyboardState.activeModal,
          secondaryShortcutsActive: keyboardState.secondaryShortcutsActive,
          inputFocused,
          dialogOpen,
          shortcuts: shortcutCountRef.current,
        });
      }

      // Handle Space key for leader activation or secondary shortcuts
      if (key === " " && !inputFocused) {
        if (spacePassthroughRef.current) {
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.ignored++;
          ignoredEvent = true;
          return;
        }
        event.preventDefault();
        keyEventStatsRef.current.total++;
        keyEventStatsRef.current.handled++;
        handledEvent = true;
        activateLeader();
        return;
      }

      // Handle ESC key
      if (key === "Escape") {
        // If secondary shortcuts are active but no dialog, dismiss them
        if (keyboardState.secondaryShortcutsActive && !dialogOpen) {
          event.preventDefault();
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.handled++;
          deactivateSecondaryShortcuts();
          return;
        }

        if (dialogOpen) {
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.ignored++;
          ignoredEvent = true;
          return;
        }

        const now = Date.now();
        const lastEsc = lastEscapeRef.current;
        const isDoubleEscape =
          typeof lastEsc === "number" && now - lastEsc < DOUBLE_ESCAPE_WINDOW;

        if (isDoubleEscape) {
          event.preventDefault();
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.handled++;

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

        keyEventStatsRef.current.total++;
        keyEventStatsRef.current.handled++;
        handledEvent = true;
        return;
      }

      // Handle shortcuts when leader is active
      if (keyboardState.leaderActive) {
        const matchingShortcut = shortcutsForKey.find(
          (shortcut) => shortcut.requiresLeader,
        );

        if (matchingShortcut) {
          if (isDevEnvironment) {
            debugLog('[Keyboard] Leader shortcut matched:', matchingShortcut.description);
          }
          event.preventDefault();
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.handled++;
          handledEvent = true;
          matchingShortcut.handler();
          deactivateLeader();
        } else if (key !== " ") {
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.ignored++;
          ignoredEvent = true;
          if (isDevEnvironment) {
            debugLog('[Keyboard] No leader shortcut found for key:', key, {
              registeredForKey: shortcutsForKey.length,
            });
          }
        }
        return;
      }

      // Handle modal-specific shortcuts (when modal is open)
      if (keyboardState.activeModal && !keyboardState.leaderActive) {
        const matchingModalShortcut = shortcutsForKey.find(
          (shortcut) =>
            shortcut.requiresModal === keyboardState.activeModal,
        );

        if (matchingModalShortcut) {
          if (isDevEnvironment) {
            debugLog('[Keyboard] Modal shortcut matched:', matchingModalShortcut.description);
          }
          event.preventDefault();
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.handled++;
          matchingModalShortcut.handler();
          return;
        } else {
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.ignored++;
          ignoredEvent = true;
          if (isDevEnvironment) {
            debugLog('[Keyboard] No modal shortcut found for key:', key, {
              activeModal: keyboardState.activeModal,
              registeredForKey: shortcutsForKey.length,
            });
          }
        }
      }

      // Handle secondary actions when frame is selected
      if (keyboardState.selectedFrame && !keyboardState.leaderActive) {
        const matchingAction = shortcutsForKey.find(
          (shortcut) =>
            shortcut.requiresFrame === keyboardState.selectedFrame,
        );

        if (matchingAction) {
          event.preventDefault();
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.handled++;
          matchingAction.handler();
          setKeyboardState((prev) => ({ ...prev, selectedFrame: null }));
        } else {
          keyEventStatsRef.current.total++;
          keyEventStatsRef.current.ignored++;
          ignoredEvent = true;
        }
        return;
      }

      // If we get here, the key was tracked but no handler found
      keyEventStatsRef.current.total++;
      keyEventStatsRef.current.ignored++;
      ignoredEvent = true;
    } finally {
      if (measured) {
        const dt = performance.now() - t0;
        if (handledEvent) {
          keyEventStatsRef.current.handledTime += dt;
          if (dt > keyEventStatsRef.current.maxHandledTime) {
            keyEventStatsRef.current.maxHandledTime = dt;
          }
        } else if (ignoredEvent) {
          keyEventStatsRef.current.ignoredTime += dt;
          if (dt > keyEventStatsRef.current.maxIgnoredTime) {
            keyEventStatsRef.current.maxIgnoredTime = dt;
          }
        }
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
    keyboardState.secondaryShortcutsActive,
    activateLeader,
    deactivateLeader,
    deactivateSecondaryShortcuts,
  ]);

  // Periodic stats logging (dev-only)
  useEffect(() => {
    if (!isDevEnvironment) return;
    
    const interval = setInterval(() => {
      const stats = keyEventStatsRef.current;
      const elapsed = (Date.now() - stats.lastReset) / 1000;
      if (stats.total > 0) {
        const handledAvg = stats.handled > 0 ? stats.handledTime / stats.handled : 0;
        const ignoredAvg = stats.ignored > 0 ? stats.ignoredTime / stats.ignored : 0;
        debugLog(
          `⌨️ Keyboard stats (${elapsed.toFixed(1)}s): ` +
          `${stats.total} events; handled=${stats.handled} (avg ${handledAvg.toFixed(2)}ms, max ${stats.maxHandledTime.toFixed(2)}ms); ` +
          `ignored=${stats.ignored} (avg ${ignoredAvg.toFixed(2)}ms, max ${stats.maxIgnoredTime.toFixed(2)}ms)`
        );
      }
      // Reset stats
      keyEventStatsRef.current = {
        total: 0,
        handled: 0,
        ignored: 0,
        lastReset: Date.now(),
        handledTime: 0,
        ignoredTime: 0,
        maxHandledTime: 0,
        maxIgnoredTime: 0,
      };
    }, 30000); // Log every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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
