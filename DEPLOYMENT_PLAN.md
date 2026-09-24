# Deployment plan — a proposal, not yet done

**For Sean to approve.** Written 2026-09-24 on Loyd's machine. **No account has been created and
nothing has been paid for.** Pick an option in § 1, and the rest follows from it.

---

## 0. Facts this plan is built on (checked, not assumed)

| | |
| :--- | :--- |
| **Database region** | **AWS `ap-northeast-2`, Seoul.** `db.<ref>.supabase.co` resolves to `2406:da12:…`, and AWS's published `ip-ranges.json` puts `2406:da12::/36` in ap-northeast-2. Inferred, so confirm it in Supabase → Project Settings → General. It is **outside the Philippines** (B-60) |
| **Frontend** | Vite + Vue, a PWA, `createWebHistory()`, so **every path must fall back to `index.html`**. The service worker already does this offline (`navigateFallback`, `/api/` denied) |
| **API base URL** | `frontend/src/lib/api.ts:11` falls back to `http://localhost:5000/api` when `VITE_API_BASE_URL` is unset. **A production build without it ships a site that calls the visitor's own laptop.** It is read at build time, not at runtime |
| **Backend** | `npm run build` → `node dist/server.js`. Helmet, CORS allow-list, `trust proxy 1`, `GET /api/health` (503 when the database is down) |
| **Single process** | The rate limiters and the refusal budget are **in memory**. Run **one** instance. Two would double every limit |
| **Payment return URL** | `defaultReturnUrl()` uses the **first** entry of `CORS_ORIGINS`. The production origin has to be listed first |
| **Adyen webhook** | `POST /api/public/payments/adyen/webhook`, Basic Auth + HMAC. It currently points at a `cloudflared` tunnel that changes on every restart |

---

## 1. Where to host it — the decision

The API should sit **near Seoul**, because every request makes several database round trips.

| | Frontend | API | Cost | Catch |
| :--- | :--- | :--- | :--- | :--- |
| **A (recommended)** | Cloudflare Pages | Render **Starter**, Singapore | **~$7/mo** | None worth naming. Always on, so Adyen's webhook is answered immediately |
| **B** | Cloudflare Pages | Render **Free**, Singapore | **$0** | Sleeps after 15 min idle, and the first request takes ~50 s. A resident's first page load is slow, and Adyen may retry a webhook that timed out (the handler is idempotent, so a retry does no harm) |
| **C** | Cloudflare Pages | Fly.io, `sin` | ~$2–5/mo | More setup (a `fly.toml` and a Dockerfile) |
| **D** | — | The university server | ? | `server.ts` mentions "the university server's reverse proxy", and Chapter 3 § 3.2.5 says so too. Only worth it if someone confirms the university will actually host it |

Cloudflare Pages is free, gives HTTPS, and does the history-mode fallback without configuration
(a site with no `404.html` is treated as a single-page app). Netlify or Vercel would do the same.

**The production domain depends on this choice.** With A or B it would be
`https://hivelet.pages.dev` (frontend) and `https://hivelet-api.onrender.com` (API) unless you buy
a domain. Once decided, the frontend can add an absolute `og:image`.

---

## 2. Environment variables

**Frontend (Cloudflare Pages → build settings).** Public by nature: anything `VITE_` ends up in
the bundle.

| Variable | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://<api-host>/api` — **required.** See § 0 |
| Build command / output | `npm run build` in `frontend/` → `frontend/dist` |

**Backend (the host's secret settings, never the repository).**

| Variable | Value |
| :--- | :--- |
| `NODE_ENV` | `production`. This also hides stack traces, although that is already the default |
| `PORT` | whatever the host assigns |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` | the current `sb_` pair. **Not** the legacy `eyJ…` keys, which are disabled |
| `JWT_SECRET` | **generate a new one for production** (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). This signs everyone out once, at go-live |
| `JWT_EXPIRES_IN` | as now |
| `CORS_ORIGINS` | `https://<frontend-origin>` **first**, comma-separated. Leave localhost out in production |
| `CLIENT_URL` | `https://<frontend-origin>` |
| `ADYEN_API_KEY`, `ADYEN_CLIENT_KEY`, `ADYEN_MERCHANT_ACCOUNT` | as now |
| `ADYEN_ENVIRONMENT` | `TEST` |
| `ADYEN_HMAC_KEY` | **the existing key. Do not generate a new one** — Adyen keeps its own copy to sign with |
| `ADYEN_WEBHOOK_USER`, `ADYEN_WEBHOOK_PASSWORD` | as now |

---

## 3. Adyen, once the API has a permanent address

1. Customer Area → Developers → Webhooks → **edit the existing** Standard webhook. Set the URL to
   `https://<api-host>/api/public/payments/adyen/webhook`. **Keep the HMAC key.** Keep Basic Auth.
2. Developers → API credentials → the web-service user → **Allowed origins: add
   `https://<frontend-origin>`.** The Drop-in refuses to load on an origin not on that list.
3. Retire the `cloudflared` arrangement (B-03). One permanent URL replaces "whoever is testing
   repoints it".

---

## 4. HTTPS and security headers

- **HTTPS**: both hosts issue certificates automatically. Nothing to buy.
- **API**: Helmet is already on (`server.ts`).
- **Frontend**: a `frontend/public/_headers` file for Cloudflare Pages. It is drafted below and
  **not yet added**. Run the CSP as `Content-Security-Policy-Report-Only` first, because the Adyen
  Drop-in loads images and frames from `*.adyen.com`:

  ```
  /*
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=()
    Content-Security-Policy-Report-Only: default-src 'self'; connect-src 'self' https://<api-host> https://*.adyen.com; script-src 'self' https://*.adyen.com; frame-src https://*.adyen.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'
  ```

- **`trust proxy`**: `1` is right for Render or Fly (one proxy in front). Put Cloudflare in front of
  the API as well and it becomes `2`. Otherwise every resident shares one rate-limit counter and
  the audit trail records the proxy's address.

---

## 5. Uptime and backups

- **Uptime**: UptimeRobot (free), `GET https://<api-host>/api/health` every 5 minutes, alerting
  on anything other than 200. It returns 503 when the database is unreachable, so this catches a
  dead database as well as a dead server.
- **Backups**: `npm run backup` writes every table to `backups/<timestamp>/` (gitignored). Proposed
  routine:
  - before every migration, as now;
  - **weekly**, by a person, copied somewhere private and encrypted.
  - **Never from GitHub Actions.** The repository is public, and a backup holds 45 people's
    contact details.
  - Supabase's own daily backup is a second line, not the first: on the free tier it cannot be
    downloaded.

---

## 6. Go-live checklist (after approval)

1. Create the two services and set § 2's variables.
2. `GET /api/health` → 200, database `connected`, `rlsLockdown: enforced`.
3. From the production site: sign in, load the dashboard, and confirm no CORS errors in DevTools.
4. Repoint the Adyen webhook (§ 3), then make one TEST GCash payment. Expect a
   `Pending Verification` row and the webhook in the API log.
5. Install the PWA on a phone from the production URL.
6. Update B-60 with the confirmed region, and give the frontend the domain for `og:image`.

**What stays on Sean's side**: approving § 1, the Adyen Customer Area changes (§ 3), and whoever
pays if option A or C is chosen.
