# PANEL RECOMMENDATION REGISTER — Capstone 1 → Capstone 2

**Hivelet — Fe Galang Da Silva Boarding House**
Bicol University College of Science | Capstone Project 2 | Group 4

> **Purpose.** The Capstone 2 defense asks the team to recap each panel recommendation and then
> show how the finalized architecture, schema and diagrams resolve it. This file is the single
> authoritative record of **what the panel actually recommended**, what was done about it, and where
> the evidence lives.
>
> **Read the "Withdrawn claims" section before rehearsing.** The previously drafted presentation
> script attributes recommendations to the panel that the panel did not make. Saying those aloud, to
> the same panel, is the largest avoidable risk in this defense.

---

## 1. The recommendation

**There is exactly one**, confirmed by the team on 2026-09-13 and recorded at
`docs/module_01_submission/01_ACTIVITIES_AND_FINAL_ASSESSMENT.md:47-48`:

> **R-01.** *"The panel recommended exploring an online payment integration (specifically evaluating
> Adyen for GCash payments). Because commercial transaction fees and legal merchant registration
> terms are currently pending final consultation with our adviser and property stakeholder
> (Mrs. Fe Galang Da Silva), our team was instructed to ensure the system architecture and database
> do not become rigidly dependent on an unconfirmed external service."*

It is worth noticing that this is really **two instructions in one sentence**, and the second is the
harder and more interesting one:

| | The instruction | What it demands |
| :-- | :--- | :--- |
| **R-01a** | *Explore an online payment integration, specifically evaluating Adyen for GCash.* | Do the evaluation. Show a real result, not an intention. |
| **R-01b** | *Ensure the architecture and database do not become rigidly dependent on an unconfirmed external service.* | The system must remain fully operational **whether or not** Adyen is available, configured, or ever commercially approved — and that must be demonstrable, not asserted. |

**R-01b is the architectural one, and it is the spine of Sections 3, 4 and 6.**

---

## 2. R-01a — the evaluation was done, and the answer is concrete

**Status: resolved, with a working integration.**

| Evidence | Where |
| :--- | :--- |
| An Adyen **developer sandbox account** was obtained and configured | `.env` (`ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_ENVIRONMENT`) |
| The adapter calls the **official Adyen v71 Checkout Sessions API** | `backend/src/services/adyenService.ts:63` — `POST https://checkout-test.adyen.com/v71/sessions` |
| Credentials are validated at runtime, not assumed | `adyenService.ts:44-52` — `isLiveConfigured()` requires both an API key and a merchant account and **rejects placeholder values** |
| GCash is the payment method exercised | `payment_method_type` enum includes `'Adyen Online'` and `'GCash'` |

**The honest commercial finding, which is the actual answer to "evaluate":** a sandbox account is
sufficient to build and demonstrate the flow end to end, but **live commercial processing
additionally requires SEC/DTI business underwriting** of the property as a merchant. That is a legal
and financial undertaking by the property owner, not a software task, and it is outside the scope of
an academic capstone.

This is a *stronger* answer than "we integrated it". The panel asked the team to evaluate; the team
evaluated, built it, and can state precisely where the boundary between "we can build this" and
"the owner must register a business" falls.

> **Language note (binding).** The framing *"Pending Consultation"* is **withdrawn** — see errata
> E-17. The evaluation is complete. Do not describe the integration as pending anything.

---

## 3. R-01b — the system does not depend on Adyen, and this is demonstrable

**Status: resolved. This is the claim to lead with in Section 3.**

The pattern is *Layered Client–Server Architecture Structured as a Modular Monolith with a **Pluggable
Payment Gateway Adapter***. The last clause exists **because of R-01b**, and it is the single most
defensible sentence in this project: the panel named a risk, and a named tier of the architecture
exists to absorb exactly that risk.

### How the independence is achieved, mechanically

