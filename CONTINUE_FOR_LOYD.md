# CONTINUE — for Loyd, readable by anyone

**Paused 2026-09-18.** Everything is committed and pushed. Working tree clean, `main` in sync.

**Last commit:** `4b1ec2f` — *the water field opened at zero while its own label said 600*

---

## State right now

| | |
| :--- | :--- |
| **All 19 suites** | pass |
| **`verify:rbac`** | 53 passed, 0 failed |
| **Read endpoints** | 35 / 35 |
| **Screens** | 8 admin, 4 resident, 4 public — no console errors, no failed requests |
| **Nothing was written** to the owner's records | correct — that is the rehearsal's job |

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

Read that table, not the tail.

---

## What I fixed today

1. **Water pre-filled ₱0** on *Record a payment*, beside a label saying *"₱200 × 3 occupants"*. A
   watch that didn't list the data it read. **Money-facing.**
2. **A resident with no bill was shown one** — fabricated rent and ₱0 water. *(Sean fixed the same
   thing independently; his version is in the tree and is better than mine.)*
3. **`check:billing` reported FAIL while passing all 39 assertions** — a crash on exit.
4. **`verify:rbac` had not signed in since 13 Sep** — hardcoded the rotated passwords. 21/3 → **53/0**.
5. **`check:api` was silently running 58 of 76** — missing a gitignored file. Now 76/76.
6. **"626 entrys"** and **"Every year" listed twice** on the income ledger.
7. **New: `check:relations`**, the 19th suite — separate records must agree with each other.

---

## Next, in order

### 1. Run the rehearsal — this blocks the most
`TESTING_REHEARSAL.md`, 26 steps, ~40 minutes. **0 ticked.** Every write path but one is still
unexercised by a person — on 2026-09-22 the tenant checkout raised a real bill against live data,
correct to the centavo (B-54 in `BLOCKED_FOR_SEAN.md`). That is one path out of many, so the
rehearsal still matters just as much.

Three steps matter most: **18** (type a non-zero garbage fee), **19** (same receipt twice must be
refused), **23b** (stop the backend, reload — money tiles must show em dashes, never ₱0.00).

**And new: step 24b.** Run `npm run check:relations` right after the vacate step. The pinned count
must still read **16, not 17**. That one step decides whether **B-11** is a data gap or a code
defect.

Tick the boxes in the file and commit it. It is the evidence for Chapter 4's Table 4.5.

### 2. Device testing — ~30 min
Desktop, mid-range Android, tablet. Measured load times, not estimates. **Install the PWA on the
phone.** Screenshots double as Chapter 4's Figures 4.1–4.4.

### 3. The ISO survey
Paste-ready in `docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md` — bilingual for residents,
with a nine-step build walkthrough. **Do the rehearsal first**; a survey shouldn't be a bug hunt.

---

## Needs a person, not me

| | |
| :--- | :--- |
| **B-05** | Apply migration `027`. Two junk tickets are on the owner's dispatch board **right now**, one titled with a slur |
| **B-10** | The repository is **public** — confirmed. Decide on visibility; history holds 33 residents' details and no file edit reaches that |
| **B-11** | 16 ended tenancies record no end date. Needs a backfill migration. **OD-04's deposit settlement depends on move-out dates** |
| **Mrs. Da Silva** | `CLIENT_MEETING_QUESTIONS.md` §§ 1–2 — the seven receipts and five accounting habits. Untouched |

---

## For the paper

- **`docs/CHAPTER_3_RECONCILIATION.md`** — every correction written out, paste-ready. Chapter 3
  still says MySQL and HTML5; Chapter 4 says what was built. **Five are matters of fact; the sixth
  (deployment) is your decision.**
- **`docs/chapter 4 tenative/CHAPTER_4_DRAFT.docx`** — drafted in the manuscript's own formatting.
  §4.1–4.2 are real content; everything from §4.3.2 waits on the rehearsal and the survey.
- **Nothing in §4.4 was invented.** Do not fill a mean in from expectation.

---

## Two files that must travel to any other machine

Both are gitignored, and **both fail silently** when missing:

| | What happens without it |
| :--- | :--- |
| `credentials/creds.txt` | checks that sign in fail |
| `credentials/demo-accounts.json` | the demo sign-in panel **simply does not render** |
| `database/seeded-tenant-credentials.json` | `check:api` reports **58 passed, 0 failed** instead of 76 |

**Check totals, not zeros.**

---

## Where the detail is

| | |
| :--- | :--- |
| `PROGRESS_REPORT.md` | the full task board |
| `docs/AUDIT_2026-09-18_FUNCTIONAL.md` | five passes of audit, including what I got wrong and withdrew |
| `BLOCKED_FOR_SEAN.md` | the queue — read before starting |
| `CONTINUE_HERE.md` § 0.0 | what 18 Sep produced |
