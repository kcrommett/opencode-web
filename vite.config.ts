import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { getOpencodeServerUrl } from "./src/lib/opencode-config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  // Ensure helpers that read from process.env (like getOpencodeServerUrl)
  // see the same values we loaded via loadEnv when running the bare Vite dev server.
  // Prioritize canonical env vars (OPENCODE_*) over legacy ones
  if (!process.env.OPENCODE_SERVER_URL && env.OPENCODE_SERVER_URL) {
    process.env.OPENCODE_SERVER_URL = env.OPENCODE_SERVER_URL;
  }
  if (!process.env.OPENCODE_SERVER_URL && !process.env.VITE_OPENCODE_SERVER_URL && env.VITE_OPENCODE_SERVER_URL) {
    process.env.VITE_OPENCODE_SERVER_URL = env.VITE_OPENCODE_SERVER_URL;
  }
  if (!process.env.OPENCODE_WEB_PORT && env.OPENCODE_WEB_PORT) {
    process.env.OPENCODE_WEB_PORT = env.OPENCODE_WEB_PORT;
  }
  if (!process.env.OPENCODE_WEB_HOST && env.OPENCODE_WEB_HOST) {
    process.env.OPENCODE_WEB_HOST = env.OPENCODE_WEB_HOST;
  }
  const isDev = mode === "development";
  // Use relative URLs for PWA assets to work with reverse proxies
  const pwaAssetsUrl = env.VITE_PWA_ASSETS_URL || "";
  const allowedHostsEnv = env.VITE_ALLOWED_HOSTS;
  const allowedHosts = allowedHostsEnv
    ?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) ?? ["localhost"];

  // Handle reverse proxy base path
  const basePath = env.VITE_BASE_PATH || "";

  const transformerEnv =
    env.OPENCODE_WEB_CSS_TRANSFORMER || env.VITE_CSS_TRANSFORMER;
  const normalizedTransformer = transformerEnv?.toLowerCase();
  const cssTransformer =
    normalizedTransformer === "postcss"
      ? "postcss"
      : normalizedTransformer === "lightningcss"
        ? "lightningcss"
        : "postcss";

  return {
    base: basePath,
    css: {
      transformer: cssTransformer,
    },
    server: {
      port: Number(env.OPENCODE_WEB_PORT || env.PORT) || 3000,
      allowedHosts,
      // CLI populates process.env before invoking Vite
      proxy: {
        "/api/events": {
          target: getOpencodeServerUrl(),
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path, getOpencodeServerUrl());
            const directory = url.searchParams.get("directory");
            return `/event${directory ? `?directory=${directory}` : ""}`;
          },
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Accept", "text/event-stream");
              proxyReq.setHeader("Cache-Control", "no-cache");
              proxyReq.setHeader("Connection", "keep-alive");
            });
          },
        },
      },
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({
        srcDirectory: "src",
        router: {
          routesDirectory: "app",
          routeFileIgnorePattern: "(_components|api)",
        },
      }),
      viteReact(),
      VitePWA({
        registerType: "autoUpdate",
        filename: "sw.js",
        includeAssets: [
          "favicon.svg",
          "favicon.ico",
          "apple-touch-icon-180x180.png",
        ],
        injectRegister: "auto",
        manifest: {
          name: "oc web",
          short_name: "oc web",
          description: "OC Web - A web-based interface for OpenCode projects",
          theme_color: "#1e1e2e",
          background_color: "#1e1e2e",
          display: "fullscreen",
          display_override: ["fullscreen", "standalone"],
          orientation: "any",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: pwaAssetsUrl
                ? `${pwaAssetsUrl}/pwa-64x64.png`
                : "/pwa-64x64.png",
              sizes: "64x64",
              type: "image/png",
            },
            {
              src: pwaAssetsUrl
                ? `${pwaAssetsUrl}/pwa-192x192.png`
                : "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: pwaAssetsUrl
                ? `${pwaAssetsUrl}/pwa-512x512.png`
                : "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: pwaAssetsUrl
                ? `${pwaAssetsUrl}/maskable-icon-512x512.png`
                : "/maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
          navigateFallback: "/",
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: isDev,
          type: "module",
        },
      }),
    ],
  };
});
