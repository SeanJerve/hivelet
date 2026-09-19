# Functional audit — 2026-09-19

**Run by:** Claude, on Sean's machine, while the design account held `frontend/src/`.
**Brief:** audit the whole system for function — does it work, and does it show what it should —
without touching appearance.
**Backup first:** `backups/2026-09-19T00-01-15/`, 12,948 rows across 21 tables.

> **What this document is.** A record of one session: what was exercised, what was found, what
> was verified it against, and what could not be reached. It is **not** a defect register to be
> read later as current — §2 of the judgement log is about exactly that failure. Every claim
> below names its evidence so a later reader can re-check rather than inherit.

---

## 0. The headline

**Five defects found and fixed, three of them on the path the owner's cash takes into the
ledger.** All five were invisible: none produced an error, a failing suite, or a console
warning. Two more findings need a person and are `B-15` and `B-16`.

**The 20 automated suites passed before this session and pass after it**, which is the point —
they were never going to catch any of these. Each defect lives in a gap the suites are known not
to cover: a `v-model` compared by strict equality, a figure the client computes and the server
ignores, a guard whose condition names one of its two inputs.

---

## 1. What was actually exercised

| | Evidence |
| :--- | :--- |
| `npm run check:all` — **20 / 20**, run five times across the session | summary table, never the tail |
| `TESTING_REHEARSAL.md` **steps 1-6, live in a browser** | network calls (`201`, `200`), screenshots, not just the screen |
| Frontend production build + `vue-tsc` | clean |
| Backend build (`tsc`) | clean |
| `check:secrets` against a **freshly deleted and rebuilt** `dist/` | clean; 2 assets, no resident data |
| Adyen, server-to-server against the real test gateway | `200`, methods `scheme (Cards), gcash (GCash)` |
| Adyen webhook, unsigned POST | `401` |
| Local checkout page while a gateway is configured | `404`, as it must be |
| Public site under a **simulated `/public/rooms` outage** | `window.fetch` overridden in the page only; backend untouched; restored after |

**Rehearsal steps 7-26 were not run, and not for a Hivelet reason.** Continuing past step 6
means typing a password into the login form to sign back in, and this agent's environment
refuses credential entry outright as a blocked action class. It is not a judgement call and does
not lift for an authorised test account. **A person needs to run 7-26** — see `B-14`.

---

## 2. Defects found and fixed

### 2.1 The unit dropdown on the cash form rendered blank, and posted to 1A anyway

`OnsitePaymentModal` opened on `selectedUnit = ref('1a')`. `rooms` carries unit codes in **two
cases over its life**: the `canonicalUnits.ts` seed is lowercase, and `fetchRooms()` replaces the
whole array with uppercase (`(r.room_number || '').toUpperCase()`). The `<option>` values come
from that same field.

Every comparison in the codebase is `.toLowerCase()`-guarded, so the difference is invisible
everywhere except the one place that compares by strict equality and cannot be told not to: a
`<select>` matching `v-model` against its options. Once the live list landed, nothing matched
`'1a'` — `selectedIndex -1`, field blank — while the ref still held `'1a'`, which
`triggerRecord()` uppercases into the payload. **Fill in the figures without opening the
dropdown and the collection is recorded against 1A, an occupied unit with a real resident.**

Proved rather than argued: the blank render against a real `<select>` in the browser, and the
fix against the live module in the running app across both list phases, the deep-link path, an
unknown unit and an empty list.

**The same defect on the form that creates a tenancy.** Swept all five unit-bound selects;
three were already consistent. `TenantManagement`'s onboarding was not, twice — `ref('1a')`, and
`checkInquiryConversion()` forcing `?unit=PH` through `.toLowerCase()`. So **converting an
enquiry for PH selected nothing**, while `syncDepositToUnit()` on the next line found the unit
case-insensitively and filled in BR-039's advance rent. An advance rent sitting on a form
showing no unit to apply it to.

Fixed with one `asListedUnitCode()` beside `rooms` rather than two copies. It corrects case and
**refuses to do anything else** — an unknown unit comes back unchanged, so the dropdown shows
nothing and the administrator must choose, rather than a tenancy landing on whichever unit
sorted first.

