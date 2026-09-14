# HIVELET — CLASS PRESENTATION SCRIPT

**IT 124 Capstone Project 2 · Module 01: System Design Refinement · Group 4**
**Fe Galang Da Silva Boarding House Management System**

This is the **Final Group Requirement** for Module 01 — presenting our finalized
architecture, database schema, and process/data flow diagrams to our instructor
and the class.

**Sections 1 to 6 run about 10 minutes of speech. Section 7 is the question
period.** The limit is 10 to 15.

Anything in **bold brackets** is a stage direction. Do not read it aloud.

---

## Who speaks

| § | Section | Speaker | Target |
| :-- | :--- | :--- | ---: |
| 1 | Introduction and problem recap | **Loyd** | 1:20 |
| 2 | Panel recommendation recap | **Loyd** | 1:15 |
| 3 | Finalized architecture | **Sean** | 2:00 |
| 4 | Finalized database schema | **Eljohn** | 2:00 |
| 5 | Process and data flow diagrams | **Vince** | 2:00 |
| 6 | Design justification | **Kiel** | 2:30 |
| 7 | Questions | **everyone** | 2:00–3:00 |

The rubric gives **25 points for delivery and team participation**, and it
explicitly checks that every member speaks. Nobody sits this out.

**Images are in `diagrams/` beside this file. Use the `.svg` versions.**

---

## § 1 — INTRODUCTION AND PROBLEM RECAP · LOYD · 1:20

**[ON SCREEN: title slide — Hivelet, Group 4, and the five member names]**

Good day, ma'am/sir. We are Group 4, and our system is **Hivelet** — a web-based
apartment management system for the Fe Galang Da Silva Boarding House here in
Legazpi.

The property has **thirty-three rentable units across five clusters**: the main
boarding house, a front apartment, a back apartment, a penthouse, and two Linda
units.

**[The next paragraph is the gap from our paper. Say it clearly — it is why the
study exists.]**

Property management systems already exist. The problem is that most are built for
**large-scale or commercial properties**. They assume stable infrastructure,
structured workflows, and dedicated administrative staff — and a small,
resource-constrained boarding house has none of those. In the Philippine setting,
transactions are also mostly **cash-based** and records are still kept by hand.

So the existing options are either too heavy for a property this size, or they
solve only one piece and leave the rest scattered.

That is our gap: **there is no single, context-appropriate platform that brings
tenant management, financial tracking, communication, and booking together** at
this scale.

Today, rent is collected in person, receipts are handwritten, and payment
questions are answered by scrolling through Messenger. Nothing says who has paid,
who is late, and what the property earned.

Our end users are the landlady, Mrs. Fe Galang Da Silva, who needs one reliable
record, and her residents, who should see their own bills without having to ask.

**[PAUSE]**

---

## § 2 — PANEL RECOMMENDATION RECAP · LOYD · 1:15

**[ON SCREEN: a slide with the recommendation written out]**

At our Capstone 1 proposal defense, the panel gave us **one recommendation**:
that we explore an **online payment integration**, and specifically that we
evaluate **Adyen for GCash payments**.

To be clear where we were before that. Our proposal handled payments by
**recording cash** — the administrator enters what was collected in person. There
was no online payment in it at all.

So we raised the practical constraint: our client collects cash, and that is what
she wants. Online payment is not how she operates today.

What came out of that discussion was to explore it as an **optional** feature —
not as the way payments work, but as an option sitting beside cash. That way, if
she changes her mind later, it is already there.

That is the shape of what we built. Cash stays the primary method. The online
option can be switched on or off, and the system runs correctly either way.

The next three sections are how we did that.

**[PAUSE — hand over to Sean]**

---

## § 3 — FINALIZED ARCHITECTURE · SEAN · 2:00

**[ON SCREEN: `hivelet_architecture_defense.svg` — leave it up for this section]**

This is our finalized architecture. The pattern is a **layered architecture
structured as a modular monolith, with a pluggable payment gateway adapter**.

**[POINT: across the five tiers, left to right]**

Five tiers. Tier 1 is our web client. Tier 2 is the API and security layer, where
all authorization happens — thirty-nine permissions across four roles. Tier 3 is
our domain services. Tier 4 is the PostgreSQL database. And Tier 5, in orange, is
the payment gateway adapter.

We chose a modular monolith over microservices because our system is one property
with one administrator. Microservices would add distributed-system complexity
that this scale does not need.

**[POINT: Tier 5]**

Tier 5 is our answer to the design question from the last section. It is one
file, and it is the only place in the whole system that knows Adyen exists. If
the gateway changed, we would change that one file — and nothing in the database
would move.

**[POINT: the two arrows leaving Tier 5]**

When the gateway is configured, online payment goes through it. When it is not, a
local settlement path handles it instead, and the system still works. That is
what we mean by optional — built, not promised — and it is something we can show
rather than just say.

