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

Every diagram is in `docs/diagrams/rendered/` in **both** formats — `.svg` and `.png`.

**Use the SVG on camera.** It stays sharp at any zoom, which matters because a viewer of a
video cannot lean into the screen the way a panelist can lean into a slide. The PNGs are
there for tools that will not accept SVG; they are 3,900–5,400 px wide so they hold up, but
they soften past that. *(They were previously exported at roughly 800 px, which is why they
looked blurry — that is fixed.)*

There is a one-page map of every document and image, section by section, in
**`docs/PRESENTATION_INDEX.md`**. Keep that open while recording.

Paste-ready Mermaid source for every diagram — themed, copy and go — is in
**`docs/diagrams/DIAGRAM_SOURCE.md`**, for mermaid.live, Mermaid Chart or Mermaid AI. If you
regenerate a diagram there, paste the result back into the matching `.mmd` file so the
repository stays the source of truth.

| Section | Use on screen | File |
| :-- | :--- | :--- |
| 3 | **Architecture, defense view** — five tiers left-to-right, adapter and gate highlighted | `hivelet_architecture_defense.svg` |
| 3 | *Backup:* architecture, full component map | `hivelet_architecture.png` |
| 4 | **ERD overview** — 12 entities, cardinalities and delete policies, no attribute clutter | `hivelet_erd_defense_overview.svg` |
| 4 | **PAYMENTS close-up** — the four changes D-1…D-4, large type | `hivelet_erd_defense_payments.svg` |
| 4 | *Backup:* ERD defense view with attributes; full 21-table ERD | `hivelet_erd_defense.png`, `hivelet_erd.png` |
| 5 | Level 0 context, then Level 1 | `hivelet_dfd_context.png`, `hivelet_dfd_level1.png` |
| 5 | *Optional:* payment sequence | `hivelet_sequence_payment.png` |

### If you are recording a video, read this

**Section 4 needs two shots, not one.** The full ERD has 21 tables and even the
seven-entity version puts nine attribute rows on screen at once — at 16:9 the type is too
small to read, and a viewer cannot zoom a video the way a panelist can lean into a slide.

So: open on **`hivelet_erd_defense_overview.svg`** while you say what the schema *is* — 21
tables, the delete policy, where money lives. Then cut to
**`hivelet_erd_defense_payments.svg`** and stay there for the rest of the section. That
second image is where D-1 through D-4 are legible, and it is what you talk over.

The same applies to Section 3: `hivelet_architecture_defense.svg` is built wide and shallow
specifically so it fills a 16:9 frame. **Do not use the full architecture map on camera** —
it is a reference document, not a slide.

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

> **CORRECTED 2026-09-14 — read before rehearsing.** This passage used to say the panel gave
> the recommendation "in two parts", the second being an instruction not to become rigidly
> dependent on an unconfirmed external service. **The panel did not say that.** Its only source
> was the team's own answer to Activity Item 12, which paraphrased what the panel said together
> with the team's own reasoning. Saying it aloud attributes to the panel something they never
> said, in front of them. See `PHASE3_PANEL_RECOMMENDATION_REGISTER.md` §1.
>
> "At our Capstone 1 proposal defense the panel gave us **one recommendation**: that we
> **explore an online payment integration**, and specifically that we evaluate **Adyen for
> GCash payments**.
>
> To be clear where we were before that: our proposal handled payments by **recording
> cash**. There was no online payment in it at all.
>
> So we raised the practical constraint — our client collects cash, and that is what she
> wants. What came out of that discussion was to explore the integration as an **optional**
> feature rather than as the way payments work, so that it is there if she changes her mind
> later.
>
> That is the shape of what we built. Cash stays primary; the online option can be switched
> on or off; the system runs correctly either way. Everything in the next two sections is how
> we did that."

**If asked whether that was the only one:** yes, and do not invent others. "That was the
recommendation we were given, and we treated the second half of it as an architectural requirement."

---

## §3 — Finalized architecture  ·  ~2 min  ·  **GRADED CORE**

**Slide:** `hivelet_architecture_defense.svg`

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
> **Tier 5 is the part that answers the recommendation.** It is a pluggable payment gateway
> adapter, and it exists because we chose to keep online payment optional — the gateway can be
> switched on or left off without the rest of the system noticing."

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

**Slides:** `hivelet_dfd_context.png`, then `hivelet_dfd_level1.png`.

> [!IMPORTANT]
> **This diagram is not the one you submitted, and you must say so before anyone notices.**
> The submitted Level 1 showed **6 processes**; this shows **7 processes and 12 data stores**.
> A panelist comparing the two will spot it. Explaining the change yourself turns a
> discrepancy into evidence that you checked your own work; being asked about it does not.

### Open by naming the change

