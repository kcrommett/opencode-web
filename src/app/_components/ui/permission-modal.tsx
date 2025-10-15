import { useState } from 'react'
import { Dialog } from './dialog'
import { Button } from './button'

interface PermissionRequest {
  message?: string
  details?: unknown
}

interface PermissionModalProps {
  permission: PermissionRequest | null
  isOpen: boolean
  onClose: () => void
  onRespond: (response: boolean) => Promise<void> | void
}

export function PermissionModal({
  permission,
  isOpen,
  onClose,
  onRespond,
}: PermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleResponse = async (response: boolean) => {
    setIsLoading(true)
    try {
      await onRespond(response)
      onClose()
    } catch (error) {
      console.error('Failed to respond to permission:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !permission) return null

  const detailsText =
    permission.details !== undefined
      ? JSON.stringify(permission.details, null, 2)
      : null

  return (
    <Dialog onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Permission Request</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {permission.message || 'An action requires your permission to proceed.'}
        </p>

        {detailsText && (
          <div className="mb-4">
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
              {detailsText}
            </pre>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="foreground1"
            onClick={() => handleResponse(false)}
            disabled={isLoading}
          >
            Deny
          </Button>
          <Button
            variant="success"
            onClick={() => handleResponse(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Allow'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
