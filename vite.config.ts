import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  const pwaAssetsUrl = process.env.VITE_PWA_ASSETS_URL || ''
  const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS
  const allowedHosts =
    allowedHostsEnv?.split(',').map((host) => host.trim()).filter(Boolean) ?? undefined

  return {
    server: {
      port: 3000,
      ...(allowedHosts ? { allowedHosts } : {}),
      proxy: {
        '/api/events': {
          target: process.env.VITE_OPENCODE_SERVER_URL || 'http://localhost:4096',
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path, 'http://localhost')
            const directory = url.searchParams.get('directory')
            return `/event${directory ? `?directory=${directory}` : ''}`
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Accept', 'text/event-stream')
              proxyReq.setHeader('Cache-Control', 'no-cache')
              proxyReq.setHeader('Connection', 'keep-alive')
            })
          },
        },
      },
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({
        srcDirectory: 'src',
        router: {
          routesDirectory: 'app',
          routeFileIgnorePattern: '(_components|api)',
        },
      }),
      viteReact(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'opencode web',
          short_name: 'opencode',
          description: 'A web-based interface for OpenCode projects',
          theme_color: '#1e1e2e',
          background_color: '#1e1e2e',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: `${pwaAssetsUrl}/pwa-64x64.png`,
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: `${pwaAssetsUrl}/pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `${pwaAssetsUrl}/pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${pwaAssetsUrl}/maskable-icon-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
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
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
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
          navigateFallback: '/',
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
  }
})
