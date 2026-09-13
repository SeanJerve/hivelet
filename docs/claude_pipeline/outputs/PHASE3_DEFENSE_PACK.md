# CAPSTONE 2 DEFENSE PACK — Hivelet

**Fe Galang Da Silva Boarding House Management and Financial Operations System**
Bicol University College of Science | Capstone Project 2 | Group 4

> **What this is.** Speaking notes for the six-section defense, written to be said aloud. Every
> factual claim in it has been verified against the live system or the owner's own records. Nothing
> here is aspirational.
>
> **Before you rehearse, read `PHASE3_PANEL_RECOMMENDATION_REGISTER.md` §6 — "Withdrawn claims".**
> The previously drafted script has you telling the panel they recommended things they did not.
> That is the one mistake in this pack that cannot be recovered from in the room.
>
> **Timings are the brief's recommendations, not limits.** Sections 3 and 4 are the graded core;
> the pack gives them the most material and lets 1, 2 and 5 run lean to buy them room.

---

## Slide assets

| Section | Diagram | File |
| :-- | :--- | :--- |
| 3 | **Architecture, defense view** — five tiers, adapter and gate highlighted | `docs/diagrams/rendered/hivelet_architecture_defense.png` |
| 3 | Architecture, full — every component, implemented vs planned | `…/hivelet_architecture.png` |
| 4 | **ERD, defense view** — 7 entities, changes marked D-1…D-4 | `…/hivelet_erd_defense.png` |
| 4 | ERD, full — all 21 tables | `…/hivelet_erd.png` |
| 5 | Level 0 context / Level 1 DFD | `…/hivelet_dfd_context.png`, `…/hivelet_dfd_level1.png` |
| 5 | Payment sequence | `…/hivelet_sequence_payment.png` |

Use the **defense view** on the slide and keep the full version as the next slide or a printout. If a
panelist wants the whole picture, you turn to it rather than squinting at it.

---

## §1 — Introduction and problem recap  ·  ~1 min

> "Good morning. Our system is **Hivelet**, a web-based boarding house management and financial
> operations system, built for the **Fe Galang Da Silva Boarding House** in Legazpi City.
>
> The property is **33 rentable units across five clusters** — 22 in the main apartment building,
> 5 in the back apartment, 3 in the front apartment, 2 Linda units, and 1 penthouse — spread over
> three residential floors and a rooftop level, **11, 11, 10 and 1**.
>
> Today it runs on paper. Rent and utility collections are handwritten into notebooks, payment
> confirmations sit in Messenger chats, and expenses are tracked on loose receipts. That produces
> three problems: records get lost and arithmetic goes wrong; there is no reliable proof of who paid
> what and when; and maintenance requests are untracked, so repairs are late.
>
> Our end users are **the landlady and her administrator**, who run the property day to day, and
> **the tenants**, who need to see what they owe and prove what they have paid."

**Numbers you must not get wrong:** 33 units, 5 clusters, 11/11/10/1. Not 32. Not "Main Building,
Annex A, Annex B" — those are not cluster names, and "Annex" is the family's word for a *floor*.

---

## §2 — Panel recommendations recap  ·  ~1–2 min

**You received one recommendation. Say that plainly — it is a strength, not a gap.**

> "At our Capstone 1 proposal defense the panel gave us **one recommendation**, and it had two parts.
>
> First, they asked us to **explore an online payment integration**, specifically to evaluate
> **Adyen for GCash payments**.
>
> Second — and this is the part that shaped our architecture — because the commercial fees and the
> merchant registration terms were unsettled, they instructed us to make sure **the system
> architecture and database do not become rigidly dependent on an unconfirmed external service**.
>
> So the panel did not just ask us to add a feature. They asked us to add it **without letting it
> become load-bearing**. Everything in the next two sections is our answer to that."

**If asked whether that was the only one:** yes, and do not invent others. "That was the
recommendation we were given, and we treated the second half of it as an architectural requirement."

---

## §3 — Finalized architecture  ·  ~2 min  ·  **GRADED CORE**

**Slide:** `hivelet_architecture_defense.png`

> "Our pattern is a **Layered Client–Server Architecture Structured as a Modular Monolith with a
> Pluggable Payment Gateway Adapter**. Five tiers.
>
> Tier 1 is the Vue 3 single-page application. It holds **no database credential** — it can only
> reach data by asking our API.
>
> Tier 2 is the API and security perimeter: Helmet headers, a CORS allow-list, JWT authentication,
> and authorization through **39 named permissions across four roles** rather than a simple
> admin-versus-tenant check.
>
> Tier 3 is the domain service layer — the modular monolith itself.
>
> Tier 4 is Supabase PostgreSQL: **21 tables, with row-level security forced on all 21 and zero
> policies**, which is deny-by-default. Only our backend's `service_role` can read anything.
>
> **Tier 5 is the part that answers the panel.** It is a pluggable payment gateway adapter, and it
> exists precisely because the panel told us not to become rigidly dependent on Adyen."

