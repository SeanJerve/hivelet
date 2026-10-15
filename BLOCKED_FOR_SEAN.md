# Blocked for Sean

The work queue: what is waiting on a person, not on code. **Add to it rather than stopping**, one
short entry each, with enough detail to act on cold.

The full history (B-00 to B-105, 4,300 lines) was archived on 13 October 2026 to
`_ARCHIVE (not in repo)/2026-10-13 cleanup/BLOCKED_FOR_SEAN.md`, on Sean's machine only. Look there
for the detail behind any entry below.

## The paper

Everything still needed for the manuscript is in `FINAL/QUESTIONS_TO_FINALIZE.md`, Section 1
(P1 to P10): the owner's signature, the prompt-log export on Lloyd's laptop, the front matter, the
Acknowledgement, where the AI statement goes, the move-in date question, the repository going
private, and the scans for Appendices A and B.

## The system: entries whose heading did not say done

The archive was scanned by heading on 13 October 2026. These did not say done, resolved or applied;
**confirm each against its entry in the archive before acting**, since some were settled in the
text without the heading changing.

| Entry | What it is |
| :--- | :--- |
| B-105 | Two identical receipts with no invoice number, or two acknowledgement receipts, sent at the same instant are both saved. A decision for Sean (Chapter 4, Section 4.3.6 names the limit) |
| B-84 | Website safety audit of 29 September: the content security policy and the rate-limit call |
| B-37 | Eleven write routes have no automated exercise; the walkthrough was their test |
| B-40 | Unit 2f: three months with no receipt (the owner said they stay blank, 12 October) |
| B-11 | Sixteen ended tenancies do not record when they ended |
| B-15 | The on-site payment form can ask for water the ledger will never record |
| B-25 | `check:columns` asks for a file nothing can regenerate |
| B-01 | The public landing showed every unit as vacant when `/public/rooms` failed |
| B-03 | The Adyen webhook serves one address at a time (production since 24 September; see CLAUDE.md) |
| B-67 | Two unit descriptions still stated a retired water rule |
| B-82, B-101 | Credentials for `check:api` and `check:relations`: `credentials/creds.txt` must hold the current passwords |

## New (13 October 2026)

| Entry | What it is |
| :--- | :--- |
| B-108 | **Done 15 Oct: demo live** (health 200, database connected, lockdown enforced; set through the Vercel dashboard after the script could not take a paste in the app terminal). Optional: the demo secret key was pasted into a chat, so rotate it in the hivelet-demo Supabase project and update SUPABASE_SECRET_KEY on Vercel. Was: the demo copy for outside evaluators needed its two secrets (15 Oct). hivelet-demo.vercel.app runs on its own Supabase project (org hivelet-demo) with invented data; its pages load but its API fails until it has `SUPABASE_SECRET_KEY` and `JWT_SECRET`. Run `node scripts/demo/set-demo-secrets.mjs` and paste the **demo** project's secret key (Supabase > hivelet-demo project > Project Settings > API Keys > Secret keys); it sets both and redeploys. Then sign in once with `owner.demo@example.com` from `credentials/demo-evaluator-accounts.txt` to confirm. Everything else: `scripts/demo/README.md` |
| B-107 | **Done 13 Oct: 082 and 083 applied** (082 settled the bills; 083 named the administrator as verifier, which check:ledger BR-017 requires; ledger unchanged at 952 rows, PHP 8,214,100.00; backup 2026-10-13T09-16-20). Was: Tenants of **1d** and **F2B** see an overdue amount (₱7,450 and ₱10,400) for their August period, which they paid on 12 and 25 August. The bills were raised on demand on 26 September; the August receipts arrived on 30 September through migration 062, an insert, and only a receipt recorded on Monthly Income settles open bills. 082 does what that route would have done: one Verified cash payment per bill with the receipt's number and date, then Paid, plus an audit row; it refuses unless both bills still match their receipts (checked read-only on 13 Oct: they do). Steps: `npm run backup`, run `database/migrations/082_two_bills_her_august_receipts_already_paid.sql` in the Supabase SQL editor, then the two VERIFY queries in its header (expected: both Paid; 0 rows). To stop a repeat, `database/import-ledger-update.mjs` now lists every open bill its receipts pay and refuses `--apply` unless `--leave-bills-open` is passed (rule in `database/billsCoveredBy.mjs`, test beside it, mutation-tested) |
| B-106 | **The test tenant loydtest has been the tenant of PH since 1 October**, PH being the one vacant unit: the live site counts 33 of 33 occupied and shows no vacancy, though the property has 32 occupied; one open test bill of ₱30,400 sits on PH (its receipts are voided and its payments rejected). Useful for the defense demo (FINAL/DEMO_SCRIPT.md); afterwards move loydtest out through Tenants, so PH shows vacant again. A person decides; not changed by Claude |
