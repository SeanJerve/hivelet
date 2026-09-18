# Chapter 4 — working copy

**Revised 2026-09-18 to match the manuscript.** This file is the **working copy**; the
submittable document is **[`CHAPTER_4_DRAFT.docx`](CHAPTER_4_DRAFT.docx)**, which carries the
manuscript's own formatting — Arial 12, justified, 0.5″ first-line indent, double spacing, US
Letter with a 1.5″ left margin. **Draft here, then carry the wording across.** Do not reformat the
`.docx` by hand; it inherits its styles from the manuscript itself.

> [!IMPORTANT]
> **Three things changed in this revision, and they matter more than the wording.**
>
> 1. **The chapter is retitled `4 RESULTS AND DISCUSSION`** and renumbered `4.1`–`4.5`, because
>    that is what the manuscript's own Chapter 4 template says. The previous title, *Presentation,
>    Analysis, and Interpretation of Data*, appears nowhere in the manuscript.
> 2. **Two factual errors were removed.** The old draft had the billing module computing
>    *"electrical charges"* and the system managing *"bed inventory"*. **Electricity is not in the
>    system at all** — every unit is separately metered and the tenant pays it directly, confirmed
>    by the owner on 2026-09-18 — and the model is **room-centric across 33 units**, not bed-based.
> 3. **Nothing in §4.3.2 onward may be filled in from expectation.** The walkthrough has not been
>    run and the evaluation survey has not been administered. Placeholders stay placeholders until
>    somebody collects the data.

---

## Objective coverage — check this before submitting

The chapter is answerable only if all four objectives from §1.2 are addressed. Current state:

| Objective (§1.2) | Section | State |
| :--- | :--- | :--- |
| 1. Analyze existing practices; establish requirements | 4.1 | **Drafted** — content is real and verified |
| 2. Develop the system (7 named features) | 4.2 | **Drafted** — every named feature has its own subsection |
| 3. Pilot test for functionality, responsiveness, performance | 4.3 | **Partial** — automated results are real; the human walkthrough is pending |
| 4. Evaluate **and optimize** against ISO/IEC 25010 (8 characteristics) | 4.4 | **Structured only** — no respondent data exists yet |

**Objective 2 names seven features.** Each has a subsection so none can be missed: tenant and room
management (4.2.2), booking and reservation (4.2.3), financial tracking with optional online
payment recording (4.2.4), maintenance ticketing and notification (4.2.5), role-based access
control (4.2.6), and PWA support (4.2.7), over the architecture in 4.2.1.

**Objective 4 says "evaluate and optimize".** §4.4.11 carries a note about this: an evaluation
reported without the changes made in response to it answers only half the objective.

---

## Chapter 3 contradicts the system as built — resolve before submission

Chapter 4 reports what was built. Where that differs from what Chapter 3 said would be built, the
panel sees two chapters disagreeing. Four such points:

| Chapter 3 says | What was actually built | Where |
| :--- | :--- | :--- |
| MySQL | **PostgreSQL, hosted on Supabase** | §3.1.1 |
| HTML5, Tailwind CSS, JavaScript, Node.js | **Vue 3 + TypeScript** client, **Express + TypeScript** API | §3.1.1 |
| Online payment that lets tenants *"input or simulate digital payment transactions"* | **Adyen with GCash, configured and operational.** It is not a simulation | §3 definition of terms |
| Deployment to a university-managed server | Confirm the actual arrangement and state it | §3.2.5 |

**The third one also breaks a build check.** `npm run check:canon` fails on any tracked document
that calls the gateway `"mock"`, `"simulator"`, or `"pending consultation"`. The manuscript is not
in the repository so the check does not see it — but the same wording rule applies to what the
group submits.

`CHAPTER_4_DRAFT.docx` carries these as bracketed **REVIEW NOTE** paragraphs, set in italic with a
grey rule down the left margin so they are obvious. **Delete them before submission.**

---

# 4 RESULTS AND DISCUSSION

This chapter presents the results and analysis of the findings made in the conduct of the study,
organized to correspond to the four specific objectives in Chapter 1 and to the Agile SDLC and
ISO/IEC 25010 evaluation procedure in Chapter 3.

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

*Answers Objective 1.*

### 4.1.1 Baseline Operational Workflows and Documented Deficiencies

