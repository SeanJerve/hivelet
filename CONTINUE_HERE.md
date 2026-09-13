# CONTINUE HERE — handoff for the next machine

**Last updated:** 2026-09-14, after an overnight audit session.
**Branch:** `main`. Everything described here is committed and pushed.
**Read this first, then `docs/claude_pipeline/CONTINUE_HERE.md` for pipeline detail.**

---

## 0. If you are Claude on a new machine, read this box first

Five rules that are not negotiable on this project. Breaking any of them causes real damage.

1. **The Supabase database is LIVE and holds the owner's real financial records.**
   Never `DROP`, never wipe, never truncate. All schema change is a new numbered
   migration in `database/migrations/`.
2. **Never edit `database/FULL_DATABASE_SCHEMA.sql`.** It has been wrong about the live
   schema more than once. **`database/live_schema.csv` is the source of truth**, and the
   Supabase MCP (`execute_sql`) is better still — query the catalogue directly.
3. **Verify before you report.** A "defect" about generated columns storing `0.00` was
   repeated in nine documents and recorded as two business-rule violations. It was never
   true, and the remediation it proposed would have broken every income-record write.
   Check claims against the database, not against the documents.
4. **BR-035 wording is locked.** `fifty_percent_share` is described **only** as a
   system-computed figure equal to half the row's Rent Amount, retained for ledger parity
   with the historical spreadsheet. Never name a party, recipient, purpose or destination.
   Never write "co-ownership", "co-owner", "50/50", "owner share" or "landlady share".
5. **Adyen with GCash is committed.** It is configured and working. Do not describe the
   payment gateway as a mock, a simulator, or "pending consultation" anywhere.

Other standing constraints: **no 2% rent escalation** of any kind (it appears in no
business rule — the owner sets rates by hand); the property is **33 units, not 32**.

---

## 0.5 What CANNOT come from this document — Sean must hand these over

This file is committed to a **public** repository, so it holds no secrets and no
access. Reading it is not enough to run the system. These five things pass
person-to-person, and nothing in the repo can substitute for them.

| # | What | Why the doc cannot do it |
| :-- | :--- | :--- |
| 1 | **Supabase project access.** Invite the teammate at Supabase → Project Settings → Team. | Without membership he cannot open the API page at all, so "create your own secret key" is impossible. Either invite him, or send him a key you created for him. |
| 2 | **Adyen Customer Area access**, or the four values directly: `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_CLIENT_KEY`, and an HMAC key. | Same reason. The API key is only visible once, at creation. |
| 3 | **`credentials/creds.txt`** | Gitignored, and `npm run check:api` fails without it. |
| 4 | **`.env`**, or at least the Supabase and Adyen values. `JWT_SECRET` he should generate himself. | Gitignored by design. |
| 5 | **A second Adyen webhook** — see the warning below. | Requires clicking in the Adyen Customer Area. |

### Two people cannot share one webhook

An Adyen webhook points at exactly **one** URL. If both machines run their own
Cloudflare tunnel, only the machine named in the webhook receives notifications —
the other will complete a GCash payment at Adyen and see nothing appear in the
ledger, with no error anywhere.

Two ways out, and the second is better:

- **Take turns.** Whoever is demonstrating edits the webhook URL to their tunnel.
- **Create a second Standard webhook** in Adyen, pointing at the second tunnel.
  **It gets its OWN HMAC key.** That key must go in *that machine's* `ADYEN_HMAC_KEY`.
  Copying Sean's key into the teammate's `.env` makes every notification fail
  signature verification, which looks exactly like a broken integration.

### The tunnel URL changes every restart

`cloudflared tunnel --url http://localhost:5000` gets a **new random address each
time it starts** — after a reboot, a power cut, or closing the terminal. The old
URL stops resolving and Adyen's notifications go nowhere.

**After any restart: copy the new URL and update it in Adyen** (Developers →
Webhooks → your webhook → Server configuration), then press **Test** and confirm
a 200. Two minutes, and the payment demo silently does not work without it.

Check the tunnel is actually carrying traffic:

```bash
TUNNEL=https://your-tunnel.trycloudflare.com

# 200 = the API is reachable from the internet
curl -s -o /dev/null -w "%{http_code}\n" "$TUNNEL/api/health"

# 401 = correct: the endpoint is alive and refusing an unsigned call
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' "$TUNNEL/api/public/payments/adyen/webhook"
```

