import { useEffect, useState } from 'react';
import { Button } from './button';

export function PWAReloadPrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
          },
          onRegistered(registration?: ServiceWorkerRegistration) {
            if (process.env.NODE_ENV !== 'production') console.log('SW Registered', registration);
          },
          onRegisterError(error: Error) {
            if (process.env.NODE_ENV !== 'production') console.log('SW registration error', error);
          },
        });
        setUpdateSW(() => update);
      });
    }
  }, []);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleReload = async () => {
    if (updateSW) {
      await updateSW();
    }
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="rounded-lg border border-[--theme-border] bg-[--theme-background] p-4 shadow-lg">
        <div className="space-y-3">
          {offlineReady ? (
            <p className="text-sm text-[--theme-foreground]">
              App is ready to work offline
            </p>
          ) : (
            <p className="text-sm text-[--theme-foreground]">
              New content available, click reload to update.
            </p>
          )}
          <div className="flex gap-2">
            {needRefresh && (
              <Button 
                onClick={handleReload}
                variant="foreground0"
                size="small"
                className="flex-1"
              >
                Reload
              </Button>
            )}
            <Button 
              onClick={close}
              variant="background2"
              size="small"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
