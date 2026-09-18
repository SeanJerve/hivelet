# Progress report — what is done, and what is left

**For John Lloyd M. Cuario.** Last updated **2026-09-18**.

**This is a task board, not a status document.** `CONTINUE_HERE.md` says where the project
stands; this says what still needs a person. Tick items as you finish them and commit the file —
a half-ticked board is evidence of progress, an untouched one is not.

**Legend:** ☐ not started · ◐ in progress · ☑ done · 🔒 blocked on someone else

---

## The short version

| | |
| :--- | :--- |
| **The system** | Built and verified. **All 18 suites pass**, and `verify:rbac` exits 0 after being dead since 13 Sep |
| **The manuscript** | Chapters 1–3 exist. **Chapter 4 is drafted but cannot be finished without test data** |
| **The blocker** | **No write path has ever been used by a person.** That one fact blocks Chapter 4, the evaluation, and the defense |
| **Your next single action** | Run `TESTING_REHEARSAL.md`. Forty minutes. Everything else queues behind it |

---

## 1. Testing — do this first

### ☐ 1.1 Functional walkthrough — **~40 minutes, blocks everything downstream**

Queued as **B-04**. **0 of 27 steps are ticked.**

- ☐ `npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"` — record the result **before** starting
- ☐ Work `TESTING_REHEARSAL.md` top to bottom. It runs on unit **PH**, the only vacant one, with a
  made-up tenant, so no real resident, receipt or expense is touched
- ☐ **Step 18** — type a **non-zero** garbage fee. Until 17 Sep that figure was collected, added to
  the total, printed on the receipt and recorded as ₱0.00. Nobody has ever entered one
- ☐ **Step 19** — record the same receipt twice. It must be **refused**
- ☐ **Step 23b** — stop the backend, reload the dashboard. Money tiles must show **em dashes**,
  never ₱0.00, and Net Operating Income must not equal Gross Inflow
- ☐ Run the **Undo** steps in reverse at the end
- ☐ `npm run check:all` again — anything green before and red after is what the walkthrough broke
- ☐ **Tick the boxes in the file and commit it.** This is the evidence for Chapter 4 Table 4.5

### ☐ 1.2 Device testing — ~30 minutes

- ☐ Same 4–5 screens on desktop, mid-range Android phone, and tablet
- ☐ Record **measured** load times from browser devtools — not estimates
- ☐ Note how the layout adapts on each (table scrolling, stacked cards, drawer navigation)
- ☐ **Install the PWA on the phone.** This proves Objective 2's PWA claim and feeds ISO portability
- ☐ Screenshot each — these double as Chapter 4's Figures 4.1–4.4
- ☐ Fills **Table 4.6**

### ☐ 1.3 ISO/IEC 25010 survey — the long pole

- ☐ Build the form from the indicator statements **already written** in Tables 4.9–4.16 of
  `CHAPTER_4_DRAFT.docx`. 5-point Likert
- ☐ Split it: tenants answer usability, reliability, performance, compatibility, portability.
  **Maintainability and security internals go to the technical evaluators** — a tenant cannot judge
  whether code is maintainable
- ☐ Administer to the owner, the residents, and the technical evaluators
- ☐ Compute weighted mean per indicator → composite per characteristic → map against Table 4.8
- ☐ **Record what you changed in response.** Objective 4 says "evaluate **and optimize**"; an
  evaluation with no changes answers half of it
- ☐ Fills **Tables 4.7 and 4.9–4.17**

> **Do 1.1 before 1.3.** Do not survey people on a system whose write paths have never been
> exercised — the walkthrough will surface things you would rather fix before anyone rates them.

---

## 2. Manuscript

### ☐ 2.1 Reconcile Chapter 3 with what was actually built — **cheapest task, biggest risk**

Chapter 4 reports what exists. Where Chapter 3 says something else, the two chapters contradict
each other in front of the panel.

- ☐ §3.1.1 says **MySQL** → it is **PostgreSQL on Supabase**
- ☐ §3.1.1 says **HTML5, Tailwind, JavaScript, Node.js** → it is **Vue 3 + TypeScript** and
  **Express + TypeScript**
- ☐ Definition of terms says the payment feature lets tenants *"simulate"* transactions → **Adyen
  with GCash is configured and operational.** This wording also breaks `check:canon`
- ☐ §3.2.5 says deployment to a **university-managed server** → confirm and state what is actually
  the case

### ☐ 2.2 Finish Chapter 4

- ☐ Fill Table 4.5 from task 1.1
- ☐ Fill Table 4.6 from task 1.2
- ☐ Fill Tables 4.7, 4.9–4.17 from task 1.3
- ☐ Insert Figures 4.1–4.4 (one screenshot each)
- ☐ Write §4.4.11 — what was optimized in response to the evaluation
- ☐ **Delete every REVIEW NOTE and DATA PENDING paragraph** before submission

