import { useState } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";
import type { PermissionResponse } from "@/types/opencode";

interface PermissionRequest {
  message?: string;
  details?: unknown;
}

interface PermissionModalProps {
  permission: PermissionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onRespond: (response: PermissionResponse) => Promise<void> | void;
}

export function PermissionModal({
  permission,
  isOpen,
  onClose,
  onRespond,
}: PermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleResponse = async (response: PermissionResponse) => {
    setIsLoading(true);
    try {
      await onRespond(response);
      onClose();
    } catch (error) {
      console.error("Failed to respond to permission:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !permission) return null;

  const detailsText =
    permission.details !== undefined
      ? JSON.stringify(permission.details, null, 2)
      : null;

  return (
    <Dialog onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Permission Request</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {permission.message ||
            "An action requires your permission to proceed."}
        </p>

        {detailsText && (
          <div className="mb-4">
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
              {detailsText}
            </pre>
          </div>
        )}

        <div className="flex gap-2 justify-end flex-wrap">
          <Button
            variant="foreground1"
            onClick={() => handleResponse("reject")}
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button
            variant="background2"
            onClick={() => handleResponse("once")}
            disabled={isLoading}
          >
            Allow Once
          </Button>
          <Button
            variant="success"
            onClick={() => handleResponse("always")}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Always Allow"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
