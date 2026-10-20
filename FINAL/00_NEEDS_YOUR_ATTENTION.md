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
| 1b | **F2F's headcount**: its tenancy records 4 people, but her receipt for the period from 31 August charged water for 1. Which is right? (check:relations now flags it) | The owner |
| 1c | **A test tenant for check:api**: its tenant checks name a tenant by email, which no longer signs in. Put loydtest's login ID and password in database/seeded-tenant-credentials.json (B-82) | Sean |
| 1a | ~~Emails~~ **Done 20 Oct**: no screen asks for, shows or accepts an email. Sign-in by email is refused; inquiries take a name, phone and question (migration 085); first sign-in and My details ask for the phone only. The manual, the tenant quick guide and the data dictionary say so | - |
| 1d | **The demo copy** (hivelet-demo.vercel.app) still runs the old code, so nothing there is broken today. Before it is ever redeployed: (1) run 085 in the demo project's SQL editor, `ALTER TABLE public.inquiries ALTER COLUMN prospect_email DROP NOT NULL;` (I was refused writing to it; read-only, 20 Oct: it is still NOT NULL there), or a visitor's inquiry is refused; (2) its 4 owner accounts already have phone numbers and its 33 tenants login IDs, so the evaluators just need their phone number instead of their email. Skip both if the evaluations are over | Sean |
| 1e | **The demo-account buttons on your laptop's sign-in page** (dev server only) now need each account's login ID: add an `"identifier"` to every entry in credentials/demo-accounts.json. I was not allowed to fill it from the database myself | Sean |
| 2 | ~~The evaluation slides~~ **Done 20 Oct**: the deck now shows ten respondents, 4.59 and the eight composites of Table 4-17. Slide 1 still needs names, adviser and date | The team, slide 1 only |
| 3 | **Make the GitHub repository private** before the defense (P9) | Sean |
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