**Verified property facts — these are the figures to use, and they have been wrong in documents
before.** 33 rentable units in five clusters: **BH 22, Back Apartment 5, Front Apartment 3,
Penthouse 1, Linda 2**, over three residential floors plus a rooftop penthouse level, distributed
**11 / 11 / 10 / 1**. **32 of 33 occupied.** Never write "32 units" — that figure is wrong and
`check:canon` fails the build on it.

**Table 4.1** — baseline practice against documented deficiency, one row per operational area named
in Objective 1: tenant management, financial tracking, communication, booking and reservation.

The finding to draw out: the deficiencies were not located in any one area but in **the absence of
an integrated record**. Each area kept its own informal source of truth with no way to reconcile
one against another. That ties back to the fragmentation literature in Chapter 2.

### 4.1.2 System Requirements Derived from the Operational Analysis

**Table 4.2** — identified gap → system requirement → implementing module. Seven rows, and they map
onto the seven features named in Objective 2, which is what makes 4.1 and 4.2 hang together.

**Scale evidence, verified against the live records:** 937 income records, 1,262 expense entries,
1,327 property-area allocations. Cite these rather than adjectives — they are what makes the
requirements evidenced rather than asserted.

---

## 4.2 Development of the Hivelet System

*Answers Objective 2. Every feature the objective names gets its own subsection.*

### 4.2.1 System Architecture and Technology Stack

**Table 4.3** — layer / technology / function, five rows: presentation (Vue 3 + TypeScript, Vite),
application (Express + TypeScript), data (PostgreSQL on Supabase), payment gateway (Adyen with
GCash), client delivery (PWA via service worker and manifest).

**27 numbered migrations** applied at the time of writing. Worth stating: every change to schema or
stored records is expressed as a migration, which is what makes the data's history reviewable.

### 4.2.2 Tenant and Room Management Module
Units carry cluster, floor, current rate, operational status. Tenancies carry occupancy count,
move-in date, emergency contacts. **Rate changes are preserved by a database trigger**, so a rate
cannot be changed through any path without being recorded. *Figure 4.1 — Room and Rate Directory.*

### 4.2.3 Booking and Reservation Management Module
Public catalogue → enquiry against a specific unit → administrator inbox → conversion to tenancy,
with the tenancy linked back to the enquiry it came from. A **reserved** unit stays visible but
accepts no new enquiries. *Figure 4.2 — Public Unit Catalogue and Enquiry Form.*

### 4.2.4 Financial Tracking and Payment Recording Module
A bill carries **rent and water as separate amounts**; water is occupants × the configured
per-occupant rate, currently **₱200**. **Linda's two units are charged at a fixed rate and are
excluded from the property's grand totals.** On-site collections are entered by the administrator
with rent, water and garbage components recorded separately; online payments through Adyen enter a
**pending state for verification** before settlement. Reports are produced in the owner's own
layout. *Figure 4.3 — Income and Collections Ledger.*

> **Do not write that the system bills electricity.** It does not. Every unit is separately metered
> and paid directly by the tenant, and electricity appears in neither the income nor the expense
> records.

### 4.2.5 Maintenance Ticketing and Notification Module
Submission with title, description, priority; status carried through to closure; **the
administrator alone closes a ticket**. Notifications dispatch on payment verified, payment
declined, and to the administrator on payment, enquiry and ticket comment. *Figure 4.4 —
Maintenance Dispatch Board.*

### 4.2.6 Role-Based Access Control
Administrator reaches ledgers, tenant directory, maintenance board, audit trail. Resident reaches
only their own unit, bills, payments, tickets and profile. Enforced at the application layer on
every protected route, with row-level security in the database beneath it. Administrative actions
are written to an **immutable audit trail** recording actor, action and time.

### 4.2.7 Progressive Web Application Implementation
Service worker and web application manifest, so the client installs on a mobile device and opens
without browser chrome. Responsive across viewports: dense tables on desktop, stacked layouts and
horizontal scrolling on small screens.

---

## 4.3 Pilot Testing of the Developed System

*Answers Objective 3 — functionality, responsiveness, operational performance.*

### 4.3.1 Automated Verification Results — **real data, use it**

Seventeen suites. **Table 4.4** carries the principal ones. Figures verified 2026-09-18:

