import React, { useMemo, useState } from "react";
import type {
  PermissionRequest,
  PermissionResponse,
} from "@/types/opencode";
import { Button } from "./button";
import { Badge } from "./badge";

interface PermissionCardProps {
  permission: PermissionRequest;
  onRespond: (response: PermissionResponse) => Promise<void> | void;
  onDismiss?: () => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

const formatTimestamp = (value?: number): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString();
  }
};

const formatDetails = (details: unknown): string | null => {
  if (!details) return null;

  if (typeof details === "string") {
    return details;
  }

  if (
    typeof details === "object" &&
    details !== null &&
    "command" in details &&
    Array.isArray((details as Record<string, unknown>).command)
  ) {
    const commandParts = (details as { command: Array<string | number> }).command;
    return commandParts.map(String).join(" ");
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
};

export const PermissionCard: React.FC<PermissionCardProps> = ({
  permission,
  onRespond,
  onDismiss,
  isLoading = false,
  className = "",
}) => {
  const [pendingAction, setPendingAction] = useState<PermissionResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);
  const isExpired = permission.status === "expired";

  const timestampLabel = useMemo(
    () => formatTimestamp(permission.timestamp),
    [permission.timestamp],
  );

  const detailText = useMemo(
    () => formatDetails(permission.details),
    [permission.details],
  );

  const statusVariant = useMemo(() => {
    switch (permission.status) {
      case "responded":
        return "success" as const;
      case "expired":
        return "warning" as const;
      default:
        return "pending" as const;
    }
  }, [permission.status]);

  const handleRespond = async (response: PermissionResponse) => {
    if (isExpired || isLoading || pendingAction) {
      return;
    }

    setPendingAction(response);
    setError(null);
    try {
      await onRespond(response);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to send permission response.";
      setError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const actionLabel = (action: PermissionResponse, label: string) =>
    pendingAction === action ? `${label}…` : label;

  const handleDismiss = async () => {
    if (!onDismiss) {
      return;
    }
    setError(null);
    setIsDismissing(true);
    try {
      await onDismiss();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to dismiss permission.";
      setError(message);
    } finally {
      setIsDismissing(false);
    }
  };

  const isBusy = isLoading || Boolean(pendingAction) || isDismissing;

  return (
    <div
      className={`permission-card rounded-2xl border px-4 py-3 text-sm shadow-lg flex flex-col gap-3 ${className}`}
      style={{
        backgroundColor: "var(--theme-backgroundAlt, rgba(16,16,20,0.85))",
        borderColor: "var(--theme-border, rgba(255,255,255,0.12))",
      }}
      aria-live="polite"
      data-permission-id={permission.id}
      data-permission-status={permission.status}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-theme-warning">
        <span
          className="inline-flex h-2.5 w-2.5 rounded-full bg-theme-warning animate-pulse"
          aria-hidden="true"
        />
        <span>Permission required</span>
        {timestampLabel && (
          <span className="ml-auto text-[11px] font-normal lowercase text-theme-foreground/70">
            {timestampLabel}
          </span>
        )}
      </div>

      {permission.message && (
        <p className="text-theme-foreground font-medium">{permission.message}</p>
      )}

      {detailText && (
        <pre className="max-h-48 overflow-auto rounded-xl border border-theme-border/50 bg-theme-background/70 p-3 font-mono text-xs whitespace-pre-wrap break-words">
          {detailText}
        </pre>
      )}

      {isExpired && (
        <div className="rounded-lg border border-theme-warning/40 bg-theme-warning/10 px-3 py-2 text-xs text-theme-warning">
          Session may have timed out before you responded. Dismiss to clear this
          request.
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] text-theme-foreground/80">
        <Badge variant={statusVariant} cap="slant-bottom">
          {permission.status ?? "pending"}
        </Badge>
        {permission.partID && (
          <Badge variant="foreground2" cap="slant-bottom">
            Part {permission.partID}
          </Badge>
        )}
        {permission.messageID && (
          <Badge variant="foreground1" cap="slant-bottom">
            Message {permission.messageID}
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-theme-error/40 bg-theme-error/10 px-3 py-2 text-xs text-theme-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isExpired ? (
          <Button
            variant="background2"
            box="round"
            size="small"
            disabled={!onDismiss || isDismissing}
            onClick={handleDismiss}
          >
            {isDismissing ? "Clearing…" : "Dismiss"}
          </Button>
        ) : (
          <>
            <Button
              variant="error"
              box="round"
              size="small"
              disabled={isBusy}
              onClick={() => handleRespond("reject")}
            >
              {actionLabel("reject", "Reject")}
            </Button>
            <Button
              variant="success"
              box="round"
              size="small"
              disabled={isBusy}
              onClick={() => handleRespond("once")}
            >
              {actionLabel("once", "Allow Once")}
            </Button>
            <Button
              variant="warning"
              box="round"
              size="small"
              disabled={isBusy}
              onClick={() => handleRespond("always")}
            >
              {actionLabel("always", "Always Allow")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
