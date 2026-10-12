# Start here: Lloyd's machine (written 12 October 2026)

**For Lloyd, and for the Claude session on Lloyd's laptop. Read this before anything else after a
`git pull`.** The owner is Lloyd's mother, so the questions only she can answer, and the things only
someone at the property can do, are collected here in one place. Everything else (`CONTINUE_HERE.md`,
`HANDOFF_TO_LOYD.md`, `CLIENT_MEETING_QUESTIONS.md`, `BLOCKED_FOR_SEAN.md`) is background. Each item
below names the entry it came from, so the detail is one search away.

**For Claude on this machine:** work through Section 1 with Lloyd. When he gives an answer, write it
under the question (date, the answer in her words where possible, and who relayed it), tick the box,
and then do the "With the answer" step. Do not act on an answer that has not been given: an unknown
stays unknown. `CLAUDE.md`'s rules still hold: a change to live data is a new numbered migration
(**next number 081**) after `npm run backup`, written and queued in `BLOCKED_FOR_SEAN.md` for Sean to
apply, never an ad-hoc `UPDATE`.

---

## 1. Questions for the owner (one sitting, about 30 minutes)

> Not asked again, because already answered: Linda's units pay ₱200 per person like every other
> unit (20 Sep, client sheet 2d), the move-in money is called **Deposit** (B-44), and the 33 rates
> are hers as of 20 Sep (B-29).

Say first: **nothing is broken and no money is missing.** These are things her records do not say,
and only she knows.

### 1.1 Did the 3G tenant move out on 4 October? (B-100) · **ask first**

On the evening of 4 October someone testing on the live site with her administrator account changed
four real records. All four are being put back by migration `079`, but only if none was real:

- ☐ **Ann Kristine Diaz, 3G.** The system now says she moved out on 4 October. Did she?
- ☐ **3D, August 2026, INV#5245, ₱8,700.** It was voided. Was that receipt real (it should stand)?
- ☐ **"BDO (fe) deposit", 24 February 2026.** Two lines were added (Back Apartment ₱5,000, Front
  Apartment ₱20,000), so it reads ₱88,000 instead of ₱63,000. Were those hers?
- ☐ **An expense from supplier "jjeijse_2323", 4 October, ₱11,000.** Test data, almost certainly. Confirm.

**With the answer:** if all four were test changes, tell Sean "apply 079" (he applies it). If 3G's
tenant really left, 079's step 4 must come out first; write that in B-100.

### 1.2 How many people live in F2F now? (B-102)

The tenancy says 4 (₱800 water). After the September receipt was voided on 6 October, her latest
standing receipt for F2F says 1, so `check:ledger` reports a disagreement.

- ☐ ____ people

**With the answer:** if 4, nothing changes in the data; the check's expected count goes from 3 to 4
(BR-014 in `backend/scripts/check-ledger*`). If 1, write migration 081 setting the tenancy to 1 and
queue it for Sean.

### 1.3 September and October 2026 collections are not in the system

Read on 12 October 2026: August 2026 has receipts for **15 of 32** occupied units, and September
and October have **none** standing. Tenants with no receipt read as owing.

- ☐ She will record them herself in **Monthly Income > Record payment** (from her receipt book)
- ☐ She gives the book (or photos) and Lloyd records them with her
- ☐ Leave it; the paper says the ledger is complete through July and partly August

**With the answer:** recording a receipt through the screen is the normal way and needs no
migration. Use her account only for her real receipts; tests use `loydtest`.

### 1.4 Seven units whose headcount changed recently (B-44, B-33)

Water is ₱200 a head, so this is money. Her book shows a recent change in each; real move or slip?

- ☐ 1h (went up to 2) ☐ B3B (up to 2) ☐ B3F (up to 2) ☐ 2e (down to 1) ☐ 3b (down to 1)
  ☐ 3d (down to 1) ☐ 3g (down to 1)

### 1.5 Is the rent day the last day of the month for these five? (B-44)

She said the rent day is the move-in day. These five drift with the month's length (31st, 30th,
28th in February): **3c, B3B, 2g, 3d, 1e.** ☐ Yes, end of the month ☐ No: ____

### 1.6 Unit 2f: three receipt numbers (B-40, client sheet 2g)

2f paid every month except three (9 Nov 2025 to 8 Feb 2026), and receipts **5063, 5090 and 5106**
are the only unused numbers in that stretch, each on the right date. ☐ Look in her book: what do
those three say? ____

### 1.7 Where the Penthouse spending belongs (client sheet 2c)

₱55,198 that mentions the Penthouse sits in three other areas (₱35,228 of it under Personal, so
outside the rental accounts). ☐ Move all of it to Penthouse ☐ Move only the ₱35,228 ☐ Leave it

### 1.8 2025's ₱2.56 million booked as personal or Main House (client sheet 2e)

