# Cloud handoff — read this first (written 2026-10-02 by the laptop session)

Paste-ready brief for a cloud session continuing Hivelet before the Saturday 3 Oct 2026 evaluation.
Check `git log` first: anything below already committed by the laptop session is done — verify, don't redo.

## Rules (from CLAUDE.md — read it in full)

- The database is LIVE. Every data or schema change is a new numbered migration in
  `database/migrations/` (check the folder for the next number), `npm run backup` first when you
  have `.env`, apply through the Supabase MCP, verify with a query. Never drop/wipe/ad-hoc UPDATE.
  Never edit `database/FULL_DATABASE_SCHEMA.sql`. Never alter or delete `audit_logs`.
- Never run `npm run check:all`, `check:api` or `check:relations` (they sign in as the owner and
  write to her live log). Never sign in to the live site. Never read `.env` contents.
- BR-035 wording locked; never call Adyen "mock/simulator/pending consultation"; 33 units; never
  repoint the Adyen webhook or make a new HMAC key; the admin contact is Michelle, never name
  Mrs. Fe Galang Da Silva as the person to contact.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commit and push to main after every verified piece** (pull first). Vercel deploys main; confirm
  the live site serves it. The session can end at any time.

## Verify every change

`cd frontend && npx vue-tsc --noEmit`; `VITE_API_BASE_URL=https://hivelet.vercel.app/api npx vite build`;
from the repo root `npm run check:canon`, `check:labels`, `check:components`, `check:tokens`,
`check:endpoints`, `check:rules` (and `check:ledger` if `.env` exists); `cd backend && npx tsc --noEmit`.
Browser-test at 375x812 and 1366x768, light and dark, against a local build with a stub API (never
the live DB). For offline: `vite build` + `vite preview`, visit screens online, then offline + cold
reload (service worker must serve the shell).

## Open work, in priority order (Sean, 2 Oct afternoon)

1. **Offline must work on the INSTALLED app.** Sean's installed app offline shows Chrome's own
   "You're offline" page (app icon + "You're offline") — i.e. the service worker did not serve the
   navigation at all, so none of the saved figures can show. The IndexedDB layer
   (`frontend/src/lib/offlineCache.ts`) works when the shell loads (verified on a local production
   build: 13/14 screens offline). Find why the live site's service worker doesn't serve the shell
   offline: is it registered/activated on https://hivelet.vercel.app, does precache install succeed
   (Vercel challenge mode B-94 can 403 the precache fetches), `navigateFallback` / denylist in
   `frontend/vite.config.ts`, scope, `sw.js` cache headers in `vercel.json`. Essential offline
   content only: balances/rent (tenant), Overview figures and graphs, tenant names, notifications.
2. **Rename "BH" to "Boarding House"** everywhere it is a label shown to people (cluster names on
   Overview "Units by cluster", Rooms and rates, Tenants, Monthly Income/Expenses filters and
   tables, downloads, public pages). Keep data codes/keys unchanged unless a migration is truly
   needed; map at display time. Check Excel exports too.
3. **Rooms and rates edit dialog: the "Photograph" becomes the unit's floor plan** — the same floor
   plan the public category pages show for that unit/floor (find where the public pages get it).
   Show it by default in the admin dialog; keep it replaceable by the admin (upload), and the public
   page must show whatever the admin set. Connect both to one source.
4. **Remove the eye (preview) icon** on Rooms and rates unit cards — the edit dialog already previews.
5. **Tenants: a sort/filter to arrange tenants by unit** (in the Filters sheet, e.g. "Order: by unit").
6. **Downloads: cancelling the save still shows "Report downloaded"** — only show success when the
   file was actually saved (see `frontend/src/lib/downloadReport.ts`; a cancelled save picker must
   say nothing or "Not saved").
7. **Security + accessibility audit** (never done): backend RBAC/IDOR, validation, rate limits,
   headers/CSP, uploads, webhook code review only, `npm audit --omit=dev`; axe-core (install outside
   the repo) on every screen light+dark at 375/1366, keyboard/focus/touch targets. Fix low-risk
   issues; write `docs/AUDIT_2026-10-02_SECURITY_ACCESSIBILITY.md`.
8. Docs: update `docs/FINAL MANUSCRIPT/USER_MANUAL_APPENDIX_K.md`, `HANDOFF_TO_QA.md` §0a and
   `CONTINUE_HERE.md` §0.0 for every change (Show as in Filters; year-default figures; Download
   dialog, month files end "only"; offline essentials; loader on first load only; items above).

Mark each item here **DONE (commit)** as you finish it, and push.