### ☐ 2.3 The repository is carrying a stale manuscript

`docs/reference/…House.docx.pdf` is the **21 August** version. The current one is in your Downloads
folder, dated **17 September**. Anything in the repo citing "the capstone paper" is citing an old
draft.

- ☑ ~~Replace the file in `docs/reference/` with the current version~~ — done 2026-09-18. The
  repository now carries the 17 September manuscript, not the 21 August one

---

## 3. Still needs Mrs. Da Silva

| | Question | Why it matters |
| :--- | :--- | :--- |
| ☐ | Is **₱12.50/kWh** still right, and are meters read on the **25th**? | Out of scope for the system, but **printed on the public website** where strangers read it. Nothing in the system can ever verify it |
| ☐ | Does a **mid-month occupant change** adjust the current bill or the next one? | Small, affects water computation |
| ☐ | **`CLIENT_MEETING_QUESTIONS.md` §§ 1–2** — the seven receipts and five accounting habits | The long sitting, with her book open. **Untouched.** The seven receipts are the ones `check:ledger` reports on every run |

**Answered and closed this week**, for the record: the grace period, the deposit (OD-04), rent and
water paid separately, what is still on paper, electricity scope, occupant counts, single operator,
and Linda's arrangement. All recorded in `CLIENT_ANSWERS_2026-09-17.md`.

---

## 4. Waiting on Sean

Not yours to do — listed so you know what is moving.

| | | |
| :--- | :--- | :--- |
| 🔒 | **B-05** | Apply migration `027`. Two junk tickets sit on the owner's overview as open repair requests, **and one title is a slur** |
| 🔒 | **B-06** | Two code comments call the deposit *"not a refundable security deposit"*. It is one. Figure is correct; only the comments are wrong |
| 🔒 | **B-01** | Public landing shows every unit vacant when `/public/rooms` fails |
| 🔒 | **B-03** | One shared Adyen webhook — coordinate in the group chat before testing payments |

---

## 5. Documentation tidy-ups — small, safe, do them when stuck

- ☑ ~~Rename `docs/08_OPEN_DECISIONS.md` → `08_CLOSED_DECISIONS.md`~~ — **considered and declined
  2026-09-18**, reasoning in `HANDOFF_TO_DOCS.md` § 4.1. The filename is misleading, but 13 of its
  34 mentions pin a line number inside records of what it said on a date; renaming makes them cite
  a file that never existed. The banner in the file does the job without falsifying a citation
- ☑ ~~Fix stale suite counts~~ — done 2026-09-18 across seven files. **There are eighteen**, and the
  rehearsal is **27 steps**, not 26
- ☑ ~~Amend the **Module 02 answer sheet** for the Eljohn/Kiel role swap~~ — done 2026-09-18 as a
  dated amendment beneath the roles block. Section 6 per-requirement credits left as they stand:
  they record who did each item, which a later title change does not alter
- ☐ `CONTINUE_HERE.md` says "Last updated 2026-09-17" and predates the redesign and everything since
- ☑ ~~Two queue entries are both numbered **B-01**~~ — settled 2026-09-18. The open one keeps the
  bare number (it is cited in a code comment); the closed one is now dated in its heading

---

## 6. Open decisions still on the register

`docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` — **OD-01, OD-02, OD-07, OD-08,
OD-10** remain. **OD-04 closed 2026-09-18.**

---

## Done this week — worth remembering at the defense

- ☑ **OD-04 closed.** Three client answers read as contradictions for five days because a **label**
  was taken for a **definition**. The owner calls the held sum the "advance"; it functions as a
  deposit. The figure in the system was correct throughout
- ☑ **Grace period settled.** Late from the day after the due date; the week she allows is
  forbearance, not a billing window. BR-012 corrected by dated errata
- ☑ **Rent and water settled** — one combined bill, allocation recorded per component, because her
  own report layout is one row per unit per month
- ☑ **Chapter 4 drafted** in the manuscript's own formatting
- ☑ **Handoffs reconciled** — one per seat, not one per person
- ☑ **Screen contract held through the redesign.** Across Sean's rebuild it went **59 → 60 calls
  with 30 writes unchanged** — a read was added and no write was lost, which is exactly what that
  document exists to prove. Read the totals off its own footer; a figure quoted elsewhere goes
  stale the moment somebody adds a call

---

## How to know where you are

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

**Read that table, not the tail.** 13 of 17 pass today. The four that do not are environmental:
`check:tokens` needs `npx vite build` first, and `check:api`, `check:reports` and `check:billing`
need the backend running (`npm run dev:backend`).

> **And one trap worth carrying into testing week:** `check:api` silently skips its 8 tenant checks
> and the RBAC isolation check when `database/seeded-tenant-credentials.json` is missing — and
> still reports `0 failed`. **Read the total, not just the zero.**