### 2.2 The cash form asked for water the ledger was never going to record

The form presents water as an input. The server treats it as derived: `POST
/admin/income-records` writes `computeWaterFee(roomNumber, occupants)`, there is **no water
field in the payload the modal sends and none in `incomeRecordSchema`**. Whatever is typed is
discarded — the schema's own comment says so in passing, about the garbage fee: *"Unlike water
it is NOT derived."*

Three consequences, all latent only because **no collection has ever been recorded through this
interface**:

1. The form multiplied the baseline by `monthsCovered` and put it in *"Total handed over"*.
   `computeWaterFee` takes no month count. **A three-month receipt asked the resident for three
   months of water and booked one.**
2. Any figure at or above the floor passed silently and was then replaced. **BR-036 asks the
   system to "warn before saving rather than silently accepting"**, and it was silently
   accepting in the one direction nobody tests — upwards.
3. ₱0 is offered by the form (*"unless it is ₱0"*) and **cannot be recorded at all**, because
   `occupants` is `min(1)` and the fee is `heads × rate`.

Asked the ledger rather than reasoned about it: **all 837 non-Linda rows with water record
exactly `occupants × rate`, none a multiple of it** — so the server already agreed with her book
and the form was the odd one out. Arrears are carried **one row per month** (`OR#4895` across
four). And **100 rows carry zero water**, 62 Linda and **38 not**.

First two fixed. The third, and the question of what a multi-month receipt should even look
like, are hers — `B-15`.

### 2.3 The water label asserted a headcount the system did not have

`currentOccupantsCount` was `count > 0 ? count : 1` — the `|| 1` guess that `occupantsFor()`
twenty lines below was deliberately written to stop making. On `PH`, the vacant unit the
rehearsal runs on, the water field holds 0 while the label beside it read **"₱200 × 1
occupant"**. The same shape as the watch-dependency defect already recorded in that file's own
comments.

### 2.4 The Linda hint quoted a rate the validator did not use

The hint read `=== 'lf' ? 400 : 200` as literals while the submit path validated against the
**configured** charge. Change a Linda rate in settings and the sentence and the field below it
disagree. Both read `waterBaselineFor()` now, so there is one source. *(Same class as the two
uncommitted fixes found in the working tree at session start and committed after being verified
rendering live.)*

### 2.5 Vacate would deactivate an administrator, and there is only one

`POST /admin/tenants/:profileId/vacate` ends by writing `account_status: 'inactive'`. It
selected `role` and **never read it**, and `requirePermission` guards who is *calling*, not who
is being vacated. Pointed at an administrator's profile id it deactivates that administrator —
and `authService` checks `account_status` after a valid password, so the owner is refused her
own login with the correct one.

**Counted, not assumed: `profiles` holds exactly one admin row, and it is active.** There is no
second administrator to undo it with; recovery means editing the live database.

Not reachable from the interface, which is why it has not bitten: `GET /admin/tenants` filters
`.in('role', ['tenant','prospect'])`, so an administrator never appears in the list the Vacate
button is drawn from. **The list endpoint knew something this one was never told.**

**Deliberately not probed against production.** The judgement log already settled that argument
for the reject guard: a test that is only safe while the code under test is correct is a second
copy of the risk — and here a broken guard locks the owner out. Verified the premise instead
(`profiles.role` is exactly `'admin'`, matching `user_role_type`) and left the behavioural test
to a person.

### 2.6 Water was recomputed on the headcount, not on the unit