**Then deliver the mechanism — this is the heart of the section:**

> "There are three things that make that independence real rather than claimed.
>
> **One — it is a runtime branch, not a build-time dependency.** A single function,
> `isLiveConfigured()`, checks at request time whether real Adyen credentials are present, and
> rejects placeholder values. If they are configured, we call Adyen's real v71 Checkout Sessions
> API. If they are not, the system takes a local settlement path instead. **You can delete our Adyen
> credentials and the system still bills, still collects, and still reconciles.**
>
> **Two — Adyen is confined to one file.** `adyenService.ts` is the only file in the entire codebase
> that knows Adyen exists. No route, no other service, and no database table references it. Swapping
> to PayMongo or Xendit is one file, not a migration.
>
> **Three — and this is the most important — the gateway can never settle a debt.** A completed
> online payment is written as **'Pending Verification'**. Only a human administrator holding the
> `payment:verify` permission can move a bill to Paid. That is business rule BR-017. So even if the
> gateway misbehaved, or were compromised, the worst it could do is create a row for a person to
> reject.
>
> And underneath all of it, **on-site cash remains the primary settlement route** and does not touch
> Tier 5 at all. The boarding house ran on cash before this system and it still does. Online payment
> is an addition, never a dependency."

**The sentence to land:** *"The panel asked us not to depend on an unconfirmed service. Our answer
is that we built it against the real one, and we can switch it off."*

---

## §4 — Finalized database schema  ·  ~2 min  ·  **GRADED CORE**

**Slide:** `hivelet_erd_defense.png` — the seven entities on the settlement path, with the changes
marked. Keep the full 21-table ERD on the next slide.

> "Our schema is **21 tables in Third Normal Form**. Rather than walk all of them, I want to show the
> four changes we made **specifically because of the panel's recommendation** — they are all on the
> payment path."

### The four changes, in order

> "**First, the payments table is deliberately gateway-agnostic.** It stores `payment_method`,
> `payment_source`, `transaction_reference` and `verification_status` — attributes that describe *any*
> settlement. We could have stored Adyen's payload shape. If we had, the **schema itself** would have
> depended on the unconfirmed service, which is the exact rigidity we were warned about. Because we
> did not, **changing payment provider requires no schema change at all.**
>
> **Second, verification is a three-state machine, not a boolean.** `Verified`, `Pending
> Verification`, `Rejected` — plus `verified_by`, a foreign key to the administrator who decided, and
> `verified_at`. That is what lets us express in *data* that the gateway's word is not final.
>
> **Third, a payment can outlive its bill.** `payments.bill_id` is nullable with `ON DELETE SET
> NULL`. The payment is the financial fact; the bill is only the demand for it. Losing the record
> that money arrived would be far worse than losing the demand.
>
> **Fourth, financial history cannot be deleted.** We converted six ledger foreign keys to `ON DELETE
> RESTRICT`. I want to be honest about why: when we audited the schema we found it had **17 cascade
> deletes, four set-nulls, and zero restricts**. Deleting one room would have silently destroyed
> every bill, payment and income record attached to it. If an external service is going to write into
> that ledger, the ledger has to be undeletable. We fixed it in migration 005."

### Then the honest widening — this is where marks are won

> "The panel asked us about payments. Answering it properly meant auditing the whole database, and
> the audit found more. The largest finding was not about payments at all.
>
> The expense ledger records costs against **property areas**. We discovered that the landlady's own
> household costs — her residence, her personal spending — were being recorded in the same ledger as
> the boarding house's operating costs, and the system was subtracting **all** of it from rental
> income. Across the recorded history that is **₱3.43 million**, which is **58.9% of the expense
> ledger**, wrongly deducted. Net Operating Income was materially wrong.
>
> We added a `property_areas` table with an `is_rental_expense` flag, so net rental income now sums
> only real operating costs, and the personal total is reported separately rather than silently
> deducted."

**If asked "did the panel ask for that?" — say no.** *"They asked us one thing. Answering it properly
meant auditing the system, and the audit found a financial error worth ₱3.43 million. We would rather
report that than not have looked."*

---

## §5 — Process and data flow diagrams  ·  ~2 min

**Slide:** Level 0 context, then Level 1.

> "Our Level 0 context diagram shows three external entities — the Prospect, the Active Tenant and
> the Administrator — around a single process.
>
> Our Level 1 decomposes into **seven processes and twelve data stores**. That is a change from what
> we submitted: the original showed six processes, and it did not balance. Two of our Level 0 outputs
> had no Level 1 process producing them, and the authentication credentials crossing the boundary
> landed nowhere at all, because the process that consumed them had been dropped. We restored
> **Process 7.0, Authenticate and Authorize Users**, and added the missing return flows, so now every
> data store is read as well as written and every boundary output has a producer."

**Then walk one subprocess — use Process 3.0, because it is the one the panel's recommendation touches:**

