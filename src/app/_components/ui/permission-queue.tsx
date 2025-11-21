import React, { useMemo, useState } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { PermissionCard } from "./permission-card";
import type { PermissionResponse } from "@/types/opencode";
import { Button } from "./button";

interface PermissionQueueProps {
  initiallyCollapsed?: boolean;
  maxVisibleWhenCollapsed?: number;
  className?: string;
}

export const PermissionQueue: React.FC<PermissionQueueProps> = ({
  initiallyCollapsed = false,
  maxVisibleWhenCollapsed = 1,
  className = "",
}) => {
  const {
    permissionQueue,
    currentSession,
    respondToPermission,
    removePermission,
    showToast,
  } = useOpenCodeContext();
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  const totalPermissions = permissionQueue.length;
  const visiblePermissions = useMemo(() => {
    if (!isCollapsed) {
      return permissionQueue;
    }
    return permissionQueue.slice(0, Math.max(1, maxVisibleWhenCollapsed));
  }, [isCollapsed, maxVisibleWhenCollapsed, permissionQueue]);

  if (totalPermissions === 0) {
    return null;
  }

  const sendPermissionResponse =
    (permissionId: string) => async (response: PermissionResponse) => {
      const sessionId = currentSession?.id;
      if (!sessionId) {
        throw new Error("No active session to respond to permission.");
      }

      try {
        await respondToPermission(sessionId, permissionId, response);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to respond to permission.";
        await showToast(message, "error");
        throw err;
      }
    };

  const dismissPermission = (permissionId: string) => {
    removePermission(permissionId);
  };

  const remainingCount = totalPermissions - visiblePermissions.length;
  const shouldShowToggle = totalPermissions > maxVisibleWhenCollapsed;

  return (
    <section
      className={`permission-queue flex flex-col gap-3 rounded-3xl border border-theme-border/60 bg-theme-background/40 p-4 backdrop-blur-lg ${className}`}
      aria-label="Pending permission queue"
    >
      <header className="flex items-center justify-between text-xs uppercase tracking-wide text-theme-foreground/70">
        <span className="flex items-center gap-2 font-semibold">
          Pending permissions
          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-theme-warning/20 px-2 py-0.5 text-[11px] font-bold text-theme-warning">
            {totalPermissions}
          </span>
        </span>
        {shouldShowToggle && (
          <Button
            variant="background2"
            size="small"
            box="round"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {isCollapsed ? "Show all" : "Collapse"}
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {visiblePermissions.map((permission) => (
          <PermissionCard
            key={permission.id}
            permission={permission}
            onRespond={sendPermissionResponse(permission.id)}
            onDismiss={() => dismissPermission(permission.id)}
          />
        ))}
      </div>

      {isCollapsed && remainingCount > 0 && (
        <div className="text-xs text-theme-foreground/70">
          {remainingCount} more pending permission
          {remainingCount === 1 ? "" : "s"} hidden. Expand the queue to
          review all requests.
        </div>
      )}
    </section>
  );
};