On Windows the first run raises a **Windows Defender Firewall** prompt for
`cloudflared.exe`. Allow it — the tunnel cannot accept the return connection
otherwise. It is asked once per machine.

---

## 1. What a fresh environment needs

You asked what to set up beyond the Supabase MCP and Adyen. Here is the complete list.
Items marked **SECRET** are gitignored and must be transferred out of band — never by
commit, and never pasted into a chat that is logged.

### 1.1 Prerequisites

| Thing | Notes |
| :--- | :--- |
| Node.js 22.x | `node --version`. The repo is tested on v22.16.0. |
| Git | `npm run hooks:install` after cloning — installs the pre-commit secret scanner. |

### 1.2 Install

```bash
git clone https://github.com/SeanJerve/hivelet.git
cd hivelet
npm run install:all        # installs backend/ and frontend/
npm run hooks:install      # REQUIRED - blocks commits containing secrets
```

### 1.3 `.env` at the repository root — **SECRET**

Copy `.env.example` to `.env` and fill it in. There is only ONE `.env`, at the root;
`backend/.env` does not exist and is not read.

| Variable | Where it comes from | Required? |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase → Project Settings → API. Not a secret. | **Yes** |
| `SUPABASE_PUBLISHABLE_KEY` | Same page, `sb_publishable_…`. Deliberately powerless — it holds no grant on any table. Used only by the health check. | **Yes** |
| `SUPABASE_SECRET_KEY` | Same page, `sb_secret_…`. **Bypasses RLS entirely.** Server-only. Never let it reach a browser, a build, or a screenshot. | **Yes** |
| `JWT_SECRET` | Generate your own: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` | **Yes** |
| `JWT_EXPIRES_IN` | `7d` | Yes |
| `ADYEN_API_KEY` | Adyen Customer Area → Developers → API credentials | **Yes** — see §1.4 |
| `ADYEN_MERCHANT_ACCOUNT` | e.g. `HiveletECOM` | **Yes** |
| `ADYEN_CLIENT_KEY` | `test_…`. Safe in the browser; must have your origin allow-listed. | **Yes** |
| `ADYEN_ENVIRONMENT` | `TEST` | Yes |
| `ADYEN_HMAC_KEY` | Generated when you create the webhook. Hex string. | **Yes** |
| `ADYEN_WEBHOOK_USER` / `ADYEN_WEBHOOK_PASSWORD` | Basic Auth on the webhook. Optional but recommended; HMAC applies either way. | Recommended |
| `PORT` | `5000` | Yes |
| `CLIENT_URL` | `http://localhost:5173` | Yes |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | Yes |

> **On the Supabase keys.** Both teammates should hold **their own** secret key, not a
> shared one, so a single leak can be revoked without breaking everyone. Supabase →
> Project Settings → API → create a new secret key per person.
>
> **History note.** Live keys and the JWT secret were committed to this public repo
> between 2026-08-25 and 2026-09-13. Everything has been rotated and the legacy JWT keys
> disabled, but **git history still contains the old values** — that was a deliberate
> decision (rotation is the remediation; rewriting history would break every clone and
> change nothing about a three-week exposure). Do not be alarmed to find them there. Do
> not reuse them.

### 1.4 Adyen — committed, with GCash

GCash is enabled on the test merchant account and **verified working**:

```bash
# confirms which methods the account actually offers
curl -s -X POST https://checkout-test.adyen.com/v71/paymentMethods \
  -H "x-api-key: $ADYEN_API_KEY" -H "Content-Type: application/json" \
  -d '{"merchantAccount":"'"$ADYEN_MERCHANT_ACCOUNT"'","countryCode":"PH","amount":{"currency":"PHP","value":100000},"channel":"Web"}'
# -> scheme (Cards), gcash (GCash)
```

**The webhook is the only thing that writes an online payment.** Set it up or online
payments will never appear in the ledger:

1. Adyen Customer Area → Developers → Webhooks → **Standard webhook**.
2. URL: your public tunnel address + `/api/public/payments/adyen/webhook`.
3. **Generate an HMAC key**, paste it into `ADYEN_HMAC_KEY`.
4. Set Basic Auth to the same user/password as `ADYEN_WEBHOOK_USER` / `_PASSWORD`.
5. Press **Test** in the Adyen UI and confirm a 200.

