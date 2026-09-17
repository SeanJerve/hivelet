# Four follow-up questions — one sitting, about ten minutes

**Prepared 2026-09-17.** Hivelet, Group 4, IT 124 Capstone 2.
**Follows** [`CLIENT_ANSWERS_2026-09-17.md`](CLIENT_ANSWERS_2026-09-17.md), which recorded ten
answers about how the business runs. Four of them need one more turn, and three small ones are
worth picking up while she is sitting down.

**Nothing in her data has been changed.** These are questions, not proposals.

> [!IMPORTANT]
> **Questions 1 to 4 were answered on 2026-09-17 — do not ask them again.** Her answers are
> recorded in [`CLIENT_ANSWERS_2026-09-17.md`](CLIENT_ANSWERS_2026-09-17.md) § Round two, and the
> findings they settle are § F-1, § F-2, § F-5 and § R4.
>
> **What is left on this sheet is the "three quick ones" block below** — the electricity rate and
> the meter-reading day, the mid-month occupant change, and the cash-payment question carried over
> from the earlier sheet. **Take those three next time**, plus the rent-first-or-water-first
> question if the team chooses option (a) in § F-5.
>
> **And one new question, ahead of all of them.** Question 2's answer turned out to conflict with
> what she confirmed on 2026-09-13, which is cited in live code with that date. **Ask this before
> anything else, and ask it exactly as written** in
> [`PHASE1_OPEN_DECISIONS_REGISTER.md`](docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md)
> § 1.5:
>
> *"When someone moves out and you repaint or repair the unit — is the money you use for that the
> same one month's rent they paid when they moved in? Or is it a separate amount you hold on top
> of that?"*
>
> **It blocks more work than anything else outstanding**, and one of its two answers means the
> ledger has never recorded money the business collects.

---

> [!IMPORTANT]
> **For whoever is asking — read this part, do not read it to her.**
>
> **Two of these were answered differently four days ago**, on 2026-09-13. That is not a problem
> and she has not contradicted herself — the earlier questions asked what the **policy** is, and
> these ask what **actually happens**. Those are different questions and can have different
> answers.
>
> **So ask the scenario, and do not mention the earlier answer.** If she is told "last time you
> said there was no grace period," she will agree with it, and the answer stops being evidence.
> The wording below is built to be answerable without knowing anything about the system.
>
> **Write what she says in her own words, next to the question. Never paraphrase a number.** If an
> answer disagrees with something written down, **record both** — the disagreement is the finding.
> Resolving it by picking one is how this project got eight business rules wrong.

---

## 1. When does rent actually become late?

**Read it as a story, not as a policy question.**

> *"Say a resident's rent is due on the 20th. They hand you the money on the 24th — four days
> after. Was that rent late?"*

☐ **Yes — it was late on the 21st.** I just do not chase them straight away.

☐ **No — it is not late yet.** They have about a week, so it is only late around the 27th.

☐ Something else: ______________________________________________

**Then, whichever she says:**

> *"And at what point do you start following it up — and what do you do?"*

Her words: ______________________________________________________________

______________________________________________________________________

> *"Does the system need to do anything at that point, or is that entirely between you and them?"*

☐ The system should remind them   ☐ I handle it myself   ☐ Both

*Why it is worth the two minutes: the first two boxes mean two different things in the system, and
we cannot tell which she means from "there is usually a week". One is her being patient about a
debt that already exists; the other is the debt not existing yet. **Only the second changes what
the system counts as unpaid.***

---

## 2. The deposit, and what the repairs cost

**She has already told us the rule** — the deposit covers the repairs when someone moves out, and
whatever is left goes back to them. *(Her example: ₱6,500 held, ₱6,400 of work, ₱100 returned.)*
**This is only about where those repair costs get written down.**

> *"When you repaint a unit or fix something after someone moves out — do you write that in your
> expenses book, the same as any other repair?"*

☐ Yes, it goes in the expenses book   ☐ No, it is kept separate   ☐ It depends: ____________

> *"And is the deposit money part of that, or do you keep the two apart in your head?"*

Her words: ______________________________________________________________

______________________________________________________________________

> *"How long after they leave do you usually settle up and give back what is left?"*

☐ Same week   ☐ Within the month   ☐ It varies: ____________________

*Why we are asking: we are about to add deposit settlement to the system, and this decides how it
is built. It is much cheaper to ask than to rebuild.*

---

## 3. When rent and water are paid separately