> "Before I walk this, one thing: our Level 1 diagram has changed since submission. It had six
> processes; it now has seven. I want to explain why, because we found the reason ourselves.
>
> **The submitted pair did not balance.** In data flow diagramming, every output promised at
> the system boundary in the Level 0 context diagram must have a Level 1 process that actually
> produces it. Ours did not. The Level 0 promised **eleven** distinct outputs to our three
> external entities; the Level 1 delivered **one**.
>
> When we traced it, we found two concrete faults.
>
> **First, six of our twelve data stores were write-only.** Nothing in the Level 1 ever read
> from them. Data went in and nothing came out, so the outputs the context diagram promised had
> no producer.
>
> **Second, we had deleted a process without replacing it.** The original laboratory DFD
> modelled 'Authenticate and Authorize Users' as Process 5. When we modernised the diagram, that
> process disappeared — but the 'Authentication Credentials' flow still crossed the system
> boundary from all three external entities. Three inputs arriving at a process that no longer
> existed.
>
> So we restored it as **Process 7.0, Authenticate and Authorize Users**, which maps to a real
> file — `authService.ts` — and added the missing return flows. Now every data store is read as
> well as written, and every Level 0 output has a Level 1 process producing it. The diagram
> balances."

**If asked whether that was a mistake:** yes, and say it plainly. *"It was. The submitted
version promised outputs it could not produce. We would rather show you the corrected diagram
and explain the correction than defend one we know does not balance."*

### Then walk one subprocess — use Process 3.0

It is the one the panel's recommendation touches, so it carries Section 3 and 4 forward.

> "Let me walk **Process 3.0, Process Billing and Payments**.
>
> It reads the room catalogue and the tenancy records to know who occupies what and at what
> rate. It computes the bill: rent from the unit's current price, plus water. Water is
> **occupant count times a configurable rate**, read from our system settings table rather than
> hardcoded — and the two Linda units take a fixed monthly charge instead, which is business
> rule BR-040.
>
> It writes to the Bills store. When money arrives — cash at the door, or GCash through the
> adapter — it writes to the Payments store as **Pending Verification**.
>
> Then it stops, and waits for a human. When the administrator verifies, the process updates
> the bill to Paid, writes the income ledger entry, and writes an immutable audit record. Those
> last steps are what make the ledger defensible: every financial change has a named actor, a
> timestamp, and a before-and-after snapshot."

**Numbers for this section:** 7 processes, 12 data stores, 3 external entities (Prospect,
Active Tenant, Administrator). The legacy laboratory DFD had 5 processes and 6 stores — that is
the *original*, not the submitted one, and the two are different diagrams.

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
> can, under BR-017. Below that sit two further layers. The database refuses to answer anyone but our
> backend, because row-level security is forced on all 21 tables with zero policies. And **exactly one
> code path may write an online payment**: the webhook, after an HMAC-SHA256 signature over Adyen's
> own payload verifies against our shared secret, compared in constant time. A forged notification
> fails the signature; a replayed one is recognised by its `pspReference` and acknowledged without
> writing a second row.
>
> That single-writer rule is a change we made *because* we found the alternative failing. The
> shopper's browser also wrote a payment when it returned from checkout, under a reference it
> generated itself — so one payment produced two rows the webhook could not reconcile, and any
> tenant could have placed an unpaid row in the landlady's queue by replaying the request. The
> browser now asks our server what happened, our server asks Adyen, and nobody's browser writes
> money.
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

## Before you answer the security question — read this

**Do not say "we rotated everything" unless the account passwords have actually been changed.**

The Supabase keys and the JWT secret were rotated on 2026-09-13. **The shared account passwords
were not.** `Hivelet@Admin2026` and `Hivelet@Tenant2026` are still live, and they have been in
this repository's git history since **2026-08-25** — the same window as the key exposure.
Removing them from the current code, which was done on 2026-09-16, does not remove them from
history.

So a panelist who checks can contradict that sentence in front of you. Either rotate the two
passwords before the defense — see **A-18** in the traceability matrix — or answer precisely:
*"we rotated the keys and the signing secret; the shared demo passwords are still outstanding
and are the next thing on the list."* **The precise answer is the stronger one either way.**

---

---

## Anticipated questions — answer honestly, you are in a strong position

