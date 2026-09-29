# Field tests: offline, weak signal, simultaneous users, layout and accessibility

The three scripts that produced Chapter 4's §4.3.6 (Tables 11A and 11B) and the accessibility
result in `docs/FINAL MANUSCRIPT/PRE_TESTING_AUDIT_2026-09-29.md`, kept so anyone can re-run them
and get a number rather than quote one.

| Script | What it measures | Writes anything? |
| :--- | :--- | :--- |
| `offline-and-weak-signal.mjs` | Installability, the app opening offline on ten addresses, the offline banner and "Back online", the public list served from cache and after a stalled API, and first/returning load on Fast 3G and Slow 3G. Live site, phone profile | No. Every non-GET request is aborted in the browser |
| `simultaneous-readers.mjs` | A: 12 simultaneous visitors on the live public pages for 60 s. B: 6 simultaneous readers of the owner's ten main data requests for 45 s, through the **local** backend against the live database (signs in once as the administrator from `credentials/creds.txt`) | No. GET only |
| `layout-and-accessibility.mjs` | Sideways overflow on seven public pages at 360, 390 and 1366 px; axe-core WCAG 2 A and AA rules at 390 and 1366 px | No. Every non-GET request is aborted |
| `owner-screens-layout.mjs` | The same two measures on the owner's eight screens at 360, 390, 768 and 1366 px, signed in on the **local** build (local backend, live database) with `credentials/creds.txt`. Needs `npm run dev:backend` and `npm run dev:frontend`, opened as `localhost` (the backend's CORS list) | No. Every non-GET but sign-in is aborted; prints measurements, never record text |

**A contrast finding on one scan only is usually text caught mid-animation.** Twice on 29 September
a page reported contrast issues on the first scan and 0 when re-scanned a few seconds later. Re-scan
before calling it a defect.

## Running them

```bash
cd scripts/field-tests
npm install --no-save playwright-core@1 axe-core@4
node offline-and-weak-signal.mjs
node layout-and-accessibility.mjs
npm run dev:backend   # in another terminal, from the repo root, for part B
node simultaneous-readers.mjs
```

They drive the Chrome already installed on the machine, so nothing is downloaded but the two
packages. Elsewhere, set `CHROME_PATH` to the Chrome or Edge executable. Report the machine,
browser version, network and time with any number you take from them; Chapter 4 does.

## Read before quoting a result

- **Chrome's phone emulation is not a phone.** The testing day repeats the offline and install
  cases on real Android and iPhone handsets (`TESTING_DAY_TEST_CASES.md`, part O).
- **The load test measures reads.** Simultaneous writes are covered by the code guards listed in
  the audit report and by people in the testing day's Session 3.
- **Keep it a person's pace.** The load script pauses 0.25 to 0.75 s between a user's requests.
  Do not turn it into a flood against the live site: it serves the owner's real business, and the
  hosting and database plans are small.
- **Never add a POST.** The abort guards are what make these safe to run against production.
