import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/app/index.tsx',
    'src/app/__root.tsx',
    'src/router.tsx',
    'src/app/globals.css',
    'server.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['index.ts'],
  ignoreDependencies: ['tailwindcss', '@webtui/css', '@webtui/theme-catppuccin'],
  vite: {
    entry: ['vite.config.ts'],
  },
}

export default config
