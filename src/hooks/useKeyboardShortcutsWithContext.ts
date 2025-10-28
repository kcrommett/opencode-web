import { useEffect } from "react";
import { useKeyboardShortcuts, KeyboardShortcut } from "./useKeyboardShortcuts";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";

/**
 * Enhanced keyboard shortcuts hook that integrates with OpenCode context
 * Provides frame navigation and action shortcuts
 */
export function useKeyboardShortcutsWithContext() {
  // Detect if we're on mobile (simple heuristic)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const { 
    selectedFrame, 
    selectFrame, 
    setShowHelp,
    setShowThemes,
    setShowModelPicker,
    currentSession,
    currentSessionBusy,
    abortSession,
    showToast
  } = useOpenCodeContext();

  const { 
    keyboardState, 
    registerShortcut, 
    activateLeader, 
    deactivateLeader 
  } = useKeyboardShortcuts();

  // Register frame navigation shortcuts
  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      // Frame navigation shortcuts (require leader key)
      {
        key: "p",
        handler: () => {
          selectFrame("projects");
          showToast("Projects frame selected");
        },
        requiresLeader: true,
        description: "Select Projects frame",
        category: "navigation"
      },
      {
        key: "s",
        handler: () => {
          selectFrame("sessions");
          showToast("Sessions frame selected");
        },
        requiresLeader: true,
        description: "Select Sessions frame",
        category: "navigation"
      },
      {
        key: "f",
        handler: () => {
          selectFrame("files");
          showToast("Files frame selected");
        },
        requiresLeader: true,
        description: "Select Files frame",
        category: "navigation"
      },
      {
        key: "w",
        handler: () => {
          selectFrame("workspace");
          showToast("Workspace frame selected");
        },
        requiresLeader: true,
        description: "Select Workspace frame",
        category: "navigation"
      },
      {
        key: "m",
        handler: () => {
          setShowModelPicker(true);
          showToast("Model picker opened");
        },
        requiresLeader: true,
        description: "Open Model picker",
        category: "navigation"
      },
      {
        key: "a",
        handler: () => {
          // Agent picker will be opened by the main app component
          showToast("Agent picker opened");
        },
        requiresLeader: true,
        description: "Open Agent picker",
        category: "navigation"
      },
      {
        key: "t",
        handler: () => {
          setShowThemes(true);
          showToast("Theme picker opened");
        },
        requiresLeader: true,
        description: "Open Theme picker",
        category: "navigation"
      },
      {
        key: "c",
        handler: () => {
          // Config modal will be opened by the main app component
          showToast("Config modal opened");
        },
        requiresLeader: true,
        description: "Open Config modal",
        category: "navigation"
      },
      {
        key: "h",
        handler: () => {
          setShowHelp(true);
          showToast("Help dialog opened");
        },
        requiresLeader: true,
        description: "Open Help dialog",
        category: "navigation"
      },
      // Secondary actions (require frame selection)
      {
        key: "n",
        handler: () => {
          if (selectedFrame === "sessions") {
            // Create new session - this will be handled by the main app
            showToast("New session");
          } else if (selectedFrame === "projects") {
            // Create new project - this will be handled by the main app
            showToast("New project");
          }
          selectFrame(null);
        },
        requiresFrame: selectedFrame || undefined,
        description: "New (context-aware)",
        category: "action"
      },
      {
        key: "e",
        handler: () => {
          if (selectedFrame === "sessions") {
            // Edit session - this will be handled by the main app
            showToast("Edit session");
          }
          selectFrame(null);
        },
        requiresFrame: selectedFrame || undefined,
        description: "Edit (context-aware)",
        category: "action"
      },
      {
        key: "d",
        handler: () => {
          if (selectedFrame === "sessions") {
            // Delete session - this will be handled by the main app
            showToast("Delete session");
          }
          selectFrame(null);
        },
        requiresFrame: selectedFrame || undefined,
        description: "Delete (context-aware)",
        category: "action"
      }
    ];

    // Register all shortcuts
    const unregisterFunctions = shortcuts.map(shortcut => 
      registerShortcut(shortcut)
    );

    // Cleanup function
    return () => {
      unregisterFunctions.forEach(unregister => unregister());
    };
  }, [
    selectedFrame,
    selectFrame,
    registerShortcut,
    showToast,
    setShowHelp,
    setShowThemes,
    setShowModelPicker
  ]);

  // Handle double ESC for agent interruption (desktop only)
  useEffect(() => {
    if (!keyboardState.doubleEscapeTime) {
      return;
    }

    if (!isMobile && currentSessionBusy && currentSession) {
      showToast("Interrupting agent…");
      void abortSession(currentSession.id).catch(() => {
        showToast("Failed to interrupt agent");
      });
      return;
    }

    if (!isMobile && currentSession && !currentSessionBusy) {
      showToast("No running agent to interrupt");
    }
  }, [keyboardState.doubleEscapeTime, isMobile, currentSessionBusy, currentSession, abortSession, showToast]);

  return {
    keyboardState,
    registerShortcut,
    activateLeader,
    deactivateLeader
  };
}