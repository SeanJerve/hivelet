# HIVELET — VIDEO PRESENTATION FILMING SCRIPT

**Bicol University College of Science · IT 124 Capstone Project 2 · Group 4**
**Fe Galang Da Silva Boarding House**

**Total running time: about 12 minutes.** The limit is 10 to 15.

Everything in **bold brackets** is a stage direction — do not read it aloud.
Everything else is spoken word for word.

---

## Who speaks when

| § | Section | Speaker | Target |
| :-- | :--- | :--- | ---: |
| 1 | Introduction and problem recap | **Loyd** | 1:00 |
| 2 | Panel recommendation recap | **Loyd** | 1:30 |
| 3 | Finalized architecture | **Sean** | 2:00 |
| 4 | Finalized database schema | **Eljohn** | 2:00 |
| 5 | Process and data flow diagrams | **Vince** | 2:00 |
| 6 | Design justification | **Kiel** | 2:30 |
| | | | **11:00** |

One minute of slack. Do not rush — it is better to finish at 12 than to sound hurried.

**All images are in `diagrams/` beside this file. Use the `.svg` versions.**

---

## § 1 — INTRODUCTION AND PROBLEM RECAP · LOYD · 1:00

**[ON SCREEN: title card — Hivelet, Group 4, Fe Galang Da Silva Boarding House]**

Good day. We are Group 4, and this is **Hivelet**, a boarding house management
system built for the Fe Galang Da Silva Boarding House in Legazpi City.

The property is thirty-three rentable units across five clusters — the main
boarding house, a front apartment, a back apartment, a penthouse, and two Linda
units.

All of it has been run on paper and in a spreadsheet. Rent is collected in
person, receipts are written by hand, and payment questions are settled by
scrolling through Messenger. There is no single place that says who has paid,
who is late, and what the property actually earned.

Our end users are two. The landlady, Mrs. Fe Galang Da Silva, who needs one
reliable ledger. And her residents, who need to see their own bills and their
own payment history without having to ask.

**[PAUSE — hand over]**

---

## § 2 — PANEL RECOMMENDATION RECAP · LOYD · 1:30

**[ON SCREEN: a plain slide with the recommendation quoted]**

At our Capstone 1 proposal defense, the panel gave us **one** recommendation.

They recommended that we explore an online payment integration — specifically
evaluating **Adyen for GCash payments**. And because the commercial fees and the
merchant registration terms had not yet been settled with the property owner at
that time, they instructed us to make sure our architecture and our database did
**not** become rigidly dependent on an unconfirmed external service.

We want to be precise about this, because it is really two instructions in one
sentence.

The first is: do the evaluation, and show a real result.

The second is the harder one: the system must keep working **whether or not**
that gateway is ever available. Not as a promise — as something we can
demonstrate.

That second instruction is the spine of the next three sections. Our architecture
answers it, our schema answers it, and our design justification at the end is
built entirely around it.

**[PAUSE — hand over to Sean]**

---

## § 3 — FINALIZED ARCHITECTURE · SEAN · 2:00

**[ON SCREEN: `hivelet_architecture_defense.svg` — leave it up for the whole section]**

This is our finalized architecture. The pattern is a **layered client–server
architecture, structured as a modular monolith, with a pluggable payment gateway
adapter**.

**[POINT: left to right across the five tiers]**

Five tiers. Tier 1 is the Vue 3 single-page application — and note that it holds
no database credential of any kind. Tier 2 is the API and security layer, which
enforces thirty-nine permissions across four roles. Tier 3 is our domain
services. Tier 4 is the Supabase PostgreSQL database. And Tier 5 — the one in
orange — is the pluggable payment gateway adapter.

**[POINT: Tier 5]**

Tier 5 exists **because of the panel's recommendation**. It is one file. It is
the only file in the entire system that knows Adyen exists. If the gateway were
withdrawn tomorrow, we would change that one file and no schema would move.