| Mechanism | Evidence | What it proves |
| :--- | :--- | :--- |
| **A runtime branch, not a build-time dependency.** `isLiveConfigured()` is evaluated per request. If credentials are absent or are placeholders, the system takes a local path instead. | `adyenService.ts:44-52`, `:61` | Adyen can be removed, misconfigured or unreachable and the application still starts, still bills, and still collects payment. |
| **The gateway is confined to one file.** All Adyen knowledge lives in `adyenService.ts`. No route, no other service and no database object references Adyen. | `backend/src/services/` | Swapping to PayMongo, Xendit or direct GCash is one file, not a migration. |
| **The schema is gateway-agnostic.** `payments` stores `payment_method`, `payment_source`, `transaction_reference` and `verification_status` — generic attributes that describe *any* settlement, not Adyen's data model. | `payments` table | **No schema change is required to change gateway.** This is the database half of R-01b, and it is what Section 4 should show. |
| **On-site cash remains primary.** The `payment_method_type` enum leads with `'Cash'`, which is the default, and the business's main settlement route is a person paying in person. | `payment_method_type` | The online channel is an *addition*, never a dependency. The boarding house ran on cash before and still does. |
| **The administrator holds a sovereign gate.** A completed gateway payment is written as `'Pending Verification'` and **can never auto-settle a bill**. Only a human with `payment:verify` moves a bill to `Paid`. | BR-017; `public.ts` completion route | Even a compromised or misbehaving gateway cannot mark a debt as paid. The external service is never trusted with the financial outcome. |

### The one-sentence answer, if a panelist asks it directly

> *"We built it against a real Adyen sandbox and it works — and we can turn Adyen off entirely and
> the system still bills, still collects, and still reconciles, because the gateway is one adapter
> behind a generic payments schema and a human verification gate."*

---

## 4. What changed in the database in response to R-01b

**This is Section 4's required content: entities, attributes and relationships that changed because
of a recommendation.** Four changes trace directly to R-01.

| # | Change | Entity / attribute | Why R-01 required it |
| :-- | :--- | :--- | :--- |
| **D-1** | Gateway-agnostic settlement attributes | `payments.payment_method`, `.payment_source`, `.transaction_reference`, `.verification_status` | These describe a settlement in the abstract. Storing an Adyen-shaped payload instead would have made the schema itself depend on the unconfirmed service — the exact rigidity the panel warned about. |
| **D-2** | A verification state machine, not a boolean | `verification_status_type` = `Verified` / `Pending Verification` / `Rejected`, plus `verified_by` → `profiles` and `verified_at` | R-01b means the gateway's word is not final. A three-state column with a named human verifier is what makes the administrator's gate expressible in data. |
| **D-3** | A payment can outlive its bill | `payments.bill_id` is **nullable**, `ON DELETE SET NULL` | The payment is the financial fact; the bill is only the demand for it. A gateway callback can arrive for a bill that no longer exists, and losing the record of money received would be worse than losing the demand. |
| **D-4** | Financial history cannot be deleted | Six ledger foreign keys converted to `ON DELETE RESTRICT` (migration `005`) | If an external service may write into the ledger, the ledger must be undeletable by accident. Before this, the schema had **0** `RESTRICT` constraints — 17 `CASCADE` and 4 `SET NULL` — so deleting one room could have cascaded away its entire financial history. |

> **Say D-4 plainly.** "We found that deleting a room would have destroyed its billing history, and we
> fixed it" is a better sentence than any claim of foresight, and it is true. See errata E-07: the
> submitted document claimed `RESTRICT` already existed when it did not.

---

## 5. Changes NOT driven by the panel — and why that is a strength

Most of the Phase 2 database work was **not** a response to R-01. It came from auditing the live
system and the owner's own records. Present it that way: the team was asked one thing, did it, and
then went looking for what else was wrong.

