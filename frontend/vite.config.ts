import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Hands the demo sign-in panel everything it needs, from the gitignored
 * `credentials/` folder, and only to the dev server. A build gets `null` for
 * both, so neither a password nor a resident's details can reach `dist` even if
 * the panel's module somehow did.
 *
 * TWO FILES, BOTH SENT SEPARATELY AND NEITHER TRACKED
 * ---------------------------------------------------
 *   `creds.txt`            the two shared passwords, in the layout
 *                          `scripts/rotate-demo-passwords.mjs` writes: the
 *                          administrator's `Password:` line first, the shared
 *                          one for everyone else second. Anything else yields
 *                          `null`, and the panel then refuses to submit rather
 *                          than spend a real resident's failed-login allowance
 *                          on a guess.
 *
 *   `demo-accounts.json`   who the buttons are for. This used to be a literal
 *                          array inside `src/lib/demoAccounts.dev.ts` - 33 real
 *                          residents' names, email addresses and room numbers,
 *                          in a tracked file, in a public repository. Keeping
 *                          it out of `dist` was never the whole problem: it was
 *                          readable by anyone who opened the repository,
 *                          whatever the bundler did. BR-024.
 *
 * Absent either file, the panel simply does not appear. That is the correct
 * behaviour on a machine that was never sent them.
 */
function demoPanel(): Plugin {
  return {
    name: 'hivelet-demo-panel',
    config(_, { command }) {
      const read = (name: string): string | null => {
        const file = fileURLToPath(new URL(`../credentials/${name}`, import.meta.url))
        if (command !== 'serve' || !existsSync(file)) return null
        try {
          return readFileSync(file, 'utf8')
        } catch {
          return null
        }
      }

      let passwords: { admin: string; tenant: string } | null = null
      const creds = read('creds.txt')
      if (creds) {
        const found = [...creds.matchAll(/^Password:\s*(\S+)\s*$/gm)].map((m) => m[1])
        if (found.length === 2) passwords = { admin: found[0], tenant: found[1] }
      }

      let accounts: unknown = null
      const listed = read('demo-accounts.json')
      if (listed) {
        try {
          const parsed = JSON.parse(listed)
          if (Array.isArray(parsed)) accounts = parsed
        } catch {
          // A malformed file means no panel, not a broken dev server.
          accounts = null
        }
      }

      return {
        define: {
          __DEMO_PASSWORDS__: JSON.stringify(passwords),
          __DEMO_ACCOUNTS__: JSON.stringify(accounts),
        },
      }
    },
  }
}

/**
 * A production build refuses to start without `VITE_API_BASE_URL` (B-62).
 *
 * `lib/api.ts` falls back to `http://localhost:5000/api`, which is right for
 * `npm run dev` and wrong everywhere else. The value is baked in at build time,
 * so a deployment built without it went up cleanly and then every visitor's
 * browser called ITS OWN machine: it looks exactly like "the API is down", and
 * nothing on the page says why. Failing here is the only point where a person
 * is watching.
 *
 * `loadEnv` reads the variable from the shell as well as from `.env*` files, so
 * a Vercel project environment variable and a gitignored
 * `frontend/.env.production.local` both satisfy it. Nothing is committed that
 * satisfies it, deliberately: a fresh clone on Vercel's builder must fail until
 * someone names the real API. `vercel.json` beside this file holds the rest of
 * the hosting setup (the history-mode rewrite, security and cache headers).
 */
function requireApiBaseUrl(mode: string): void {
  const value = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL?.trim()
  if (value) return
  throw new Error(
    [
      '',
      'VITE_API_BASE_URL is not set, so this production build would call http://localhost:5000/api',
      "from every visitor's own computer. Set it to the API's address, ending in /api:",
      '',
      "  Deploying:      set VITE_API_BASE_URL in the Vercel project's Environment Variables",
      '                  (Settings > Environment Variables, Production and Preview), then redeploy.',
      '  Local build:    Git Bash    VITE_API_BASE_URL=http://localhost:5000/api npm run build',
      "                  PowerShell  $env:VITE_API_BASE_URL='http://localhost:5000/api'; npm run build",
      '  Or once, for every local build: put VITE_API_BASE_URL=http://localhost:5000/api',
      '  in frontend/.env.production.local (gitignored, so it never reaches a build host).',
      '',
    ].join('\n'),
  )
}

