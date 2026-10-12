# Start here: Lloyd's machine (updated 12 October 2026, evening)

**For Lloyd, and for the Claude session on Lloyd's laptop. Read this before anything else after a
`git pull`.** The owner is Lloyd's mother, so the questions only she can answer, and the things only
someone at the property can do, are collected here in one place. Everything else (`CONTINUE_HERE.md`,
`HANDOFF_TO_LOYD.md`, `CLIENT_MEETING_QUESTIONS.md`, `BLOCKED_FOR_SEAN.md`) is background. Each item
below names the entry it came from, so the detail is one search away.

**For Claude on this machine:** when Lloyd gives an answer, record it in a dated
`CLIENT_ANSWERS_<date>.md` (as on 12 October), tick it here, and do the step beside it. Do not act on
an answer that has not been given: an unknown stays unknown. `CLAUDE.md`'s rules still hold: a change
to live data is a new numbered migration (**next number 082**) after `npm run backup`, never an ad-hoc
`UPDATE`, and every test uses `loydtest`, never the owner's account.

---

## 1. The owner's answers: done on 12 October

Recorded in [`CLIENT_ANSWERS_2026-10-12.md`](CLIENT_ANSWERS_2026-10-12.md) (22 answers, relayed by
Lloyd). Applied the same evening from this machine, after a backup, and **checked again from Sean's
machine against the live database at 18:40**:

- **079** (B-100): the 4 October test session undone. The 3D receipt INV#5245 counts again, the
  February BDO expense is back to ₱63,000, the test expense is voided, 3G is occupied again. The
  ledger reads **952 standing receipts, ₱8,214,100.00** (F2F's September receipt, voided on 6 October,
  accounts for the difference from the 953 in B-100).
- **080** (B-104): the API's role can no longer TRUNCATE the audit trail.
- **081**: 1h, B3B and B3F now record 2 occupants, as she confirmed.
- Settled with no data change: F2F has 4 people; 2f's three blank months stay blank; the 2025
  renovation explains the personal spending; the Penthouse spending stays where it is; the rent days
  and headcounts in her book are right; tenants do not report cash payments; the bottom figure of her
  income sheet is a year-to-date total; no NPC registration is needed; she knows a rejected GCash
  payment is not refunded automatically.

## 2. Still open

| # | What | Who | Then |
| :--- | :--- | :--- | :--- |
| 1 | **Her August, September and October 2026 receipts.** On 12 October the system holds August for 15 of the 32 occupied units and nothing for September or October. Lloyd said the file comes on 13 October | Lloyd, with her book | Entered as numbered migrations (082 onward) after a backup, each receipt checked against the book; or she records them herself through **Record payment** |
| 2 | **The move-in date of each current tenancy.** Her workbook never recorded them; settling a deposit at move-out depends on them (Ch. 5 rec. 1) | The owner | One migration with the dates |
| 3 | **Her own expense kinds** (answer 13: keep the 13 and let her add her own) | Being built on `feature/owner-expense-kinds` | Merge when it is verified |
| 4 | **Hand the user manual to the owner** (`docs/FINAL MANUSCRIPT/USER_MANUAL_APPENDIX_K.md`, Part 2), screen by screen, and **write down the date** | Lloyd | Chapter 4 Table 25 stage 4 then says when; her lowest rating was learning without help |
| 5 | **Re-test the offline Overview on her laptop:** disconnect, reload Overview; does any tile show ₱0 instead of "could not be loaded"? | Lloyd | Defect A-30 (walkthrough step 23b) closed or reopened in B-90 |
| 6 | **On the Infinix GT20:** start a save, switch away, come back after 45 s; it should say it cannot tell whether it was saved | Lloyd | Defect O-12 closed or reopened in B-90 |
| 7 | **Export this laptop's prompt log:** `node scripts/ai-use/export-prompt-log.mjs`, read it, keep it (it goes to `ai-use-log/`, never committed) | Lloyd | The AI-use disclosure (`docs/FINAL MANUSCRIPT/AI_USE_DISCLOSURE.md` §3) |
| 8 | **Put the two course guides on this machine** (*Capstone Project 2 Student Guide, Chapter 4* and *Writing and Defending Chapter 5*, in Lloyd's Downloads) in `docs/FINAL MANUSCRIPT/guides/`, which is gitignored | Lloyd | Claude here cuts Chapter 4 to them (Section 3) |
| 9 | **Which phone each timing in Chapter 4 Table 11 came from** (Infinix GT20 on Wi-Fi, iPhone 15 on mobile data) | Eljohn | The table's headings name the devices |
| 10 | **The AI tool used in July and August** (Iteration 1) | Whoever built it | `AI_USE_DISCLOSURE.md` §2 |
| 11 | **The Ullah et al. (2021) source** cited in §1.1 | Whoever wrote §1.1 | Its APA entry in the References (FIXES G7) |
| 12 | **The adviser:** Chapter 4 by objective or the guide's headings (GUIDE D1); where the AI statement goes; whether the certifications on pp. 5 and 6 need the current title | Anyone | Each changes what gets pasted |

Done and not to repeat: the iPhone photo and Android phone-number checks (answers 21 and 22).

## 3. Waiting on item 8: cut Chapter 4 to the guides

Chapter 4 is 118 pages in Word. The plan, agreed with Sean on 12 October:

- **Move, do not delete.** The body keeps the results per objective and what they mean; detail goes
  to appendices: the data dictionary (7A), the full walkthrough rows, the item-by-item survey tables,
  the measured-evidence tables 14A to 21A (condensed into 22A), the full Tables 23 and 23A, most of
  §4.4.8's security detail. Target roughly 35 to 45 pages.
- Follow the guide's required headings if it fixes them (D1).
- Then rerun `node scripts/manuscript/number-by-chapter.mjs` and `node scripts/build-chapter-4-docx.mjs`,
  and check every number in Chapter 5 is still in Chapter 4.

## 4. Sean's only

Making the repository private (B-103, answer 18); signing in once as the owner so her failed sign-in
count resets (B-101; her password is not stored, answer 19, so `check:api` and `check:relations` stay
off); the Adyen keys and webhook; the Claude account's data-use setting (`AI_USE_DISCLOSURE.md` §7).
