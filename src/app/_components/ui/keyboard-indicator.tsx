import { useEffect, useState, useRef } from "react";
import type { KeyboardState } from "@/hooks/useKeyboardShortcuts";

interface KeyboardIndicatorProps {
  keyboardState: KeyboardState;
  className?: string;
}

/**
 * Visual indicator for keyboard shortcuts and leader mode
 * Shows current frame selection and available actions
 * Positions relative to chat window, not browser viewport
 */
export function KeyboardIndicator({ keyboardState, className }: KeyboardIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [frameActions, setFrameActions] = useState<string[]>([]);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (keyboardState.leaderActive || keyboardState.secondaryShortcutsActive || keyboardState.selectedFrame) {
      setIsVisible(true);
      
      // Update available actions based on selected frame
      if (keyboardState.selectedFrame) {
        const actions = getFrameActions(keyboardState.selectedFrame);
        setFrameActions(actions);
      } else {
        setFrameActions([]);
      }
      
      // Calculate position relative to chat window
      const chatAnchor = document.querySelector('[data-dialog-anchor="chat"]');
      if (chatAnchor) {
        const rect = chatAnchor.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width / 2,
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [keyboardState.leaderActive, keyboardState.secondaryShortcutsActive, keyboardState.selectedFrame, keyboardState.activeModal]);

  const getFrameActions = (frame: string): string[] => {
    const actions: Record<string, string[]> = {
      projects: ["N - New Project", "Enter - Select"],
      sessions: ["N - New Session", "E - Edit", "D - Delete", "Enter - Select"],
      files: ["Enter - Open File", "↑/↓ - Navigate"],
      workspace: ["Enter - Send Message", "Tab - Cycle Agent"],
    };
    return actions[frame] || [];
  };

  const getFrameTitle = (frame: string): string => {
    const titles: Record<string, string> = {
      projects: "Projects",
      sessions: "Sessions", 
      files: "Files",
      workspace: "Workspace",
    };
    return titles[frame] || frame;
  };

  const getSecondaryShortcuts = (modalName: string | null): { key: string; description: string }[] => {
    const shortcuts: Record<string, { key: string; description: string }[]> = {
      session: [
        { key: "↑/↓", description: "Navigate sessions" },
        { key: "Enter", description: "Select session" },
        { key: "E", description: "Edit mode" },
        { key: "N", description: "New session" },
        { key: "Esc", description: "Close" },
      ],
      project: [
        { key: "↑/↓", description: "Navigate projects" },
        { key: "Enter", description: "Select project" },
        { key: "Esc", description: "Close" },
      ],
      agent: [
        { key: "↑/↓", description: "Navigate agents" },
        { key: "Enter", description: "Select agent" },
        { key: "Esc", description: "Close" },
      ],
      model: [
        { key: "↑/↓", description: "Navigate models" },
        { key: "Enter", description: "Select model" },
        { key: "Esc", description: "Close" },
      ],
      theme: [
        { key: "↑/↓", description: "Navigate themes" },
        { key: "Enter", description: "Select theme" },
        { key: "Esc", description: "Close" },
      ],
      config: [
        { key: "Tab", description: "Navigate fields" },
        { key: "Esc", description: "Close" },
      ],
    };
    return shortcuts[modalName || ""] || [];
  };

  if (!isVisible) return null;

  const secondaryShortcuts = keyboardState.secondaryShortcutsActive 
    ? getSecondaryShortcuts(keyboardState.activeModal) 
    : [];

  return (
    <div
      ref={indicatorRef}
      className={`fixed transition-all duration-200 ease-in-out rounded border shadow-2xl p-4 min-w-[280px] max-w-[400px] ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      } ${className || ""}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translate(-50%, -50%)",
        backgroundColor: "var(--theme-background)",
        borderColor: "var(--theme-primary)",
        borderWidth: "1px",
        color: "var(--theme-foreground)",
        zIndex: 9999,
      }}
    >
      {keyboardState.leaderActive && !keyboardState.secondaryShortcutsActive && (
        <div className="mb-3 text-center">
          <div 
            className="inline-block text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider mb-2"
            style={{
              backgroundColor: "var(--theme-primary)",
              color: "var(--theme-background)",
            }}
          >
            Keyboard Mode
          </div>
          <p className="text-sm mt-2 opacity-80">
            Press a key to navigate
          </p>
        </div>
      )}

      {keyboardState.selectedFrame && (
        <div className="mb-3 text-center">
          <div 
            className="inline-block text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider"
            style={{
              backgroundColor: "var(--theme-foreground)",
              color: "var(--theme-background)",
            }}
          >
            {getFrameTitle(keyboardState.selectedFrame)}
          </div>
        </div>
      )}

      {frameActions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold opacity-90">Available actions:</p>
          {frameActions.map((action, index) => (
            <div key={index} className="text-sm opacity-80 pl-2">
              {action}
            </div>
          ))}
        </div>
      )}

      {keyboardState.leaderActive && !keyboardState.selectedFrame && !keyboardState.secondaryShortcutsActive && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold mb-2 opacity-90">Navigation:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>P</kbd> Projects
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>S</kbd> Sessions
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>F</kbd> Files
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>W</kbd> Workspace
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>M</kbd> Models
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>A</kbd> Agents
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>T</kbd> Themes
            </div>
            <div className="text-sm opacity-80">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>C</kbd> Config
            </div>
            <div className="text-sm opacity-80 col-span-2">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "var(--theme-backgroundAlt)", borderColor: "var(--theme-primary)", borderWidth: "1px" }}>H</kbd> Help
            </div>
          </div>
        </div>
      )}

      {keyboardState.secondaryShortcutsActive && secondaryShortcuts.length > 0 && (
        <div className="space-y-2">
          <div className="mb-3 text-center">
            <div 
              className="inline-block text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider"
              style={{
                backgroundColor: "var(--theme-primary)",
                color: "var(--theme-background)",
              }}
            >
              Modal Shortcuts
            </div>
          </div>
          <div className="space-y-1.5">
            {secondaryShortcuts.map((shortcut, index) => (
              <div key={index} className="text-sm opacity-80 flex items-center gap-2">
                <kbd 
                  className="px-1.5 py-0.5 rounded font-mono text-xs inline-block min-w-[40px] text-center" 
                  style={{ 
                    backgroundColor: "var(--theme-backgroundAlt)", 
                    borderColor: "var(--theme-primary)", 
                    borderWidth: "1px" 
                  }}
                >
                  {shortcut.key}
                </kbd>
                <span>{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}