| Question | Answer |
| :--- | :--- |
| *"Is the Adyen integration live?"* | "It runs against a configured Adyen **developer sandbox**, using their real v71 Checkout Sessions API. Live commercial processing additionally needs SEC or DTI business underwriting of the property as a merchant — that is the owner registering a business, not a software task, and it is outside a capstone's scope." |
| *"How fast is it? Does it scale with the ledger?"*<br>**Do not quote a number from memory — run it.** | "We withdrew every performance claim from the Module 01 submission as errata **E-16**, because none of them had been measured. So we wrote a measurement instead: `npm run measure` times every read endpoint, five runs each, on whatever machine you are looking at. Today it says the income ledger — **937 receipts** — comes back in about **580ms**, and the expense ledger — **1,262 entries** — in about **960ms**. The useful part is the shape rather than either figure: **15 rows cost 322ms and 1,262 cost 957ms**, so roughly **320ms is paid before a single row is read** and each extra row costs about **half a millisecond**. That floor is the round trip to a hosted database, not our code. Rows are cheap; the hop is not — which is why growth in the ledger is not what we would worry about first. It measures reads only, on one machine, warm, and it says nothing about RAM or concurrency: those two claims from Module 01 stay withdrawn." |
| *"Why not microservices?"* | "Scale doesn't justify it. One property, 33 units, one administrator. A modular monolith gives us clean service boundaries without distributed-systems cost. The one thing we did split out is the payment gateway — because that is the boundary the panel identified as risky." |
| *"Is your schema really in 3NF?"* | "Twenty of twenty-one tables, yes. One is not: `rooms.is_linda_unit` is determined by the cluster, which is a transitive dependency. We found it, measured it — zero of 33 rows disagree today — and we can show you the migration that fixes it. We would rather name the exception than claim perfection." |
| *"How do you know the water rate is right?"* | "It comes from a `system_settings` row, not from code. We found it hardcoded as `occupants * 200` in four places, which meant the landlady could not change her own rate without a developer. There is no hardcoded rate left in the backend." |
| *"What if the gateway sends a fake payment?"* | "It cannot get that far. A payment row is written by exactly one path — the webhook — and only after an HMAC-SHA256 signature over Adyen's own payload verifies against our shared secret, compared in constant time. Even a genuine authorisation writes `Pending Verification`; only an administrator holding `payment:verify` settles a bill. Adyen telling us the money moved is evidence, not the landlady's decision." |
| *"Why doesn't the browser record the payment when the shopper comes back?"*<br>**Strong answer — this was a real defect we found and fixed.** | "Because it produced two payment rows for one payment. The browser wrote a row under a locally generated reference; the webhook then wrote its own under the gateway's `pspReference`, and its duplicate check matches on that reference, so it could not recognise the first. Two rows, two notifications, one payment. And the browser cannot be fixed by sending the reference, because Adyen never gives it one — Adyen Web v6 passes exactly seven keys into `onPaymentCompleted` and `pspReference` is not among them. We verified that by reading the shipped SDK bundle rather than trusting the documentation. So the webhook became the only writer, and the browser return now asks our server, which asks Adyen directly over a server-to-server call, what actually happened." |
| *"What happens if the webhook cannot reach you during the demo?"* | "The payment is still real and still recorded at Adyen; our ledger just has not heard yet. The tenant sees 'Adyen confirmed your payment, the record is on its way' rather than a false receipt, and the administrator has the manual payment entry she has always had. We preferred a delay we can explain over a row we cannot prove." |
| *"You said ₱3.43 million — how confident are you?"*<br>**Have the breakdown ready; it is the number most likely to be challenged.** | "It is a query over the live database, re-run on 13 September 2026. The whole expense ledger is **₱5,823,586.47** across **1,327 allocation rows**. Of that, Main House is ₱1,437,487.22 and Other Expenses / Personal is ₱1,995,503.25 — together **₱3,432,990.47, which is 58.95%** of the ledger and is not boarding-house operating cost. The operating side is Boarding House ₱2,253,574.74 (38.70%), Front Apartment ₱87,411.27 (1.50%) and Back Apartment ₱49,609.99 (0.85%). The rows come from the landlady's own spreadsheet, so the figures reconcile with her records rather than competing with them." |
| *"How do you know your system is secure?"*<br>**Only if it comes up — this is a strong answer, not a volunteered confession. Updated 2026-09-16; see the caution below it.** | "We audited it and kept finding our own worst problems. Our live database key and our JWT signing secret had been committed to a public repository for three weeks — we rotated both and migrated to Supabase’s new key format, so the old keys are revoked everywhere at once, and added a pre-commit scanner so it cannot recur. Then we found two more. Our public registration endpoint accepted a `role` field straight from the request body, so an unauthenticated POST could create an administrator — it was never used, and it is closed, with a regression guard. And our sign-in page carried a demo panel that shipped 34 account passwords, the administrator’s among them, into the JavaScript bundle — together with the name, email and room number of every resident. That is removed from the build and the bundle re-verified clean. The lesson we took is that a correct access-control design protects nothing once its credentials leak, which is why credential handling and what actually ships are now both checked by the suite rather than by memory."
| *"How do you know the interface shows real data?"*<br>**Only if the panel probes the UI.** | "We audited it and found it was not. Twenty-some places displayed or wrote values the system did not hold: the audit log rendered four invented entries attributed to the landlady whenever the API failed, the resident's profile form was pre-filled with a fabricated emergency contact that would be saved on submit, a payment with no verification status displayed as VERIFIED, and recording cash could report 'posted to the ledger' with nothing written. We swept all 33 write paths and fixed every one. The rule we now hold is that the interface may show what the database says or say it does not know — never a plausible substitute." |
| *"Did anything in your submitted documents turn out wrong?"* | "Yes, and we keep an errata sheet — it has 22 entries. Three examples: we claimed `ON DELETE RESTRICT` already existed when it did not; we described a 2% annual rent escalation that appears in no business rule, since the owner sets rates by hand; and we overstated the panel's own recommendation, which we corrected once we checked it against what was actually said. We would rather hand you the corrections than have you find them." |

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
