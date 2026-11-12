# Handoff to Lloyd: polish (10 Nov 2026)

Sean has stopped for now and handed the polish to you. Everything below is on `main` and live on
hivelet.vercel.app. All 21 checks passed at hand-off with the backend up.

Read `CLAUDE.md` first: the five rules that do not bend, and the lanes (Sean's side: `backend/src/`,
`database/migrations/`; yours: `docs/`, `frontend/src/`). `BLOCKED_FOR_SEAN.md` is the queue.

## How to check your work

```bash
npm run dev:backend
```

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

Read the summary table, not the tail. The local site talks to the **live** database: open dialogs to
look, then cancel. To see admin and tenant screens without signing in, use the mocked pages
`frontend/_harness-admin.html` and `frontend/_harness-tenant.html` (gitignored; ask Sean for them).

## The design rules Sean settled this week (do not undo)

- **On the page, not in cards.** Lists and tables sit on the page. Cards only for what needs action
  or is its own object: the tenant's Amount due, a repair card, the Income and expenses chart.
  Never a full-width card. Nothing stretches to fill a row; leftover space stays empty.
- **Admin Overview, top to bottom.** First, Needs your attention, on the page, with a rule under it.
  Each part has a short title with its arrow beside it. Each item shows name, then figure, then
  date. Next, Rent for the current month, then up to 3 "Due this week" tenants. Clicking one opens
  Record payment on that unit. Last, Occupancy beside Income and expenses. Key figures are 30px,
  just under the 34px greeting.
- **One wording for each thing.**
  - "Not recorded" for any missing value, muted.
  - "Rent for <Month>" for the month a payment is filed under.
  - "<start> to <end>" for a period.
  - "Paid <date>", "Due <date>", "Sent <date>", "Reported <date>".
  - "GCash", never "GCash (online)" or "online payment".
  - "Tenant", never "Resident". No email anywhere.
  - Added 12 Nov (B-121): "No tenant" for a unit nobody lives in (Vacant stays the status), "Nothing
    matches" for every empty search, and "Record this expense?" with Go back / Record it, as payments.
  - One name for each thing, as the paper has it since 12 Nov: tenant, prospective tenant, unit,
    inquiry, repair request. She is "the landlady", never "the owner": she manages the boarding
    house for its owner.
- **GCash** works end to end in Adyen's **test** environment and takes no real money. It is optional
  and not live, because going live needs the owner's merchant onboarding documents. Never call it "under
  development", "mock" or "simulator" (rule 5).
- **Past years are read-only** on screen and on the server. The exception: last year stays open
  while any of its December rent is unrecorded.
- **Tenant Payments.** History tab first. A bill already fully sent is not a card. No sentence
  under "Not accepted".
- **Dropped, do not bring back:**
  - "Edit" tooltips on clickable rows.
  - Subtitles under page headings.
  - The year inside card titles.
  - Dividers between the attention parts and above the due tenants.

## What the final audit fixed (10 Nov)

- **Backend:**
  - Rent due this week now reads all 33 tenants in 3 requests instead of 100. It went from 2.2–2.8 s
    to about 0.5 s, with identical results; `check:billing` proves it.
  - A tenant can no longer cancel a repair at the moment a technician is assigned (`check:concurrency`).
- **Admin:**
  - Figures under the chart show centavos.
  - GCash notifications read "₱13,000" and the sidebar badges read "Repairs 2 new" to a screen reader.
  - One word, "website", in the Edit unit dialog.
  - Tenants sort numerically.
  - Empty "Income by" and "Expense by" cards say "Not recorded" or "Nothing matches".
  - "Occupants" and "Bank transfer" match between Record payment and Edit payment.
  - The button now reads "Log a repair".
- **Tenant and public:**
  - Tabs read History, then Record.
  - A sent month reads "Sent <date>".
  - Repairs show three steps (Submitted, In progress, Done), and the notes say "Marked done".
  - "Send inquiry" has its icon.
  - Terms say "A GCash payment".