`PATCH /admin/income-records` derives water from **two** things and rewrote it inside `if
(occupants !== undefined)`. Move a record to a different unit without touching the headcount and
it keeps the old unit's water — onto `LB`, a fixed charge (BR-040), it would carry `occupants ×
rate` from wherever it came from, and `remitted_amount` is `GENERATED ALWAYS AS (rent_amount +
water_payment)`.

Latent: the edit form sends both fields on every save, so the condition was always true. It was
correct because of what its one caller happens to send.

---

## 3. Checked and found sound

Recorded because a later reader should not have to re-derive them, and because four of these
looked like defects until they were checked.

| Suspicion | What it actually is |
| :--- | :--- |
| footer links `/category/1-bedroom`, which is not a slug | `resolveSlug()` keeps the old slugs working on purpose, and is wired |
| `isVerified(status)` compares `'VERIFIED'` | the mapper uppercases first — consistent |
| `group.key === 'Linda'` never matching | the key is literally `'Linda'`, defined in that view |
| the income ledger's hardcoded per-cluster unit lists | **every income row's unit is covered** — asked the database, zero uncovered |
| `r.totalRemitted` / `r.fiftyPercentShare` — camelCase, which `check:fields` cannot see | mapped in `systemState.ts:822-823` from the snake_case columns, which `check:fields` **does** cover |
| tenant routes taking an id | ticket messages check ownership and return **404, not 403**; notifications filter on `recipient_profile_id` |
| `POST /tenant/tickets` — the judgement log's "one honest weak spot" | **fixed in `623a88a`**; the log still said otherwise and has been corrected |

**B-01's fix is real**, confirmed against a genuine simulated outage: the four category plates
print *"Availability could not be loaded"* and no number, and the standfirst drops its *"Rents
start at ₱4,500"* sentence rather than quoting the seed.

---

## 4. Left for a person

| | |
| :--- | :--- |
| **`B-14`** | Admin password **rotated for real** by rehearsal step 5 — `creds.txt` updated, other machines need it out of band. Steps 7-26 still need a human. One test enquiry left on the owner's board (`REHEARSAL Test`, unit PH) |
| **`B-15`** | Zero-water receipts cannot be recorded, and every multi-month settlement in her book is one row per month — which is not the shape `monthsCovered` produces. Both hers |
| **`B-16`** | During one outage `/category/studio` says availability cannot be determined while `/public` lists 33 units as Available. Design account's lane and file |
| **`B-05`** | Still open, re-confirmed live today: two junk tickets on `1A`, one titled with a slur, still `Submitted` and still on the owner's overview. Migration `027` written, not applied |

---

## 5. What moved in the live database

Counted against this session's own backup. **No money was written.**

| | backup | after | |
| :--- | ---: | ---: | :--- |
| `monthly_income_records` | 937 | 937 | unchanged |
| `monthly_expense_entries` | 1,262 | 1,262 | unchanged |
| `expense_property_allocations` | 1,327 | 1,327 | unchanged |
| `payments` · `bills` | 15 · 2 | 15 · 2 | unchanged |
| `rooms` · `profiles` · `room_assignments` | 33 · 45 · 48 | 33 · 45 · 48 | unchanged |
| `inquiries` · `inquiry_messages` | 1 · 1 | 2 · 2 | **the rehearsal's step-3 enquiry** |
| `notifications` | 20 | 21 | its notification |
| `audit_logs` | 9,219 | 9,437 | append-only; five `check:all` runs and the sign-ins |

One credential changed: the administrator password, by rehearsal step 5 — which is the step the
team could never test, because it burns the credential every check signs in with.

---

## 6. Two things worth carrying forward

**A value with two sources and no way to say which one it came from.** Every defect in §2.1-2.4
is that shape: a seed and an API that disagree on case; a client and a server that disagree on
who owns a figure; a label and a field computed from different expressions. The judgement log's
nineteenth sweep says the tell is a fallback that is invisible when it is right. **The narrower
tell found here: a value compared with `===` somewhere, and `.toLowerCase()` everywhere else.**
The lowercasing is what hides it, and a `<select>` is where it finally shows.

**`check:all` can report a false FAIL right after a backend edit.** The backend runs under `tsx
watch`, so editing `backend/src` restarts it mid-run and `check:relations` hits a half-started
process. It did here — **FAIL in 0.4s against its usual 2.2s**. Run the suite alone before
believing it; it was 22/22, and 20/20 once the server settled. The judgement log records this
for a probe; it applies to the suite runner too.
