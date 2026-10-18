# The defense presentation: what to say on each slide

A speaking script for `HIVELET DEFENSE SLIDES.pptx` (20 slides), about **15 minutes**, then the live
demonstration (`DEMO_SCRIPT.md`, about 8 minutes) and questions. Every sentence uses only what the
paper says; the section to open if the panel asks is in brackets after each slide.

**Do not read it word for word.** Learn what each slide must land (the bold line), say it in your
own words, and keep the numbers exact. Practise with a timer twice; most teams run long on slides
2 to 5 and short on 13 to 17, which is where the marks are.

**Four speakers, one block each.** Write your names in before the day. A clean hand-over sounds
like the next speaker's first sentence, not "I'll pass it to...".

| Block | Slides | About | Speaker |
| :--- | :--- | :--- | :--- |
| A. The problem | 1 to 6 | 4 min | ______ |
| B. The build | 7 to 12 | 4 min | ______ |
| C. The proof | 13 to 17 | 5 min | ______ |
| D. The close | 18 to 20, then the demo | 2 min + demo | ______ |

---

## Block A. The problem (slides 1 to 6)

**Slide 1. Title** (20 s)
"Good morning. We are Group 4. Our capstone is Hivelet, a web-based apartment management system
for the Fe Galang Da Silva Boarding House: 33 units in Legazpi City, 32 of them occupied, and it runs
on the landlady's real records."
*Fill in slide 1's square brackets before the day.*

**Slide 2. Before Hivelet** (50 s)
**Land: four areas, four separate records, and some with no record at all.**
Walk the figure left to right: income and expenses in a workbook on a USB flash drive, the only copy;
invoices in a paper book and rent in cash; repairs by message or in person, never recorded; inquiries
through Facebook, referrals, texts and walk-ins, with no record of which unit. [4.1.1, Figure 4-1]
*Likely question: "How did you learn this?" Interviews with the landlady from February 2026,
observation, her workbook, and two rounds of written questions (17 Sep and 12 Oct). [3.2.1]*

**Slide 3. What her own records showed** (45 s)
**Land: the problem was not the lack of a digital tool; nothing connected one record to another.**
"When we transferred her workbook, 937 income rows and 1,327 expense allocations, 402 of the 937
rows, 43 percent, had no anniversary date and no deposit, and five invoice numbers had each been
used for two payments. We kept them exactly as she wrote them; the system reports them, it does not
correct them." [4.1.1]

**Slide 4. Objectives** (40 s)
Read the general objective once, then the four specific ones in a breath each. "Our conclusions at the
end answer these four, in this order." [1.2]

**Slide 5. Related studies** (50 s)
**Land: each study solves one part; none integrates them for a small, cash-based boarding house.**
Name two only: Canlas et al. (2026), the closest in method and respondents (Agile, ISO/IEC 25010,
tenants, administrators and IT professionals), and Puspasari et al. (2025), whose system only the
manager can use, so tenants cannot see their bills or report anything. [2.1.6, 2.2]
*Likely question: "What is your contribution?" The integration, for this setting, measured as well
as rated. [`STUDY_GUIDE_REFERENCES.md`]*

**Slide 6. Conceptual framework** (30 s)
"Input, process, output: the objectives, literature and her workflows go in; the Agile cycle builds
the modules; the system, its reports, the evaluation and the manuscript come out, with feedback into
the next iteration." [2.3, Figure 2-2]
*Hand-over to B: "To build it, we worked in three iterations."*

---

## Block B. The build (slides 7 to 12)

**Slide 7. Agile in three iterations** (50 s)
**Land: iteration 2 is where we checked our own work.**
"Construction, 24 July to 28 August: a working system and her records transferred. Verification,
12 to 14 September: we checked the system and its documents against each other and corrected 22
recorded errors. Consolidation, from 15 September: her answers, real users, testing and the
evaluation." [4.2.1, Appendix M Table M-19]
*Likely question: "Did AI write it?" Yes, much of the code, at our direction; we reviewed and
verified it, and iteration 2 exists because we did not trust it unchecked. [Q&A guide, Section 4]*

**Slide 8. How it is built** (40 s)
**Land: the browser never talks to the database.**
"A Vue Progressive Web App talks only to our Express API on Vercel; only the API reads or writes
PostgreSQL on Supabase, and row-level security is on every table. For GCash, the payment details go
from Adyen's own form straight to Adyen; they never pass through our server." [4.2.1, Figure 4-2]

**Slide 9. Six features** (60 s)
One sentence each, in the objective's order: tenants and rooms (every rate change recorded); booking
and inquiries (a thread, no account needed); financial tracking (her own ledger layout, invoice
numbers, Excel); optional GCash (counts only after she verifies it); repairs and notifications;
roles and the PWA (each person sees only their part; installs from the browser). [4.2.2 to 4.2.7]