| Change | Origin | Headline |
| :--- | :--- | :--- |
| `property_areas` + `is_rental_expense` | Owner interview (OD-05) | **58.9% of the expense ledger was personal, not operating cost.** Net Operating Income was understated by **₱3.43M** across recorded history because personal spending was being subtracted from rental income. |
| `Penthouse` as a sixth expense area; cluster → area routing | Client interview (OD-15) | Three of 33 units had no expense bucket at all. |
| `PH` moved to rooftop level 4; `F1` corrected to floor 3 | Owner survey (OD-14) | The published floor tally now matches the building: **11 / 11 / 10 / 1**. |
| `profiles.email` made nullable; phone as alternate login | Owner interview (OD-09) | A tenant is a record; a portal login is optional. |
| Grace period abolished | Owner (OD-16) | The seeded 7-day grace was never a rule of this business. |
| Atomic allocation replacement | Defect audit | Editing an expense split could destroy the allocations it was replacing. |

**If asked "did the panel ask for all this?" — no, and say so.** The honest answer is: *"The panel
asked us one thing. Answering it properly meant auditing the system, and the audit found more."*

---

## 6. Withdrawn claims — do NOT say these

The previously drafted presentation script (`docs/module_01_submission/07_GROUP_PRESENTATION_SCRIPT_AND_SLIDES.md`)
contains statements that are **not true** and, in two cases, attribute things to the panel that the
panel did not say. Presenting them to the same panel is the largest avoidable risk here.

| # | The script says | Line | Why it must not be said |
| :-- | :--- | :-- | :--- |
| **W-1** | *"the panel noted that our data model lacked auditability, failed to preserve rental rate histories, and lacked formalization for the ₱200-per-head water calculation"* | `:72` | **The panel did not say this.** Confirmed by the team 2026-09-13: R-01 is the only recommendation. Attributing an invented critique to the panel invites the obvious question. |
| **W-2** | *"the property's 2% annual increase rule"* | `:72`, `:102` | **No such rule exists.** It appears in no business rule and in neither Bible document. The owner sets rates manually. Errata E-18, E-20. |
| **W-3** | *"50/50 co-ownership revenue share"* / *"derives the 50% co-ownership revenue share"* | `:58`, `:123` | **Banned by locked canon.** `fifty_percent_share` is described only as a system-computed figure equal to half the row's Rent Amount, retained for ledger parity with the historical spreadsheet. No party, recipient or purpose is modelled or implied. |
| **W-4** | *"a 32-unit residential facility"* | `:58` | **33 units.** Errata E-01, E-02. |
| **W-5** | *"Decoupled / Pluggable Modular Payment Architecture **Pending Consultation**"* | `:143`, `:147` | The evaluation is **complete**. Errata E-17. |
| **W-6** | *"an atomic database transaction updates the bill to 'Paid'"* | `:123` | At the time of writing, **no transaction existed anywhere in the backend**. Errata E-08. This is being built in Phase 3 — check its status before claiming it, and if it is done, say "we built it", not "it always did this". |

---

## 7. Section-by-section mapping

| § | Section | Primary source | Lead with |
| :-- | :--- | :--- | :--- |
| 1 | Introduction & problem | Capstone 1 research | 33 units, one property, paper notebooks and Messenger screenshots |
| 2 | **Panel recommendations** | **This file, §1** | **One recommendation, stated in two halves (R-01a, R-01b)** |
| 3 | **Finalized architecture** | This file §3; `PHASE1_ARCHITECTURE_AND_PATTERN.md` | The **Pluggable Payment Gateway Adapter** tier exists because of R-01b |
| 4 | **Finalized schema** | This file §4; `PHASE2_ERD_AND_DATA_DICTIONARY.md` | The four changes D-1…D-4, then §5 as "what else the audit found" |
| 5 | Process & data flow | `PHASE1_DFD_TRACEABILITY.md` | 7 processes / 12 data stores; walk **Process 3.0 Billing & Payments** |
| 6 | **Design justification** | This file §3; `PHASE2_SECURITY_AND_RLS.md` | Four-part justification of the **adapter** — it is the change that answers the panel |

---

*Phase 3 artifact. Companion: `PHASE3_DEFENSE_PACK.md`. Binding canon:
`PHASE1_LOCKED_DECISIONS.md`, `PHASE2_LOCKED_DECISIONS.md`,
`outputs/PHASE1_MODULE01_ERRATA.md`.*