| Suite | Scope | Assertions |
| :--- | :--- | :--- |
| Endpoint and authorization contract | every endpoint the client calls, role separation, input validation | **76 checks** |
| Ledger integrity | every remitted amount re-derived against its formula | **937 records** |
| Report reconciliation | exported workbooks against the database, month by month | **490 assertions** |
| Payment signature verification | cryptographic signature on gateway notifications | **29 checks** |
| Billing arithmetic | water, period, receipt allocation | full module |
| Interface reachability | every rendered component is imported by the file rendering it | full client |
| Data-state presentation | no screen presents cached, seeded or empty state as live | full client |

**The suites perform no writes**, which is what makes them safe against the operational database —
worth stating, because a panel will ask.

**Also report the seven pinned receipts**: two impossible dates, three rent periods ending the day
before they begin, two receipt numbers each used against two transactions. They come from the
transcribed historical records and are **reported on every run rather than corrected**, because
establishing what each should read requires the owner's receipt book. This is a strength, not an
embarrassment — it shows the verification detects anomalies it was not written to expect.

### 4.3.2 Functional Walkthrough Testing — **PENDING**

27 steps, every write path once, run against the single unoccupied unit so no real tenancy,
receipt or expense is touched.

> **Not yet performed. Table 4.5 stays empty until it is.** When it is run, report steps executed,
> steps passing without divergence, and each divergence with its resolution.

### 4.3.3 Cross-Device Responsiveness and Operational Performance — **PENDING**

> **Measure, do not estimate.** Table 4.6 wants real load and response times from an actual desktop
> workstation and an actual mid-range mobile device, per the hardware in Chapter 3.

---

## 4.4 Evaluation of the System Based on ISO/IEC 25010

*Answers Objective 4. **No respondent data exists yet.** Every table below is structured and empty.*

- **4.4.1** Respondent profile — Table 4.7
- **4.4.2** Scale of interpretation — Table 4.8 *(real; taken from Chapter 3's Likert table)*
- **4.4.3**–**4.4.10** the eight characteristics, one table each (Tables 4.9–4.16):
  functional suitability · performance efficiency · compatibility · usability · reliability ·
  security · maintainability · portability

**The tables carry the items exactly as the survey asks them**, with a **Rated by** column, a
**group mean** row per respondent group, and a composite across all groups. That structure exists
because the three groups answer differently-worded items for the same characteristic — each is
asked about what it is placed to judge — and a single-statement table could not report that
honestly. Two consequences worth knowing:

- **Residents do not rate Security**, and **only the technical evaluators rate Maintainability.**
  Both tables say so in their own text, so the absence reads as a decision rather than an omission.
- **Decide and state** whether the composite is the mean of all responses or the mean of the group
  means. Group sizes differ enormously — one owner against N residents — so the two are not the
  same number. Either is defensible; **saying which you did is not optional.**
- **4.4.11** Summary — Table 4.17, composite mean per characteristic plus overall

**The indicator statements are already drafted in the `.docx`** and are written against what the
system actually does, so they can be lifted straight into the survey instrument. That is the next
practical step: turn Tables 4.9–4.16 into the questionnaire, administer it, then fill the means in.

> **Objective 4 says "evaluate **and optimize**."** §4.4.11 must record what was changed in response
> to the findings. An evaluation with no optimization answers half the objective.

---

## 4.5 Deployment Plan and Strategies

Three stages: environment preparation and record transfer → supervised period running alongside the
existing manual records → full transition once the two are confirmed to agree.

Risks to state plainly, because they are real and the honesty reads well:

- **The records are the owner's actual financial records and no separate copy exists.** A backup is
  taken before any change, and every change is a numbered migration that can be reviewed and
  replayed.
- **Gateway credentials live outside the repository**, are transferred separately, and appear in no
  document.
- **The seven historical receipt anomalies** are reported on every verification run and are to be
  corrected only against the owner's receipt book.

> **Confirm the deployment environment before writing this section as fact** — Chapter 3 says a
> university-managed server. State what is actually the case.

---

## What to do next, in order

1. **Reconcile Chapter 3** with the four points listed near the top of this file. Cheapest task,
   biggest risk if skipped.
2. **Run the 27-step walkthrough** and fill Table 4.5. It is queued as **B-04** and has never been
   run; no write path in this system has ever been exercised by a person.
3. **Build the survey instrument** from the indicator statements in Tables 4.9–4.16, administer it,
   and fill in §4.4.
4. **Take the four screenshots** for Figures 4.1–4.4.
5. **Record what was optimized** in response to the evaluation, for §4.4.11.
6. **Delete every REVIEW NOTE and DATA PENDING paragraph** from the `.docx` before submission.
