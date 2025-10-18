import {
  Outlet,
  createRootRoute,
  Scripts,
  HeadContent,
} from "@tanstack/react-router";
import "./globals.css";
import { OpenCodeProvider } from "@/contexts/OpenCodeContext";
import { themes } from "@/lib/themes";

const pwaAssetsUrl = import.meta.env.VITE_PWA_ASSETS_URL || '';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "description", content: "A web-based IDE for opencode projects" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${pwaAssetsUrl}/favicon.svg` },
      { rel: "icon", type: "image/x-icon", href: `${pwaAssetsUrl}/favicon.ico`, sizes: "any" },
      { rel: "apple-touch-icon", href: `${pwaAssetsUrl}/apple-touch-icon-180x180.png` },
      { rel: "manifest", href: `${pwaAssetsUrl}/manifest.webmanifest` },
    ],
    title: "opencode web",
  }),
  component: RootLayout,
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
      </div>
    </div>
  ),
});

function RootLayout() {
  return (
    <html
      lang="en"
      data-webtui-theme="catppuccin-mocha"
      className="antialiased"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>opencode web</title>
        <link rel="icon" type="image/svg+xml" href={`${pwaAssetsUrl}/favicon.svg`} />
        <link rel="icon" type="image/x-icon" href={`${pwaAssetsUrl}/favicon.ico`} sizes="any" />
        <link rel="apple-touch-icon" href={`${pwaAssetsUrl}/apple-touch-icon-180x180.png`} />
        <link rel="manifest" href={`${pwaAssetsUrl}/manifest.webmanifest`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const themes = ${JSON.stringify(themes)};
                const themeId = localStorage.getItem('opencode-theme') || 'catppuccin';
                const theme = themes[themeId] || themes.catppuccin;
                const root = document.documentElement;
                Object.entries(theme.colors).forEach(([key, value]) => {
                  root.style.setProperty('--theme-' + key, value);
                });
                
                // Update theme-color meta tag for PWA
                let metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (!metaThemeColor) {
                  metaThemeColor = document.createElement('meta');
                  metaThemeColor.setAttribute('name', 'theme-color');
                  document.head.appendChild(metaThemeColor);
                }
                metaThemeColor.setAttribute('content', theme.colors.background);
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <OpenCodeProvider>
          <Outlet />
        </OpenCodeProvider>
        <Scripts />
      </body>
    </html>
  );
}
