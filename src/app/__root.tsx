import {
  Outlet,
  createRootRoute,
  Scripts,
} from "@tanstack/react-router";
import "./globals.css";
import { OpenCodeProvider } from "@/contexts/OpenCodeContext";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "opencode web" },
      { name: "description", content: "A web-based IDE for opencode projects" },
    ],
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
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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