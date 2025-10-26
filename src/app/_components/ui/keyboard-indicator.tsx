import { useEffect, useState } from "react";
import type { KeyboardState } from "@/hooks/useKeyboardShortcuts";
import { Badge } from "./badge";

interface KeyboardIndicatorProps {
  keyboardState: KeyboardState;
  className?: string;
}

/**
 * Visual indicator for keyboard shortcuts and leader mode
 * Shows current frame selection and available actions
 */
export function KeyboardIndicator({ keyboardState, className }: KeyboardIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [frameActions, setFrameActions] = useState<string[]>([]);

  useEffect(() => {
    if (keyboardState.leaderActive || keyboardState.selectedFrame) {
      setIsVisible(true);
      
      // Update available actions based on selected frame
      if (keyboardState.selectedFrame) {
        const actions = getFrameActions(keyboardState.selectedFrame);
        setFrameActions(actions);
      } else {
        setFrameActions([]);
      }
    } else {
      setIsVisible(false);
    }
  }, [keyboardState.leaderActive, keyboardState.selectedFrame]);

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

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-200 ease-in-out bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className || ""}`}
    >
      {keyboardState.leaderActive && (
        <div className="mb-2">
          <Badge variant="background0" className="text-xs font-medium">
            LEADER MODE
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Press a key to navigate
          </p>
        </div>
      )}

      {keyboardState.selectedFrame && (
        <div className="mb-2">
          <Badge variant="background1" className="text-xs font-medium">
            {getFrameTitle(keyboardState.selectedFrame)}
          </Badge>
        </div>
      )}

      {frameActions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Available actions:</p>
          {frameActions.map((action, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              {action}
            </div>
          ))}
        </div>
      )}

      {keyboardState.leaderActive && !keyboardState.selectedFrame && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Navigation:</p>
          <div className="text-xs text-muted-foreground">P - Projects</div>
          <div className="text-xs text-muted-foreground">S - Sessions</div>
          <div className="text-xs text-muted-foreground">F - Files</div>
          <div className="text-xs text-muted-foreground">W - Workspace</div>
          <div className="text-xs text-muted-foreground">M - Models</div>
          <div className="text-xs text-muted-foreground">A - Agents</div>
          <div className="text-xs text-muted-foreground">T - Themes</div>
          <div className="text-xs text-muted-foreground">C - Config</div>
          <div className="text-xs text-muted-foreground">H - Help</div>
        </div>
      )}
    </div>
  );
}