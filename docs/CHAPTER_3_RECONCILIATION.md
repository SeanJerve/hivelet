# Chapter 3 — reconciliation with the system as built

**Prepared 2026-09-18.** Every replacement below is **paste-ready** and every version number was
read from `package.json` on this machine, not estimated.

> [!IMPORTANT]
> **Why this exists.** Chapter 4 reports what was built. Chapter 3 says what *would* be built, and
> in five places it says something else. **A panel that reads both chapters sees them disagree**,
> and the disagreement is about the technology stack — the easiest thing in the manuscript to
> check and the most embarrassing to get caught on.
>
> **Nothing here was wrong when it was written.** Chapter 3 was written as a plan. The plan
> changed during development, which is normal and which the Agile methodology in § 3.2 explicitly
> allows for. What is not allowed is the manuscript describing two different systems.

**I have not edited the manuscript.** It lives outside the repository and you may have it open.
This is the text to paste, in the order it appears.

---

## 1. Table 1 — Software Requirements

**Find the table with the header `Software | Version`.** Six of its seven rows describe a stack
that was not used.

**Replace the whole table body with:**

| Software | Version |
| :--- | :--- |
| Visual Studio Code | 1.85+ |
| Vue 3 (with TypeScript) | 3.5 / TypeScript 5.7 |
| Vite (build tool and dev server) | 5.4 |
| Tailwind CSS | 4.0 |
| Express.js (with TypeScript) | 4.19 / TypeScript 5.4 |
| Node.js | LTS (v18+) |
| PostgreSQL (hosted on Supabase) | 15 |
| Adyen Web Drop-in / API Library | 6.44 / 32.0 |

*Visual Studio Code, Node.js and Tailwind are unchanged; they were right all along.*

---

## 2. § 3.1.1 — the paragraph beginning "As outlined in Table 1"

**Current:**

> As outlined in Table 1, the development will utilize HTML5, Tailwind CSS, and JavaScript to
> create a responsive and mobile-adaptive user interface. Node.js and Express.js will serve as the
> back-end framework responsible for handling server-side logic such as booking management,
> financial tracking, and issue ticket processing.

**Replace with:**

> As outlined in Table 1, the development utilizes Vue 3 with TypeScript, built with Vite and
> styled with Tailwind CSS, to create a responsive and mobile-adaptive user interface. Node.js and
> Express.js, also written in TypeScript, serve as the back-end framework responsible for
> server-side logic such as booking management, financial tracking, and issue ticket processing.
> TypeScript was adopted on both sides so that the shape of a record is checked at compile time
> rather than discovered at run time, which matters in a system whose records are the owner's
> actual financial history.

---

## 3. § 3.1.1 — the paragraph beginning "MySQL will be used"

**Current:**

> MySQL will be used as the system's database management tool to store and organize structured
> data such as tenant records, transaction history, and system logs. Google Chrome will be the
> primary browser for development and testing…

**Replace with:**

> PostgreSQL, hosted on Supabase, is used as the system's database management tool to store and
> organize structured data such as tenant records, transaction history, and system logs.
> PostgreSQL was chosen over MySQL for its row-level security, which allows access rules to be
> enforced by the database itself rather than only by the application, and for generated columns,
> which let a derived figure be computed by the database and so kept consistent by construction.
> Google Chrome will be the primary browser for development and testing…

---

## 4. § 3 Definition of Terms — "Optional Online Payment Feature"

**This one also breaks a build check.** `npm run check:canon` fails on any tracked document that
describes the gateway with the word below. The manuscript is not in the repository, so the check
cannot see it — **but the rule is the group's, not the script's.**

**Current:**

> **Optional Online Payment Feature** — A supplementary system function that allows tenants to
> input or **simulate** digital payment transactions within the platform, without serving as the
> primary financial processing mechanism of the system.

**Replace with:**

> **Optional Online Payment Feature** — A supplementary system function that allows tenants to
> settle a bill through GCash using the Adyen payment gateway, without serving as the primary
> financial processing mechanism of the system. The integration is configured and operational
> against Adyen's developer environment; a payment made this way enters a pending state and is
> settled only after the administrator verifies it.

---

## 5. § 3.2.3 Development — the paragraph naming the stack again

**Current** (the same stack, restated):

> …implement the Hivelet system using HTML5, Tailwind CSS, and JavaScript for the front-end
> interface… The back-end is developed using Node.js and Express.js… An optional online payment
> feature is implemented as an optional integration to **simulate** or record digital payments…
> **MySQL** is used as the database management system…

**Replace with:**

> …implement the Hivelet system using Vue 3 with TypeScript for the front-end interface, ensuring
> responsiveness across devices. The back-end is developed using Node.js and Express.js in
> TypeScript to manage core functionalities such as booking processing, financial computations,
> and maintenance ticket handling. An optional online payment feature is implemented as an
> integration with the Adyen gateway, allowing a tenant to settle a bill through GCash without
> replacing the primary cash-based financial workflow. PostgreSQL, hosted on Supabase, is used as
> the database management system to store tenant records, transaction data, and system logs. The
> system is developed incrementally, following Agile principles, allowing continuous refinement
> based on feedback and testing results.

---

## 6. § 3.2.5 Deployment — **confirm this one before changing it**

**Current:**

> After successful testing, the Hivelet system is deployed to a university-managed server
> environment, where the system will be accessible through a designated URL endpoint…

**I do not know whether this is still the plan**, and unlike the five above it is not a question of
fact I can check — it is a decision. Today the system runs locally, with a `cloudflared` tunnel
used only when the Adyen webhook needs to reach a machine.

**Decide, then write whichever is true.** If the university server is still the destination, the
paragraph stands as written and only the tense needs checking. If it is not, say what the
arrangement actually is — a deployment section that describes an environment nobody used is the
one a panel is most likely to ask about, because it is the one they can verify by asking to see it.

---

## After the edits

- **Re-read § 3.2 for any remaining "will".** Chapter 3 was written in the future tense as a plan.
  Where the work is done, the past or present tense reads better and avoids a second class of
  disagreement with Chapter 4.
- **Check Chapter 2 and the Definition of Terms** for the same five terms; this sheet covers only
  the occurrences found in Chapter 3.
- **Nothing in Chapter 4 needs changing to match.** Chapter 4 already describes the system as
  built, which is why the gap showed up in the first place.
