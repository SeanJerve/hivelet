# Client confirmation — two things to put to Mrs. Da Silva

**Raised 2026-09-19.** Both of these are on the **public pages**, where a prospective resident
reads them before they ring. Neither can be settled from inside the system.

> [!IMPORTANT]
> **Nothing here is a blocker.** The pages already say something safe: where a figure could not
> be stood behind, it was removed rather than guessed at. These questions are about putting the
> figures **back**, correctly — not about unblocking a build.

**How to use this sheet.** Read the question aloud, tick the box, write the number in the blank.
Then bring it back and the answers go into the system, not into page copy — the difference
matters and is explained under each one.

---

## 1. Electricity — confirm the wording, not the rate

**She has already answered the substance.** On 2026-09-17 (`CLIENT_ANSWERS_2026-09-17.md` Q5):

> *"No, the electricity is not a feature or a part of the scope in our system. Every unit has its
> own electric meter which is paid separately by each tenant, and also is not recorded in the
> income or even expenses."*

**So this is a confirmation, not a new question.** That answer was **relayed and dictated**, not
minuted at the table — the answers file says so itself — and it is now being used to change what
the public site tells people about money. That is worth thirty seconds of her time.

### What the site used to say

> *"Each of the 33 rentable units is fitted with an individual electric submeter. Readings are
> recorded on the **25th** of every month and billed at actual consumption rate (**₱12.50 /
> kWh**)."*

**Both figures existed nowhere but on that page.** `system_settings` holds five keys and none is
an electricity rate. The database has **no** meter, reading or utility table at all — checked
against `information_schema.tables`, not assumed. And the sentence says the boarding house bills
for electricity, which by her own answer it does not.

### What it says now

> *"Every unit has its own electric meter and you pay for your own electricity separately. It is
> not part of your rent, and the boarding house does not bill you for it."*

### The question

> **"A tenant pays the electric company for their own meter directly — you never collect it or
> put it on their bill. Is that right?"**

☐ **Yes, that is right.** *(Nothing further. The wording above stands.)*

☐ **No — I do collect it.** Then two more:
&nbsp;&nbsp;&nbsp;&nbsp;What do you charge per unit of electricity? **₱______ / kWh**
&nbsp;&nbsp;&nbsp;&nbsp;When do you read the meters? **the ______ of the month**

☐ Something else: ______________________________________________

> **If she does collect it,** the rate belongs in `system_settings` beside the water rate — not
> typed onto the page. That is the whole lesson of this one: the water rate is configured, so a
> check catches it when it drifts; ₱12.50 was page copy, so nothing ever could.

---

## 2. The deposit — one question, and it is the only one that matters

**This is `OD-04`, and it is contested.** She has given two different answers four days apart.
**Neither outranks the other, and picking one is how eight business rules were recorded wrongly on
this project.**

| When | What she said |
| :--- | :--- |
| **2026-09-13** | The move-in sum is **advance rent**, and *"this business collects no separate damage or security sum."* Cited in live code at `admin.ts:800` with that date |
| **2026-09-17** | The same money is **held**: *"the deposit is usually used to fix and maintain the apartment when the tenant leaves… whatever is left of that entire expenses will be refunded to the tenant"* — ₱6,500 held, ₱6,400 of repairs, ₱100 returned |

### The question that separates them

> **"When someone moves out and you repaint or repair the unit — is the money you use for that the
> same one month's rent they paid when they moved in? Or is it a separate amount you hold on top
> of that?"**

☐ **The same money.** The one month's rent is held, repairs come out of it, the remainder is
returned.
*(Then both her answers were true — the first named the sum, the second described its fate — and
**OD-04 closes as a refundable deposit with a settlement step.**)*

☐ **A separate amount**, on top of the month's rent.
*(Then there are **two** sums and the system models only one. That is a larger gap than OD-04 was
filed as, and `room_assignments` needs a second figure before any settlement columns make sense.)*

☐ Something else: ______________________________________________

### Why it cannot be worked out without asking

Her ₱6,500 example is close to one month's rent on many units, which points at one sum — **but
"close to" is exactly the kind of resemblance this project has been wrong about before.**

Her own income report carries the deposit as **Column 12**, equal to the rent at move-in, and
**excludes it from Column 10, Remitted Amount**. So her sheet records the sum **without counting
it as income** — which is how a held deposit behaves, and is also how a memo column behaves.
**Neither reading is excluded by the evidence.**

### Already answered, so do not ask again

**2026-09-18:** *"When we give back, it is stated in the expenses, but is upon written by the
landlady. So it is not part of the system that is super technical."* The refund is recorded, as an
ordinary expense entry, by hand. **This shrinks OD-04 from a schema question to a naming one.**

---

## What the public page says until she answers

Nothing that could be wrong. The move-in answer states only what is uncontested and what the
system actually records under **BR-039**:

> *"A valid government or student ID, the resident registration form, and one month of rent up
> front. Ask Mrs. Da Silva to confirm the total before you come — what is held and how it is
> settled when you leave is something she will explain herself."*

**It previously said "1 month advance rent and 1 month security deposit"** — two months of
somebody's money, and a total that matches **neither** of her answers. Both describe one month.

---

## Where these came from

| | |
| :--- | :--- |
| `BLOCKED_FOR_SEAN.md` B-12 | The electricity rate and reading day |
| `BLOCKED_FOR_SEAN.md` B-13 | The move-in total, and OD-04 |
| `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5 | OD-04 in full, with both answers and the evidence |
| `CLIENT_MEETING_QUESTIONS.md` § 3 | The original four public-claim checks |
| `CLIENT_ANSWERS_2026-09-17.md` Q5, F-2 | Her electricity answer, and the deposit one |
