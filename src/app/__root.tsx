import {
  Outlet,
  createRootRoute,
  Scripts,
} from "@tanstack/react-router";
import "./globals.css";
import { OpenCodeProvider } from "@/contexts/OpenCodeContext";
import { themes } from "@/lib/themes";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { name: "description", content: "A web-based IDE for opencode projects" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>opencode web</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
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
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <OpenCodeProvider>
          <Outlet />
        </OpenCodeProvider>
        <Scripts />
      </body>
    </html>
  );
}