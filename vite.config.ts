import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE || (process.env.GITHUB_ACTIONS ? '/refined-platinum-dex/' : '/'),
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png', 'fonts/*.ttf', 'fonts/*.woff2'],
      manifest: {
        name: 'Refined Platinum Dex',
        short_name: 'RefinedDex',
        description: 'Offline Sinnoh-Style Pokédex for Pokémon Refined Platinum',
        theme_color: '#c2272d',
        background_color: '#b81e28',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        cleanupOutdatedCaches: true
      }
    })
  ],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false
  }
});