## Polish list (open design calls, none broken)

These came out of four audits. Most are wording or layout consistency, so check each with Sean
before changing it.

1. **Twin wording:**
   - Record payment confirms with "Record this payment?" / Go back / Record it. Record expense
     confirms with "Record expense entry" / Cancel / Record entry.
   - Delete confirms say "cannot be brought back", "removed for good" and "This can't be undone".
   - An empty unit is called "No active tenants", "Vacant" or "Nobody" in different pickers.
   - The unit picker reads "1A, name" in Log a repair but "1A (Boarding House)" in Manage.
   - The Overview says "Move someone in/out"; Tenants says "Move someone in".
   - The empty search message has two voices.
2. **Expenses:**
   - Record expense shows no total for a split.
   - "Main House (personal)" in the Where menu vs "Main House" in the table and key.
   - Kinds print as codes ("8 — Repairs & Maintenance").
   - "—" for an area that got nothing.
3. **Monthly Income:**
   - A cluster with no payments shows a large green "₱0".
   - The verify dialog lacks the "not live yet, reject these" note and has no Cancel.
   - "Rent and water for" on the To verify card vs "For" in the dialog.
   - A stale comment at about line 1215 says Download moves on a phone.
4. **Repairs:** "Mark resolved" saves in one click with no confirm. Verify payment and Send
   technician do the same.
5. **Inquiries:**
   - A missing date falls back to "Recently" or "Time not recorded", not "Not recorded".
   - A Closed inquiry still shows the reply box.
   - Inquiry rows on the Overview show a bare date; the other parts say "Sent" and "Reported".
6. **Tenant Overview:**
   - Rent and water appear twice, in the Amount due card and the Monthly charge row.
   - With a bill open plus an unbilled month, the Overview total (₱9,400) is more than the one bill
     card on Payments (₱4,700). Sean removed the extra card on purpose.
7. **Sheets:**
   - Short sheets (the Add to home screen steps, the homepage vacancy prompt) open at full height.
   - Cancel on Move someone in and Record payment keeps what was typed.
8. **Public site:**
   - The 404 header has no "Inquire now".
   - The address is written three ways.
   - Sign in uses the browser's own "Please fill out this field".
   - The unit-page inquiry opens with text already typed.
9. **Smaller:**
   - The phone menu marks the current page with a solid fill; the desktop uses the sliding glass.
   - The Download dialog title is in Title Case.
   - A future month on the chart says "Not yet".
   - Old stored notifications still say "ticket" in their text.
10. **Sean's side (backend):**
    - Notification messages still say "contact the administrator" and "marked resolved".
    - The GCash webhook could write ₱ amounts itself.

Also in `BLOCKED_FOR_SEAN.md`: B-121, the same kind of list from 6 Nov, and B-106, which removes
the test tenant loydtest from PH **after the defense**. loydtest is used in the demo, so until then
Occupancy reads 33 of 33.

## The paper

`FINAL/` is the manuscript. Never edit its numbered files; edit `FINAL/_src/` or
`docs/FINAL MANUSCRIPT/` and run `node scripts/manuscript/build-final.mjs`. Start at
`FINAL/00_READ_ME_FIRST.md`, which says what every file there is for. What still waits on a person
is `FINAL/00_NEEDS_YOUR_ATTENTION.md`, and the defense's Form 2, item by item, is
`FINAL/DEFENSE_CHECKLIST_STATUS.md`. The documents themselves, one folder per Form 2 item, are in
`_DEFENSE CHECKLIST/` in the hivelet folder (committed; the repository is public, so no signed scan goes in it until it is private): rebuild it after changing the paper with
`node scripts/manuscript/build-defense-folder.mjs`. Open items are in
`FINAL/QUESTIONS_TO_FINALIZE.md` §1. P21 still needs the adviser to confirm how the paper words its
disclosure that the data transfer used an AI coding assistant. The test-case sheets are the 30 Sep
record, so leave their wording as it is; the 4 Nov re-run lists which labels have changed since.
