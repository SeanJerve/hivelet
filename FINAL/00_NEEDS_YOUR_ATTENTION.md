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
| 1b | ~~F2F's headcount~~ **Answered 21 Oct**: the record (4) is right. The earlier receipts were for 1 person; three roommates joined, and their water is charged from the next bill, which the system does by itself (4 x ₱200). check:relations records her answer and passes | - |
| 1c | ~~A test tenant for check:api~~ **Done 20 Oct**: it signs in as loydtest by login ID; 78 of 78 pass, the tenant isolation checks included | - |
| 1a | ~~Emails~~ **Done 20 Oct**: no screen asks for, shows or accepts an email. Sign-in by email is refused; inquiries take a name, phone and question (migration 085); first sign-in and My details ask for the phone only. The manual, the tenant quick guide and the data dictionary say so | - |
| 1d | ~~The demo copy~~ **Done** (Sean, 20 Oct: "it's all done") | - |
| 1e | Optional, laptop only: the one-click demo buttons on the sign-in page of your local dev server need each account's login ID (`"identifier"` in credentials/demo-accounts.json). The real site is not affected | Sean, if ever |
| 1f | ~~Is Linda's rent part of her income?~~ **Settled 21 Oct** (Sean: "just follow what's in the records because that's true always"). The screens show what is recorded, Linda included on its own line, and nothing is recomputed. Every figure on the owner's screens was checked against the database on 21 Oct and matches | - |
| 1g | **Consent forms** (scans in `_CONSENT_FORMS (not in repo)/`, see its README): the prospective tenant's signed form is missing (Chapter 3 says every tester consented in writing); "Research team member present" is blank on all five originals; F1 agreed to no photos or recording, so none of F1 anywhere | The team |
| 1h | ~~Migration 086~~ **Done 31 Oct** (B-114). **Ask the owner about F1's August receipt and 2c's water** (B-115) | Sean |
| 1i | **Paste migration 087 (the test tenant's dates) into the Supabase SQL editor** (B-116) | Sean |
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