> "Let me walk **Process 3.0, Process Billing and Payments**.
>
> It reads the room catalogue and the tenancy records to know who occupies what and at what rate. It
> computes the bill: rent from the unit's current price, plus water. Water is **occupant count times a
> configurable rate** — it reads that rate from our system settings table rather than hardcoding it,
> and the two Linda units take a fixed monthly charge instead, which is business rule BR-040.
>
> It writes to the Bills store. When money arrives — cash at the door, or GCash through the adapter —
> it writes to the Payments store as **Pending Verification**.
>
> Then it stops, and waits for a human. When the administrator verifies, the process updates the
> bill to Paid, writes the income ledger entry, and writes an immutable audit record. Those last
> steps are what make the ledger defensible: every financial change has a named actor, a timestamp,
> and a before-and-after snapshot."

---

## §6 — Design justification  ·  ~2–3 min

**Our most significant design change: the Pluggable Payment Gateway Adapter (Tier 5).**

It is the right choice for this section because it is the change that *answers the panel*.

> "**Functionality.** It fully supports FR-011 billing, FR-014 manual payments, FR-015 online
> payments and FR-016 payment verification. On-site cash and GCash both settle through the same
> pipeline and produce the same audit trail, so the administrator has one verification queue rather
> than two workflows.
>
> **Security.** The gateway is never trusted with the financial outcome. A completed online payment
> is inserted as Pending Verification and cannot settle a bill — only a human with `payment:verify`
> can, under BR-017. Below that sit two further layers: the database refuses to answer anyone but our
> backend, because row-level security is forced on all 21 tables with zero policies; and the payment
> callback endpoints are protected by a single-use **128-bit cryptographic capability token**, so a
> forged callback cannot be constructed and a replayed one finds nothing.
>
> **Scalability.** Changing payment provider is one file and **zero schema changes**, because the
> payments table stores generic settlement attributes. Adding a provider is one new value in an enum.
> The architecture scales in the direction this property will actually grow — more units and more
> tenants against the same ledger — rather than being over-built for traffic a 33-unit boarding house
> will never see.
>
> **Problem alignment.** The original problem was lost records, scattered Messenger screenshots and
> unprovable payments. This turns every payment — cash or online — into a row with a reference, a
> named verifier, a timestamp, and an immutable audit entry. And because the gateway is optional, the
> landlady is never locked out of her own system by a commercial arrangement she has not agreed to.
> **That last point is the panel's recommendation, honoured.**"

---

## Anticipated questions — answer honestly, you are in a strong position

| Question | Answer |
| :--- | :--- |
| *"Is the Adyen integration live?"* | "It runs against a configured Adyen **developer sandbox**, using their real v71 Checkout Sessions API. Live commercial processing additionally needs SEC or DTI business underwriting of the property as a merchant — that is the owner registering a business, not a software task, and it is outside a capstone's scope." |
| *"Why not microservices?"* | "Scale doesn't justify it. One property, 33 units, one administrator. A modular monolith gives us clean service boundaries without distributed-systems cost. The one thing we did split out is the payment gateway — because that is the boundary the panel identified as risky." |
| *"Is your schema really in 3NF?"* | "Twenty of twenty-one tables, yes. One is not: `rooms.is_linda_unit` is determined by the cluster, which is a transitive dependency. We found it, measured it — zero of 33 rows disagree today — and we can show you the migration that fixes it. We would rather name the exception than claim perfection." |
| *"How do you know the water rate is right?"* | "It comes from a `system_settings` row, not from code. We found it hardcoded as `occupants * 200` in four places, which meant the landlady could not change her own rate without a developer. There is no hardcoded rate left in the backend." |
| *"What if the gateway sends a fake payment?"* | "It creates a Pending Verification row for a human to reject. It cannot settle a bill. And the callback needs a 128-bit single-use token it cannot guess." |
| *"You said ₱3.43 million — how confident are you?"* | "It is a sum over all 1,327 expense allocations in the live database, and it reconciles with the landlady's own spreadsheet. 58.9% of the recorded expense ledger is personal rather than operating cost." |
| *"Did anything in your submitted documents turn out wrong?"* | "Yes, and we produced an errata sheet with 21 entries. The largest were a claim that `ON DELETE RESTRICT` already existed when it did not, and a 2% annual rent escalation that appears in no business rule — the owner sets rates by hand. We would rather hand you the corrections than have you find them." |

---

## The two things not to say

1. **Do not attribute a second recommendation to the panel.** There was one.
2. **Do not say "co-ownership", "50/50", "2% annual increase", "32 units", or "Pending
   Consultation".** The first two are banned by locked editorial canon; the rest are withdrawn errata.
   `fifty_percent_share` is described **only** as a system-computed figure equal to half the row's
   Rent Amount, retained so the ledger reconciles with the historical spreadsheet.

---

*Phase 3 artifact. Companion: `PHASE3_PANEL_RECOMMENDATION_REGISTER.md`. Binding canon:
`PHASE1_LOCKED_DECISIONS.md`, `PHASE2_LOCKED_DECISIONS.md`, `outputs/PHASE1_MODULE01_ERRATA.md`.*