**[POINT: the green box on the right]**

Both routes end at the same place — the administrator verification step. And
notice the on-site cash route along the bottom: it reaches that same step without
touching Tier 5 at all. Cash stays the primary method and does not depend on the
gateway.

**[PAUSE — hand over to Eljohn]**

---

## § 4 — FINALIZED DATABASE SCHEMA · ELJOHN · 2:00

**[ON SCREEN: `hivelet_erd_defense_overview.svg`]**

Our finalized schema has **twenty-one tables**. This is the core of it, in Crow's
Foot notation.

**[HOLD this image while you say the next part]**

Two things before the detail. Every financial relationship uses **ON DELETE
RESTRICT** — a room or a tenant that has payment history cannot be deleted. And
the schema is normalized to **Third Normal Form**; twenty of the twenty-one
tables satisfy it fully, and we can name the one exception if asked.

**[SWITCH to `hivelet_erd_defense_payments.svg` — stay here for the rest]**

This is the **payments** table, and this is what changed because of the
recommendation. Four things.

**[POINT to each]**

**First**, the settlement columns are generic — payment method, payment source,
transaction reference. Nothing here is specific to Adyen. Supporting a different
provider would be one new value in a list, not a schema change.

**Second**, the verification columns — status, verified by, and verified at. A
payment gateway can report that money moved, but it cannot mark a bill settled.
Only the administrator can, and the schema records who decided and when.

**Third**, the bill reference is nullable, set to null on delete. A payment
outlives the bill it settled.

**Fourth**, the room and tenant references are restrict-on-delete, so financial
history cannot be erased indirectly.

Together, those four keep the schema independent of any one payment provider —
so the online option can be switched on later without touching the database.

**[PAUSE — hand over to Vince]**

---

## § 5 — PROCESS AND DATA FLOW DIAGRAMS · VINCE · 2:00

**[ON SCREEN: `hivelet_dfd_context.svg`]**

This is our **Context Diagram, Level 0** — the whole system as one process, with
four external entities: the prospective tenant, the resident, the administrator,
and the payment gateway.

**[SWITCH to `hivelet_dfd_level1.svg`]**

And this is our **Level 1 DFD**. We want to point out one change ourselves.

Our earlier submission had **six** subprocesses. This has **seven**.

The seventh is payment gateway settlement. When we built the integration, we
found the gateway callback is really its own process — it is triggered by an
outside system rather than by a user, so it has a different trust boundary.
Putting it inside billing would have hidden that.

**[POINT: Process 3.0]**

Let me walk through one subprocess — **3.0, Billing and Payment Settlement**.

**[TRACE the path with your cursor]**

A resident requests a bill. The process reads the room assignment from **D3** and
the water rate from **D11, System Parameters** — that rate is configuration, not
a number written into our code. It writes the bill to **D5**.

When a payment comes in, it writes a payment record to **D6**, marked pending
verification. It does not touch the bill status.

Only when the administrator verifies does it mark the bill paid and write the
income record into **D7**.

And every step writes to **D10**, the audit log.

We also did the cross-check the module asks for — **every data store in our DFD
maps to an entity in our ERD**. All twenty-one tables are accounted for.

**[PAUSE — hand over to Kiel]**

---

## § 6 — DESIGN JUSTIFICATION · KIEL · 2:30

**[ON SCREEN: `hivelet_architecture_defense.svg` again]**

Our most significant design change is **Tier 5, the pluggable payment gateway
adapter**. Here is our four-part justification.

**Functionality.** It supports our requirements for billing, manual payments,
online payments, and payment verification. On-site cash and online payment go
through the same pipeline and produce the same records, so the landlady has one
list to check instead of two separate workflows.

**Security.** Passwords are hashed with **bcrypt**. Authorization is enforced on
the server, never in the browser — our web client holds no database credential at
all. Row-level security is enabled and forced on all twenty-one tables, so the
database will not answer anyone except our own backend. And an online payment is
recorded as **pending verification**; it cannot settle a bill until a person with
the verify permission approves it.

**Scalability.** Changing payment provider is one file and **no schema changes**,
because the payments table stores generic settlement attributes. Foreign keys are
indexed. We designed for the scale this property actually has — thirty-three
units and one administrator — rather than for traffic it will never see.

**Problem alignment.** The original problem was lost records and payments nobody
could prove. This turns every payment, cash or online, into a record with a
reference, a named verifier, and a timestamp. And because the gateway is
optional, the landlady is never locked out of her own system by an arrangement
she has not agreed to.

And that is the panel's recommendation answered — we explored Adyen, we built
it, and we built it in a way that leaves the choice with her.

**[ON SCREEN: closing slide]**

Thank you, ma'am/sir. We are happy to take questions.

---