Eight times the 2024 figure for Main House. ☐ Correct, an unusual year for the house ☐ Some of it
is a rental cost: ____

### 1.9 Four questions about how she keeps the books (Chapter 5, recommendation 1)

- ☐ Is the large figure at the bottom of her income sheet a **year-to-date total**? (OD-01)
- ☐ May she **add her own expense categories**, or is the thirteen-line list fixed? (OD-08)
- ☐ May tenants **report a cash payment** for her to confirm? (OD-10)
- ☐ The **move-in date** of each current tenancy (her workbook never recorded them; settling a
  deposit at move-out depends on them)

### 1.10 Her privacy page (client sheet 3c)

- ☐ Is the property **registered with the National Privacy Commission**, or is there a named data
  protection officer? Nothing is printed on `/privacy` until she answers.

### 1.11 Tell her, no answer needed (client sheet 3d)

**Reject** on a GCash payment keeps it out of her records but **does not return the money**. A refund
is made in the Adyen Customer Area. (The gateway is still on Adyen's test account, so no real money
moves yet.)

---

## 2. Things Lloyd can do at the property

| # | What | Why | From |
| :--- | :--- | :--- | :--- |
| 1 | **Hand the user manual to the owner** (`docs/FINAL MANUSCRIPT/USER_MANUAL_APPENDIX_K.md`, Part 2) and go through it screen by screen; **write down the date** | Chapter 4 Table 25 still says the hand-over is "still to come"; her lowest rating was learning without help | Ch. 5 rec. 6 |
| 2 | **Re-test the offline Overview on her laptop:** disconnect, reload Overview; does any tile show ₱0 instead of "could not be loaded"? | Walkthrough defect A-30 (step 23b), not reproduced since | B-90 |
| 3 | **On the Infinix GT20:** start a save, switch away, come back after 45 s; it should say it cannot tell whether it was saved | Defect O-12, mitigated 1 Oct, never re-tested on that phone | B-90 |
| 4 | **On a real iPhone:** attach a photo to a repair as `loydtest` (it should arrive as JPG); **on Android:** type a phone number (the spacing should not jump the cursor) | Two evaluator fixes only a real phone can prove | B-99 |
| 5 | **Export this laptop's prompt log:** `node scripts/ai-use/export-prompt-log.mjs`, read it, keep it (it goes to `ai-use-log/`, never committed) | The AI-use disclosure; this laptop's history disappears if Claude Code's history is cleared | `AI_USE_DISCLOSURE.md` §3 |
| 6 | **Put the two course guides on this machine** (*Capstone Project 2 Student Guide, Chapter 4* and *Writing and Defending Chapter 5*; they are in Lloyd's Downloads) in `docs/FINAL MANUSCRIPT/guides/`. That folder is gitignored: they are the professor's, and the repository is public | Chapter 4 is 118 pages in Word and is to be cut to the guides; Claude needs them to do it | Section 3 |
| 7 | **Ask Eljohn** which phone each timing in Chapter 4 Table 11 came from (Infinix GT20 on Wi-Fi, iPhone 15 on mobile data) | The table's headings must name the devices | Ch. 4 §4.3.5 note |
| 8 | **Name the AI tool used in July and August** (Iteration 1) | The disclosure's one missing tool | `AI_USE_DISCLOSURE.md` §2 |
| 9 | **Find the Ullah et al. (2021) source** cited in §1.1 and add its APA entry | Cited five times, not in the References | FIXES G7 |
| 10 | **Ask the adviser:** keep Chapter 4 by objective or use the guide's headings (GUIDE D1); where the AI statement goes; whether the certifications on pp. 5 and 6 need the current title | Each changes what gets pasted | GUIDE D1, FIXES E |

**Demos and tests use `loydtest`, never the owner's administrator account.** Every write made with her
account lands in her real books (that is how B-100 happened).

## 3. Waiting on this machine: cut Chapter 4 to the guides

Once item 6 above is done, Claude here can do it. The plan, agreed with Sean on 12 October:

- **Move, do not delete.** The body keeps the results per objective and what they mean; detail goes
  to appendices: the data dictionary (7A), the full walkthrough rows, the item-by-item survey tables,
  the measured-evidence tables 14A to 21A (condensed into 22A), the full Tables 23 and 23A, most of
  §4.4.8's security detail. Target roughly 35 to 45 pages.
- Follow the guide's required headings if it fixes them (D1).
- Then rerun `node scripts/manuscript/number-by-chapter.mjs` and `node scripts/build-chapter-4-docx.mjs`,
  and check every number in Chapter 5 is still in Chapter 4.

## 4. Sean's only, so do not try them here

Applying migrations `079` and `080` (B-100, B-104); making the repository private (B-103); the current
admin password in `credentials/creds.txt` (B-101); the Adyen keys and webhook; the Claude account's
data-use setting (`AI_USE_DISCLOSURE.md` §7).