const config: UserConfig = {
  plugins: [
    demoPanel(),
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // `property-map.png` was here and nothing rendered it. The Location
      // section became a live Google Maps embed, and the still image it
      // replaced stayed in this list - so the service worker kept downloading
      // 471 KB into the offline shell on every first visit, 24% of the 1,965 KB
      // it precaches, for a picture no route draws.
      //
      // Two photographs, both WebP, converted from the 2.8 MB PNGs Sean
      // supplied on 19 Sep. The BUILDING is the landing hero and fills the
      // tall panel on the enquiry and sign-in pages, so it is precached: it is
      // the landing page's LCP. The GATE sits in the Location section, well
      // below the fold and lazy, so precaching it would make every visitor pay
      // for something most of them never scroll to.
      //
      // `galang-compound.jpg` and `galang-building.jpg` were deleted the same
      // day: nothing referenced either once the new pair landed, and leaving
      // them precached is the 471 KB `property-map.png` mistake again.
      includeAssets: ['favicon.svg', 'fe-galang-building.webp'],
      manifest: {
        name: 'Hivelet — Apartment Management & Financial Operations',
        short_name: 'Hivelet',
        description: 'Centralized apartment management, tenant portal, billing, maintenance dispatch, and financial analytics for Fe Galang Da Silva Boarding House.',
        // Was `#0c66e4` (`--primary` in `src/index.css`), a blue that appears
        // in exactly one file across the whole frontend (`App.vue`) and not
        // at all in the persistent chrome. `--brand` (`#17603f`) is what
        // `AppHeader.vue` and `AppSidebar.vue` are actually painted, what the
        // landing hero and every primary call-to-action button render as -
        // confirmed on the built site: the "Book now" button computes to
        // `rgb(23, 96, 63)`, exactly `#17603f`. `theme_color` is supposed to
        // describe that chrome to the OS (the installed window's title bar,
        // Android's status bar and task-switcher card); a blue no visible
        // surface uses was describing a green app.
        theme_color: '#17603f',
        background_color: '#fafaf9',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        id: '/',
        scope: '/',
        // `any` and `maskable` are declared as SEPARATE icon entries, each its
        // own file - not one icon carrying both purposes. A maskable icon
        // needs a full-bleed background (the OS applies its own shape on top
        // and clips everything outside a centred safe zone), while an `any`
        // icon is drawn as-is with no cropping. `favicon.svg`'s background is
        // a rounded square (rx 128) with transparent corners: correct for
        // `any`, but a shape an OS mask could reveal as a transparent gap if
        // declared `maskable` too - the anti-pattern the previous single
        // "any maskable" SVG entry was. The house glyph itself already sits
        // inside the required 40%-radius safe circle (farthest vertex ~166px
        // from centre on a 512px canvas, against a 204.8px allowance), so the
        // maskable PNGs reuse the same glyph over a full-bleed square.
        //
        // PNG fallbacks exist alongside the SVG because maskable SVG icon
        // support is inconsistent across Android launchers/WebAPK, and
        // Lighthouse's installability audit still looks for a PNG. All four
        // (`frontend/public/icon-*.png` and `maskable-icon-*.png`) were
        // rasterized from `favicon.svg` ONCE and checked in as static files -
        // there is no build step that regenerates them. If `favicon.svg`
        // changes, these four go stale silently; regenerate them by hand (or
        // script it) at the same time. There is no separate editable source
        // for the maskable variant beyond the rx-128-to-rx-0 background
        // change described above.
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/maskable-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The floor plans are 1.27 MB across ten files and a visitor sees at
        // most one of them, after choosing a unit and opening its row. Swept
        // into the precache by `**/*.png` they would be downloaded by everyone
        // who ever loads the site, which is the same mistake `property-map.png`
        // was making four days ago. They are lazy `<img>` instead, and the
        // browser caches one per floor across every unit on it.
        globIgnores: ['floorplans/**'],
        // Before this, offline navigation worked for exactly one URL: "/",
        // because that is the only address Workbox's precache route matches
        // by name. Every other address a person can land on - a refresh on
        // `/inquire`, a bookmark to `/admin/income`, a tenant's phone
        // reopening `/tenant/payments` from its home-screen icon - fell
        // through to the network, and with no network, to the browser's own
        // disconnected-page. Confirmed on the built `dist/`: with no
        // `navigateFallback`, `vite preview` + DevTools offline mode serves
        // Chrome's own error for `/inquire`, not the app.
        //
        // `/index.html` is precached already (every route is client-rendered
        // by Vue Router from this one document), and so is every route's own
        // JS chunk - lazy-loaded on first navigation for someone typing on
        // 3G, but swept into the precache regardless of which routes were
        // actually visited, because Workbox precaches by build output, not
        // by browsing history. So the fallback can safely be the real app,
        // not a placeholder: any navigation request Workbox can't otherwise
        // satisfy gets the shell, and Vue Router takes it from there with
        // whatever it has - which for `/admin/*` and `/tenant/*` is a signed
        // -in shell and no live data, exactly the "No connection" banner in
        // `App.vue` already exists to say honestly.
        //
        // A separate static "you're offline" page was considered instead
        // (and is the more common tutorial pattern) but was not added: a
        // single `navigateFallback` can only point at one URL, and pointing
        // it at a placeholder would make every one of the routes above show
        // that placeholder instead of the real, working, offline-capable
        // page they already have. The one case neither this nor any other
        // service-worker config can fix is a person's *first ever* visit
        // with no connection at all - there is no service worker yet to
        // intercept anything, so the browser's own error is what they see.
        // That is a property of how service workers install, not a gap in
        // this configuration.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
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
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') requireApiBaseUrl(mode)
  return config
})
