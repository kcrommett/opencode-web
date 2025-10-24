import { useEffect, useState } from "react";
import { Button } from "./button";

export function PWAReloadPrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let isMounted = true;

    const removeLegacyDevServiceWorkers = async () => {
      if (import.meta.env.DEV) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            const scriptUrls = [
              registration.active?.scriptURL,
              registration.installing?.scriptURL,
              registration.waiting?.scriptURL,
            ].filter(Boolean) as string[];

            const hasLegacyDevSw = scriptUrls.some(
              (url) =>
                url.includes("@vite-plugin-pwa") ||
                url.includes("dev-sw.js") ||
                url.includes("registerSW.js"),
            );

            if (hasLegacyDevSw) {
              await registration.unregister();
            }
          }),
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to remove legacy dev service workers", error);
        }
      }
    };

    const setupServiceWorker = async () => {
      await removeLegacyDevServiceWorkers();

      const { registerSW } = await import("virtual:pwa-register");
      const update = registerSW({
        onNeedRefresh() {
          if (isMounted) setNeedRefresh(true);
        },
        onOfflineReady() {
          if (isMounted) setOfflineReady(true);
        },
        onRegistered(registration?: ServiceWorkerRegistration) {
          if (import.meta.env.DEV) console.log("SW Registered", registration);
        },
        onRegisterError(error: Error) {
          if (import.meta.env.DEV) console.log("SW registration error", error);
        },
      });

      if (isMounted) {
        setUpdateSW(() => update);
      }
    };

    void setupServiceWorker();

    return () => {
      isMounted = false;
    };
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
            <Button onClick={close} variant="background2" size="small">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
