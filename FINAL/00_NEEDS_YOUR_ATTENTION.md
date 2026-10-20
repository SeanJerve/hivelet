# Needs your attention

Updated 18 October 2026 from Sean's answers. What the team will bring later is in
[TO_FOLLOW.md](TO_FOLLOW.md). The detail behind each item is in `QUESTIONS_TO_FINALIZE.md` (P
numbers) and `BLOCKED_FOR_SEAN.md` (B numbers).

---

## Done (Sean, 18 October)

- **The Word file**: opened, fields updated; the Appendix N tables fit the page and Tables 3-1 and
  4-5 sit whole on one page.
- **The owner's September and October receipts** (P14): the owners will enter them themselves on
  Monthly Income when the time comes. Marked done.
- **The owner's current password** is in `credentials/creds.txt`, so check:api and check:relations
  can run (B-101).
- **The survey** (P11): ten respondents, overall 4.59, recomputed through the paper by another
  session on 19 October.

## Still open

| # | What | Who |
| :-- | :--- | :--- |
| 0 | ~~Which number visitors call~~ **Done 20 Oct**: her account now holds 0927 465 3938 (it held the app's example number), the site shows her account's number, and she signs in with it. **She signs in with that number now, not her email** | Tell her |
| 1 | ~~Change number / password~~ **Done 20 Oct**: in her account menu; it asks for her current password and current number | - |
| 1b | **F2F's headcount**: her record for F2F says **4 people** (set 27 Aug), but every receipt she wrote for F2F from November 2025 to August 2026 charged water for **1**. A September receipt for 4 people (₱800 water) was recorded and then cancelled. Ask her: how many live in F2F now? If 1, change it on Tenants > Edit; if 4, nothing to change, and the September bill's ₱200 water was what she charged | The owner |
| 1c | ~~A test tenant for check:api~~ **Done 20 Oct**: it signs in as loydtest by login ID; 78 of 78 pass, the tenant isolation checks included | - |
| 1a | ~~Emails~~ **Done 20 Oct**: no screen asks for, shows or accepts an email. Sign-in by email is refused; inquiries take a name, phone and question (migration 085); first sign-in and My details ask for the phone only. The manual, the tenant quick guide and the data dictionary say so | - |
| 1d | ~~The demo copy~~ **Done** (Sean, 20 Oct: "it's all done") | - |
| 1e | Optional, laptop only: the one-click demo buttons on the sign-in page of your local dev server need each account's login ID (`"identifier"` in credentials/demo-accounts.json). The real site is not affected | Sean, if ever |
| 2 | ~~The evaluation slides~~ **Done 20 Oct**: the deck now shows ten respondents, 4.59 and the eight composites of Table 4-17. Slide 1 still needs names, adviser and date | The team, slide 1 only |
| 3 | **Make the GitHub repository private** before the defense (P9). I was refused doing it. github.com/SeanJerve/hivelet > Settings > scroll to the bottom > Change visibility > Private. Checked 20 Oct: nothing on the site or in the paper needs it public, and Vercel deploys a private repository on your own account the same way. Kiel's old fork (Drexgithub/hivelet, from 27 July) stays public unless he deletes it | Sean |
| 4 | **Move loydtest out of unit PH after the defense** (B-106) | Sean |
| 5 | Later: may the owner edit a move-in date (P8); two identical receipts with no invoice number at the same instant (B-105) | A decision, after the defense |

## The defense, the day before

To be asked again before the defense or while studying. The steps are in `DEMO_SCRIPT.md`: the
backup, one sign-in as the owner and as loydtest, the installed app opened once on the demo phone,
one GCash test payment rejected, the offline fallback on the laptop, no test items in Repairs or
Inquiries, the owner asked about showing her screens, and slide 1 filled in.

## For the team

- The speakers' names in `DEFENSE_PRESENTATION_SCRIPT.md`: the team handles it and comes back if
  needed.
- To study: `STUDY_GUIDE_TEAM_REVIEWER.md`, `STUDY_GUIDE_DEFENSE_QA.md`, `STUDY_GUIDE_REFERENCES.md`.
