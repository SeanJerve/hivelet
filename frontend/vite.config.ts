import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Hands the demo sign-in panel its passwords from the gitignored
 * `credentials/creds.txt`, and only to the dev server. A build gets `null`, so
 * no password can reach `dist` even if the panel's module somehow did.
 *
 * Parsing relies on the layout `scripts/rotate-demo-passwords.mjs` writes: the
 * administrator's `Password:` line first, the shared one for everyone else
 * second. Anything else yields `null`, and the panel then refuses to submit
 * rather than spend a real resident's failed-login allowance on a guess.
 */
function demoPasswords(): Plugin {
  return {
    name: 'hivelet-demo-passwords',
    config(_, { command }) {
      let value: { admin: string; tenant: string } | null = null
      const file = fileURLToPath(new URL('../credentials/creds.txt', import.meta.url))
      if (command === 'serve' && existsSync(file)) {
        const found = [...readFileSync(file, 'utf8').matchAll(/^Password:\s*(\S+)\s*$/gm)].map((m) => m[1])
        if (found.length === 2) value = { admin: found[0], tenant: found[1] }
      }
      return { define: { __DEMO_PASSWORDS__: JSON.stringify(value) } }
    },
  }
}

export default defineConfig({
  plugins: [
    demoPasswords(),
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
    /**
     * `host: true` binds every network interface, not just localhost - which is
     * what lets a phone on the same wifi open the tenant portal for testing.
     *
     * The trade-off, stated so it is a choice rather than an accident: while
     * `npm run dev` is running, **anyone on the same network can reach this
     * server** and read the source it serves. On campus wifi or the boarding
     * house's own network that is not a small audience.
     *
     * It matters more on this machine than most. `npm audit` (2026-09-16) reports
     * vite 5.4.21 and esbuild 0.21.5, both dev-only and neither shipped, with
     * four advisories between them - and **two are Windows-specific**: an NTLMv2
     * hash disclosure through UNC path handling, and a `server.fs.deny` bypass
     * via alternate paths. `host: true` makes those reachable from the LAN rather
     * than only from a malicious page in the developer's own browser.
     *
     * The fix is vite 8, a major upgrade. Not something to run days before a
     * defense on a working build - recorded for Sean to decide. Until then:
     * do not leave the dev server running on an untrusted network.
     */
    host: true
  }
})
