import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'property-map.png'],
      manifest: {
        name: 'Hivelet — Apartment Management & Financial Operations',
        short_name: 'Hivelet',
        description: 'Centralized apartment management, tenant portal, billing, maintenance dispatch, and financial analytics for Fe Galang Da Silva Boarding House.',
        theme_color: '#0c66e4',
        background_color: '#fafaf9',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            /**
             * PUBLIC AND HEALTH ONLY. Do not widen this to `/api/`.
             *
             * Tenants open this on their phones, and a boarding-house phone is
             * often a shared one. Caching `/api/tenant/*` or `/api/admin/*` would
             * leave one resident's bills, payments and tickets in the service
             * worker's cache, ready to be served to whoever opens the app next -
             * offline, with no token, after a sign-out.
             *
             * Room listings and the health probe carry nothing personal, so they
             * are safe to serve stale. Verified 2026-09-16 in the SHIPPED worker:
             * `dist/sw.js` contains zero `api/(admin|tenant|auth)` patterns and
             * precaches 9 static assets only.
             *
             * Widening this for offline support would be an easy, well-meant
             * change with no visible symptom.
             */
            urlPattern: /\/api\/(public|health)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-read-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    host: true
  }
})
