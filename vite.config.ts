import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Crate',
        short_name: 'Crate',
        description: 'Your personal music backlog',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        share_target: {
          action: '/add',
          method: 'GET',
          params: { url: 'url', title: 'title', text: 'text' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/coverartarchive\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'cover-art-cache', expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/musicbrainz\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'musicbrainz-cache', expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
})