A local server is not reachable from Adyen, so you need a tunnel while developing:

```bash
cloudflared tunnel --url http://localhost:5000
```

The tunnel URL changes every restart — update the webhook URL in Adyen each time.

> **If Adyen is not configured**, `isLiveConfigured()` is false and a local development
> checkout page serves instead. That page is **refused with 404 in any environment where
> Adyen *is* configured** — it writes a payment and is unauthenticated by necessity, so it
> must not coexist with the real gateway.

### 1.5 Supabase MCP

Already in `.mcp.json`, pointing at project `xeynbzcoywogcaesyhkw`. The MCP needs your own
Supabase auth — approve it when Claude first calls it. Used heavily for verifying claims
against the live catalogue.

### 1.6 `credentials/creds.txt` — **SECRET**, gitignored

Holds the admin login and the shared demo-tenant password. **The test scripts read it**,
so `npm run check:api` fails without it. Ask for it directly; do not commit it.

Format the scripts expect:

```
Email:     admin@hivelet.ph
Password:  <admin password>
...
Password:  <shared tenant password>
```

(The first `Email:`/`Password:` pair is the admin; the **last** `Password:` is the tenant one.)

> All 44 demo passwords were rotated on 2026-09-13 because the old ones had been public.
> If a teammate's saved password stops working, that is why.

### 1.7 Run it

```bash
npm run dev:backend      # :5000
npm run dev:frontend     # :5173
```

Health check — **`enforced` is the only passing value**:

```bash
curl -s http://localhost:5000/api/health | grep -o '"rlsLockdown":"[a-z]*"'
```

`unverified` means your publishable key was rejected before it reached PostgreSQL, so the
lockdown was never actually tested. That is exactly what a stale key looks like.

---

## 2. Verification suites — run these before trusting anything

```bash
cd backend  && npm run check:api        # 26 endpoint + RBAC isolation checks
            npm run check:adyen       # 23 HMAC signature checks
            npm run check:billing     # water / grace / period arithmetic
cd frontend && npm run check:tokens     # design tokens resolve to the right colours
cd ..       && npm run check:secrets    # scans for committed credentials
            npm run backup            # snapshot the live database before risky work
```

All of these passed at handoff: **26 / 23 / all / all / clean**.

---

## 3. What changed overnight (2026-09-13 → 14)

Ten commits. The ones that matter:

### Payments
- **A real Adyen payment created two rows.** The browser wrote one under a locally
  invented reference; the webhook wrote another under the gateway's `pspReference`, which
  its duplicate check matches on — so it could never recognise the first. The browser path
  was also forgeable: any tenant could POST their own session id and place an unpaid row
  in the verification queue. **The webhook is now the sole writer.** The browser return
  asks our server, which asks Adyen server-to-server (`GET /v71/sessions/{id}?sessionResult=…`).
- The browser cannot be fixed by sending the reference: Adyen Web v6 whitelists exactly
  seven keys into `onPaymentCompleted` and `pspReference` is not one. Verified by reading
  the shipped bundle.
- A failed Adyen call no longer falls through to the local page — an outage used to become
  a `Pending Verification` payment the owner could reasonably have approved.

### Ledger integrity
- **Cash could be recorded with nothing written to the books.** The on-site modal skipped
  the POST if the unit did not match, swallowed the error if it threw, then marked the unit
  settled and said "posted to the ledger".
- **OR numbers were invented** on both sides from `Math.random()`. All 937 real rows carry
  numbers from the owner's receipt book (`OR#4627`); a 4-digit random collides at even odds
  after ~100 entries. Both sides now require it.
- The income **create** route bypassed the shared `money` validator. `z.number()` rejects
  NaN but **accepts `Infinity`**, and PostgreSQL sorts Infinity above every numeric, so
  `CHECK (rent_amount >= 0)` passed it — poisoning both generated columns and every `SUM`.

### Security
- **The RLS self-check passed while misconfigured.** It treated any probe error as proof of
  lockdown, and "Invalid API key" looks identical to "permission denied" at HTTP 401. A
  rotated-out key reported a green padlock. Now a three-state verdict
  (`enforced` / `exposed` / `unverified`), asserted by `check:api`.