**[POINT: the two arrows out of Tier 5]**

When Adyen is configured, checkout goes to Adyen. When it is not, a local
settlement path serves instead — and the system is fully operational either way.
That is the panel's second instruction, demonstrated rather than asserted.

**[POINT: the green box on the right]**

And every path, both of them, ends at the same place — the administrator
verification gate. Notice the on-site cash route at the bottom: it reaches that
same gate without passing through Tier 5 at all. Cash remains the primary method
and does not depend on the gateway in any way.

**[PAUSE — hand over to Eljohn]**

---

## § 4 — FINALIZED DATABASE SCHEMA · ELJOHN · 2:00

**[ON SCREEN: `hivelet_erd_defense_overview.svg`]**

Our finalized schema is twenty-one tables. This view shows the core entities and
how they relate.

**[HOLD this image for about thirty seconds while you say the next paragraph]**

Two things to notice before the detail. First, every financial relationship uses
`ON DELETE RESTRICT` — a room or a tenant with payment history simply cannot be
deleted. Second, all twenty-one tables have row-level security enabled and
forced, with zero policies. That means the database refuses to answer anyone
except our backend.

**[SWITCH NOW to `hivelet_erd_defense_payments.svg` — stay here for the rest]**

This is the `payments` table, and this is what changed in response to the
recommendation. Four changes.

**[POINT to each as you say it]**

**One.** The settlement columns are deliberately generic. `payment_method`,
`payment_source`, `transaction_reference`. Nothing here is Adyen-shaped. Adding a
different provider is one new value in an enum — it is not a schema change.

**Two.** The verification columns. `verification_status`, `verified_by`,
`verified_at`. A gateway can report that money moved; it cannot mark a debt
settled. Only an administrator can, and the schema records **who** decided and
**when**.

**Three.** `bill_id` is nullable, with `ON DELETE SET NULL`. A payment outlives
the bill it settled. The money is a fact even when the invoice is gone.

**Four.** `room_id` and `tenant_profile_id` are `ON DELETE RESTRICT`. Financial
history cannot be erased by deleting something else.

Together, those four make the schema gateway-agnostic — which is exactly what the
panel asked for.

**[PAUSE — hand over to Vince]**

---

## § 5 — PROCESS AND DATA FLOW DIAGRAMS · VINCE · 2:00

**[ON SCREEN: `hivelet_dfd_context.svg`]**

This is our Level 0 context diagram. Hivelet as a single process, with four
external entities: the prospective tenant, the resident, the administrator, and
the Adyen payment gateway.

**[SWITCH to `hivelet_dfd_level1.svg`]**

And this is Level 1. We want to name a change here rather than let you find it.

Our submitted module documented **six** subprocesses. This diagram has **seven**.

The seventh is payment gateway settlement. When we built the integration
properly, the gateway callback turned out to be its own process with its own
trust boundary — it is not part of billing, because it is triggered by an
external system rather than by a user. Collapsing it into billing would have
hidden exactly the boundary the panel told us to be careful about.

**[POINT: Process 3.0]**

Let me walk one subprocess in detail — **3.0, Billing and Payment Settlement**.

**[TRACE the path with your cursor as you speak]**

A resident requests a bill. The process reads the room assignment from D3 and the
water rate from D11, System Parameters — that rate is configuration, not a
constant in our code. It writes the bill to D5.

When payment is made, the settlement writes a payment record to D6 — and it
writes it as **Pending Verification**. It does not touch the bill's status.

Only when the administrator verifies does the process mark the bill paid and
write the income row into D7. Those three writes happen inside one database
transaction, so they either all happen or none do.

And every one of those steps writes to D10, the audit log, which is append-only.

**[PAUSE — hand over to Kiel]**

---

## § 6 — DESIGN JUSTIFICATION · KIEL · 2:30

**[ON SCREEN: `hivelet_architecture_defense.svg` again]**

Our most significant design change is **Tier 5, the pluggable payment gateway
adapter**. We are justifying it on four grounds.

