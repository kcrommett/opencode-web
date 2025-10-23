import React, { useEffect } from 'react';
import { Badge, Separator, Button, Dialog, View } from './index';

interface Session {
  id: string;
  title?: string;
  directory?: string;
  projectID?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
}

interface SessionPickerProps {
  sessions: Session[];
  currentSession: Session | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({
  sessions,
  currentSession,
  onSelect,
  onDelete,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Dialog open onClose={onClose}>
      <View
        box="square"
        className="rounded border overflow-hidden shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar"
        style={{
          backgroundColor: 'var(--theme-background)',
          borderColor: 'var(--theme-primary)',
          borderWidth: '1px',
        }}
      >
        <div className="p-4">
          <h2 className="text-lg font-bold mb-2">Sessions</h2>
        </div>
        
        <Separator />

        <div className="px-4 py-2 space-y-2 max-h-96 overflow-y-auto scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-sm py-4 opacity-70">
              No sessions yet. Create one above.
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = currentSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  className="p-3 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-backgroundAlt)',
                    color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                  }}
                  onClick={() => {
                    onSelect(session.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {session.title || session.id.slice(0, 8)}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {session.createdAt?.toLocaleDateString() || 'Unknown'}
                        {session.messageCount !== undefined && (
                          <span className="ml-2">• {session.messageCount} messages</span>
                        )}
                      </div>
                      {session.directory && (
                        <div className="text-xs opacity-50 truncate mt-1">
                          {session.directory}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {isSelected && (
                        <Badge variant="background2" cap="round" className="text-xs">
                          Current
                        </Badge>
                      )}
                      <Button
                        variant="foreground0"
                        box="round"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this session?')) {
                            onDelete(session.id);
                          }
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Separator />
        <div className="p-4 flex justify-end">
          <Button
            variant="foreground0"
            box="round"
            onClick={onClose}
            size="small"
          >
            Close
          </Button>
        </div>
      </View>
    </Dialog>
  );
};