- **The tenant portal was writing false intrusion attempts into the audit log.**
  `systemState.ts` fired six admin-only requests on every page load regardless of role;
  each refusal was audited. **2,104 of 2,224 audit rows are this bug**, and the table is
  append-only so they are permanent. Fixed; the view now opens on the 120 real events.

### Documents
- **Withdrew a defect that was never real.** "`fifty_percent_share` / `remitted_amount`
  store 0.00" appeared in nine places and marked **BR-035 and BR-038 as Violated**. Both
  columns are `GENERATED ALWAYS AS … STORED` — PostgreSQL derives them and *rejects* any
  write naming them. All 937 rows are correct. **Violation count is now 1, not 5.**
- Recounted everything else. Correct as written: 21 tables / RLS forced / zero policies,
  33 units, floors 11-11-10-1, 39 permissions, ₱3,432,990.47 personal at 58.95%.
  Corrected: 158 → **164** database calls, `admin.ts` 2,056 → **2,263** lines,
  5 → **9** services, "20 tables" → **21**.

### Interface
- ~20 fabrications removed. The audit log invented four entries attributed to the owner on
  any API failure; the profile form pre-filled a fake emergency contact that would save on
  submit; a payment with no status displayed as **VERIFIED**.
- Design tokens were dead code — 1,879 hex literals, zero token uses, and `--primary` was
  not the primary button's colour. 1,786 converted with provably zero visual change.
- Figures were being cut in half at 390px, hidden by `overflow-x: hidden`. Zero clipping
  across all 12 routes now, zero console errors.
- All nine diagrams re-rendered at 3,900–5,400px (they were ~800px — that is the blur).

---

## 4. What to do next

In the order I would take them.

| # | Task | Why |
| :-- | :--- | :--- |
| 1 | **Confirm the Adyen webhook end to end on the new machine.** Start the tunnel, update the webhook URL, press Test, then pay a real test bill with GCash and watch a `Pending Verification` row appear. | It is the only writer now. If it is not working, online payments silently never record. |
| 2 | **BR-039** — the API does not enforce that advance rent equals the rent at move-in. The form pre-fills it from the live price, but the rule is not enforced. | The last remaining genuine violation. |
| 3 | **No transaction boundary anywhere in `backend/src`.** `replace_expense_allocations` is the only atomic multi-row write, and it is a database function because supabase-js cannot open a transaction. Every other multi-step write can half-complete. | The honest answer if the panel asks what is still weak. |
| 4 | **No Overdue transition.** Nothing moves a bill from `Due` to `Overdue` — no handler, no job, no trigger. | FR-013 is MISSING, correctly recorded as such. |
| 5 | **Service extraction.** 131 of 164 database calls still sit in route handlers; `admin.ts` is 2,263 lines. Six of the planned services still do not exist. | The architecture's stated target. Not required for the defense. |
| 6 | Tell teammates the demo passwords changed, and have each create their own Supabase secret key. | Housekeeping from the credential rotation. |

**Do not** "fix" `fifty_percent_share` or `remitted_amount` by adding them to an INSERT.
That was proposed in the old traceability matrix and would break every write.

---

## 5. Where things live

| What | Where |
| :--- | :--- |
| Defense script (6 sections) | `docs/claude_pipeline/outputs/PHASE3_DEFENSE_PACK.md` |
| Panel recommendation register | `docs/claude_pipeline/outputs/PHASE3_PANEL_RECOMMENDATION_REGISTER.md` |
| ERD + data dictionary | `docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md` |
| 3NF proof | `docs/claude_pipeline/outputs/PHASE2_NORMALIZATION_PROOF.md` |
| Security / RLS posture | `docs/claude_pipeline/outputs/PHASE2_SECURITY_AND_RLS.md` |
| Business-rule crosswalk | `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` |
| Errata against the submitted module | `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` |
| Paste-ready Mermaid for all diagrams | `docs/diagrams/DIAGRAM_SOURCE.md` |
| Rendered PNGs | `docs/diagrams/rendered/` |
| Migrations (21, apply in order) | `database/migrations/` |
| Live schema — **the source of truth** | `database/live_schema.csv` |

**Live baseline at handoff**, so you can tell whether anything moved:
15 payments · 937 income records · 1,327 expense allocations · 33 rooms · 5 clusters ·
45 profiles · 2 bills · 21 tables.