**Functionality.** It supports billing, manual payments, online payments and
payment verification. On-site cash and online GCash settle through the same
pipeline and produce the same audit trail — so the landlady has one verification
queue, not two workflows.

**Security.** The gateway is never trusted with the financial outcome. A
completed online payment is written as Pending Verification and cannot settle a
bill; only a human holding the verify permission can do that.

Beneath that sit two more layers. The database refuses anyone but our backend —
row-level security is forced on all twenty-one tables. And exactly one code path
may write an online payment: the webhook, after an HMAC-SHA256 signature over
Adyen's own payload is verified in constant time. A forged notification fails the
signature. A repeated one is recognised and ignored.

**Scalability.** Changing payment provider is one file and **zero schema
changes**, because the payments table stores generic settlement attributes. The
architecture scales in the direction this property will actually grow — more
units and more tenants against the same ledger — rather than being over-built for
traffic a thirty-three-unit boarding house will never see.

**Problem alignment.** The original problem was lost records, scattered
screenshots, and payments nobody could prove. This turns every payment, cash or
online, into a row with a reference, a named verifier, a timestamp, and an
immutable audit entry.

And because the gateway is optional, the landlady is never locked out of her own
system by a commercial arrangement she has not agreed to.

**That last point is the panel's recommendation, honoured.**

**[ON SCREEN: closing card — thank you]**

Thank you.

---

# BEFORE YOU FILM — read this once

### Do not say these

| Do not say | Say instead |
| :--- | :--- |
| "co-ownership", "co-owner", "50/50", "owner share", "landlady share" | "the fifty percent column", described only as **a system-computed figure equal to half that row's Rent Amount, kept so the ledger matches the original spreadsheet** |
| "mock", "simulator", "demo gateway", "pending consultation" | "the Adyen integration", "the local settlement path" |
| "2% annual increase" | nothing — the owner sets rates by hand, there is no automatic escalation |
| "32 units" | **33 units** |
| "the panel recommended… and also…" | There was **one** recommendation. Do not invent a second. |

### Numbers, if anyone quotes one

| | |
| :--- | ---: |
| Tables, all with row-level security forced, zero policies | **21** |
| Units · clusters | **33** · **5** |
| Floors | **11 / 11 / 10 / 1** |
| Permissions · roles | **39** · **4** |
| Income ledger rows | **937** |
| Expense allocation rows | **1,327** |

### Filming notes

- **§4 needs two shots.** Open on the overview, then cut to the payments close-up
  and stay there. On a 16:9 frame the full ERD is unreadable.
- **Do not put `hivelet_architecture.svg` on camera.** It is the full component
  map and it is a reference document, not a slide. Use the `_defense` version.
- Use the **`.svg`** files. The PNGs are there only for tools that refuse SVG.
- Each section ends with **[PAUSE — hand over]**. Leave a real half-second of
  silence there; it makes the cut between speakers clean.
- If a section runs long, the place to trim is **§6**, not §3 or §4 — those two
  are the graded core.

### If the panel asks a question

The anticipated-questions table is in **`01_SCRIPT_defense_pack.md`**, the section
called *Anticipated questions*. The three most likely:

- *"Is the Adyen integration live?"* — It runs against a configured Adyen
  developer sandbox using their real v71 Checkout Sessions API, with GCash
  enabled on the merchant account. Live commercial processing additionally needs
  business registration of the property as a merchant, which is the owner
  registering a business, not a software task.
- *"Is your schema really in 3NF?"* — Twenty of twenty-one tables, yes. One is
  not, and we can name it: `rooms.is_linda_unit` is determined by the cluster,
  which is a transitive dependency. Zero of thirty-three rows disagree today, and
  we can show the migration that fixes it.
- *"What if the gateway sends a fake payment?"* — It cannot get that far. The
  signature is verified before anything is written, and even a genuine
  authorisation only creates a row for a human to approve.