**She mentioned this happens sometimes**, depending on the due date.

> *"When someone pays you the rent but not the water yet — or the other way round — do you need
> to see on screen which of the two is still owed? Or is it enough to see that they still owe you
> something, and the amount?"*

☐ **Show me which one is still owed** — rent or water, separately

☐ **Just the amount is fine** — I know which is which

☐ Something else: ______________________________________________

*Why it is worth thirty seconds: today the two are added together into one figure, so a part
payment leaves "still owes ₱2,400" with nothing saying which half that is. Changing it is easy
now and awkward after the screens are rebuilt.*

---

## 4. What are you still doing on paper?

**This is the most valuable question on the sheet and it was not answered last time.** Ask it
open, and wait through the pause.

> *"Walk me through a month. What do you still write down, keep in a notebook, or do on your
> phone — that this system does not touch at all?"*

Her words: ______________________________________________________________

______________________________________________________________________

______________________________________________________________________

**If she says "nothing", try these one at a time — they are the usual hiding places:**

☐ the notebook or ledger she writes in before typing anything up
☐ messages with residents — who said they would pay, and when
☐ anything to do with the caretaker, repairs, or people she pays
☐ anything she gives to an accountant, or keeps for one
☐ the keys, the contracts, the IDs, the signed papers

**Then:** *"And of those — which one would you most want to stop doing by hand?"*

Her words: ______________________________________________________________

---

## While you have her — three quick ones

**These take under a minute together.**

**a. Electricity — she has confirmed it is not in the system, and each unit is metered and paid
separately. But the public website tells visitors two things nobody can check:**

> *"Your website says electricity is ₱12.50 per kilowatt-hour, and that meters are read on the
> 25th of the month. Are both of those still right?"*

Rate: ☐ ₱12.50 is right   ☐ It is ₱________   ☐ It varies — we should not print a figure

Reading day: ☐ the 25th   ☐ it is the ________   ☐ It varies — we should not print a date

*Worth asking even though electricity is out of scope: it is the only thing on this sheet that a
stranger reads, and nothing in the system will ever notice if it goes out of date.*

**b. When the number of people in a unit changes mid-month:**

> *"If someone's cousin moves in on the 10th, does the water charge change for that same month,
> or from the next one?"*

☐ Same month   ☐ From the next month   ☐ It depends: ____________________

**c. And the one left over from the last sheet:**

> *"When a resident hands you cash, would you like them to be able to tell the system they paid —
> so it waits for you to confirm it — or would you rather record every payment yourself?"*

☐ Let them tell me, I confirm   ☐ I record everything myself

---

## Not for her — what each answer changes

**Do not read this section aloud.** It is here so whoever records the answers knows what is
riding on them.

| | If she says… | What happens |
| :-- | :--- | :--- |
| **1** | *"late on the 21st"* | Nothing changes in billing. The week becomes a **notification threshold**, not a grace window. `grace_period_days` stays `0` |
| **1** | *"not late until the 27th"* | **BR-012 and OD-16 both reverse.** `grace_period_days` goes back to `7` in a **new** migration (`026`+) — never edit `016`. `isOverdue()` and every overdue count move with it |
| **2** | repairs go in the expenses book | The deposit settlement must **reference an expense row**, and the schema has to carry that link |
| **2** | kept separate | Settlement is self-contained — amount refunded, amount withheld, date — and no ledger link is needed |
| **3** | *"show me which"* | Rent and water need modelling as separate components, or as two bills. **Settle before the redesign fixes a layout around the current shape** |
| **4** | anything at all | It is scope we do not know about. Nothing is built off the answer — it is recorded, then sized |
| **a** | either figure is wrong | The public site has been telling prospective residents the wrong thing, and no check can ever catch it |

**Then:** record every answer into `CLIENT_ANSWERS_2026-09-17.md` beside the matching finding —
her words, her numbers, and **both readings if anything disagrees with what is written down.**

**Deliberately not on this sheet:** the 50% column. She has already said it does nothing and is
purely historical, which is the part that affects the system. **The rest of what she said about it
is a team decision about locked wording, not a question for her** — see `CLIENT_ANSWERS_2026-09-17.md`
§ F-3, and CLAUDE.md rule 4. Do not add it to this sheet.

**Also not on this sheet:** the seven receipts and the five accounting habits in
`CLIENT_MEETING_QUESTIONS.md` §§ 1–2. Those are a longer sitting with her book open, and mixing
them in here would turn ten minutes into an hour.