## § 7 — QUESTIONS · EVERYONE · 2:00–3:00

Whoever presented a section answers questions about it. If you do not know, say
so and say what you would check — that is a better answer than a guess.

**"Why a modular monolith and not microservices?"** · *Sean*
One property, thirty-three units, one administrator. Microservices add
distributed-system complexity our scale does not need. The modular monolith gives
clean internal separation without that cost — and we did split out the one part
that genuinely needed its own boundary, the payment adapter.

**"Is the Adyen integration actually working?"** · *Sean or Kiel*
Yes. It runs against a configured developer sandbox using their real Checkout
Sessions API, with GCash enabled on the account. Going live commercially also
needs the property registered as a business, which is the owner's decision rather
than a software task.

**"The client prefers cash — so why build the online payment at all?"** · *Loyd or Kiel*
That is exactly why it is optional rather than the default. The cost of having it
ready is low; the cost of not having it, if she changes her mind, is a rebuild. If
she never turns it on, nothing in the system is worse for it — cash does not pass
through the gateway at all.

**"Was online payment in your original proposal?"** · *Loyd*
No. Our proposal recorded cash payments only. The online integration came from the
panel's recommendation, and building it as optional was what we settled on once we
raised that our client only accepts cash.

**"Is your schema really in 3NF?"** · *Eljohn*
Twenty of twenty-one tables, yes. One is not — there is a flag on the rooms table
that is really determined by the cluster the room belongs to, which is a
transitive dependency. We found it, and we have the migration that fixes it.

**"What if the payment gateway sends something false?"** · *Eljohn or Kiel*
The notification is signature-verified before anything is written, and even a
genuine one only creates a record for the administrator to approve. It cannot
settle a bill on its own.

**"How do you know the water rate is correct?"** · *Vince*
It comes from a settings record, not from code. The administrator can change it
without needing a developer.

**"Which tools did you use?"** · *anyone*
A diagramming tool for the architecture and data flow diagrams, a database
modeling tool for the ERD, and a UI/UX design tool for the mockups.
**[The module asks for the TYPE of tool, not the product name. Do not name
products.]**

---

# BEFORE YOU RECORD

### Group Identification — fill this in first

The module has a table for this, with a name **and a role** for each member.
Agree them beforehand so nobody hesitates on camera.

| | Name | Role |
| :--- | :--- | :--- |
| Member 1 | Loyd | |
| Member 2 | Sean | Database administrator |
| Member 3 | Eljohn | |
| Member 4 | Vince | |
| Member 5 | Kiel | |

### The rubric — 100 points, four criteria at 25 each

| Criterion | What actually earns it |
| :--- | :--- |
| Design completeness and technical accuracy | Sections 3, 4 and 5, and the diagrams being consistent with each other. We checked that every DFD data store maps to an ERD entity — §5 says so out loud. |
| Incorporation of panel recommendations | §2 states it; §3, §4 and §6 answer it. Say "the panel recommended we explore Adyen for GCash" plainly, then show the three places we answered it. |
| Design justification | §6, all four parts. Be specific, not generic — "hashed with bcrypt", not "it is secure". |
| Delivery and team participation | Stay inside 10 to 15 minutes, and **every member speaks**. |

### Do not say

| Do not say | Say instead |
| :--- | :--- |
| a product name for a tool | "a diagramming tool", "a database modeling tool", "a UI/UX design tool" |
| "co-ownership", "50/50", "owner share", "landlady share" | "the fifty percent column" — a figure the system computes as half that row's rent, kept so the records reconcile with the original spreadsheet |
| "mock", "simulator", "demo gateway" | "the Adyen integration", "the local settlement path" |
| "2% annual increase" | nothing — the owner sets rates by hand |
| "32 units" | **33 units** |
| "the panel also recommended…" | There was **one** recommendation |
| "the panel instructed us to keep the architecture and database independent of Adyen" | That was **our** design decision, not theirs. The panel said *explore Adyen for GCash*. Our paper already called online payment optional. Claiming otherwise puts words in the panel's mouth, to the panel. |

### Filming notes

- **§4 needs two images, not one.** Open on the overview, then switch to the
  payments close-up and stay there. The full ERD is too small to read on video.
- **Do not show `hivelet_architecture.svg`** — that is the full component map and
  it is a reference document. Use the `_defense` version, which is built to fit a
  widescreen frame.
- Use the **`.svg`** files. The PNGs are only for tools that will not accept SVG.
- Leave a real pause at each **[PAUSE]**; it makes the cut between speakers clean.
- If you are running long, trim **§6** slightly. Do not trim §3 or §4.

---

*If a question goes deeper than this script, the detail is in
`01_SCRIPT_defense_pack.md` and the documents numbered 03 to 07 beside it. You
should not need them for this presentation — they are there in case you do.*
