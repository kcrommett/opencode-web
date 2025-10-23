import { useState, useEffect } from 'react';
import { Button } from './button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div className="rounded-lg border border-[--theme-border] bg-[--theme-background] p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-[--theme-primary] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[--theme-foreground] mb-1">Install OpenCode Web</h3>
            <p className="text-sm text-[--theme-foregroundAlt] mb-3">
              Install this app on your device for a better experience.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} variant="foreground0" size="small" className="flex-1">
                Install
              </Button>
              <Button onClick={handleDismiss} variant="background2" size="small">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