**Slide 10. What a visitor and a tenant see** (30 s)
"On the left, the public catalogue: a vacant unit, its rate and floor plan, and the inquiry form. On
the right, the tenant's phone: what is due, and Pay with GCash. The names
and payments in our figures are samples; the units and rates are real." [Figures 4-8, 4-11]

**Slide 11. What the owner sees** (30 s)
"Her ledger, in her workbook's own layout, and the repair board from request to done." [Figures
4-9, 4-10]

**Slide 12. Security** (40 s)
**Land: protections at every layer, and two weaknesses we name ourselves.**
bcrypt hashes, a 15-minute lock after five wrong passwords, breached passwords refused, one
permission matrix, row-level security, an audit trail the app cannot erase, and every gateway
message checked by its signature. "Two weaknesses remain, and we recommend fixing them before real
money moves: the sign-in token in browser storage, and no second sign-in factor." [4.2.6, 4.4.4]
*Hand-over to C: "Then we tested it at three levels."*

---

## Block C. The proof (slides 13 to 17)

**Slide 13. Pilot testing** (60 s)
**Land: 82 of 83 tests passed, 98.8 percent, with no critical defect; the standard is 90.**
Read the table's four rows. "The one failure: with the connection cut, the Overview showed ₱0
where the design shows a dash, so a missing figure is never read as zero. Fixed, and it passed on the
owner's laptop on 13 October." Then: "35 defects across all activities, 32 resolved, 3 accepted as
low risk." [Table 4-12, Table 4-20]
*Likely question: "If every suite passed, how did you find bugs?" The screen-versus-database audit:
six defects every suite missed. [4.3.3]*

**Slide 14. Fast, and safe when the connection is not** (50 s)
The slowest screen, 3.05 seconds, the tenant portal's first load on a phone; 0 of 1,085 requests
failed with 12 simulated users; it opens offline at 10 of 10 addresses; and when the same receipt is
sent five times at once, one is saved. "Simulated users, not people: we say so in the paper."
[4.3.5, 4.3.6]

**Slide 15. Real users** (50 s)
**Land: all 34 tenant tasks completed, 31 without help.**
"The owner and three tenants used it on their own devices on 30 September. Median 60 seconds a task.
Help was needed only at the start: the first sign-in and finding their unit and rent, which is
exactly what Chapter 5 recommends showing new tenants first." [4.3.7, Table 4-11]

**Slide 16. The evaluation** (50 s)
**Land: 4.53, Very High Quality; every characteristic at least High Quality.**
"Nine respondents: the owner, three tenants, a prospective tenant and four technical evaluators.
Portability highest at 4.83, Functional Suitability 4.77; the lowest two, Usability 4.37 and
Maintainability 4.15, are Very High and High Quality. We used the mean of the group means, so one owner is not outweighed by
three tenants." [Table 4-17, 4.4.2]
*Likely question: "Nine is very few." We claim it only for these nine, and every characteristic was
also measured. [4.4.1, 4.4.5]*

**Slide 17. Measured and rated agree** (50 s)
**Land: all eight agree.**
"27 of the 31 sub-characteristics were measured and 25 rated. Usability: nine tasks in ten were done without
help, and the owner's lower rating for learning alone shows where a first-timer needs help. Maintainability rests on the code: the
checks pass on every change, but three database calls in four sit inside the request handlers. We
made 51 changes in response, including all 14 of the technical evaluators' comments by 5 October."
[4.4.3, 4.4.5, 4.4.6]
*Hand-over to D: "So, the four objectives."*

---

## Block D. The close (slides 18 to 20)

**Slide 18. Conclusions** (45 s)
One line per objective, in order: every gap traced to a module; all six features in use on her real
records, in her own layout; 82 of 83 tests passed with no critical defect; Very High Quality, 4.53,
with 51 optimizations. "All four objectives were achieved." [5.2]

**Slide 19. Recommendations** (40 s)
Grouped by who acts: the owner (keep the system's receipts up to date; keep backups); the system
(Adyen live with refunds, a protected sign-in cookie and second factor, automated browser tests,
faster first loads on phones, stronger Maintainability and Usability); future researchers (test
against real data; evaluate longer with every tenant). [5.3]

**Slide 20. Thank you** (10 s)
"Thank you. We'd like to show it working." Then switch to `DEMO_SCRIPT.md`: the test tenant on unit
PH only, and **reject** the GCash payment, never verify it.

---

## If time is short

Cut in this order, never the proof: slide 6 to one sentence; slides 10 and 11 to one sentence each;
slide 9 to "six features, each one the objective names". Never cut slides 13, 15, 16 or 18.

## If the projector or the internet fails

The slides are in the .pptx on the laptop; keep the film's MP4 file on the laptop too (it is not in
the repository), and the figures are in `CLAUDE MANUSCRIPT/images/`. Say what happened in one sentence and continue with the figures.
