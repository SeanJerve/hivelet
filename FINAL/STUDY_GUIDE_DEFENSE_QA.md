# Study guide: the defense questions, and the answers

For the whole team, before the defense. These are the questions a panel is most likely to ask about
Hivelet, each with a short answer you can say aloud and **where in the paper the proof is**, so you can
open it on the spot. Every figure here is copied from the final chapters in this folder (as built on
13 October 2026); if a chapter changes, the chapter wins.

The other study guides cover the rest: `STUDY_GUIDE_TEAM_REVIEWER.md` (the whole capstone in one
sitting, the numbers to memorize, and a tour of every screen), `STUDY_GUIDE_CODE.md` (where each
feature is in the code), and `STUDY_GUIDE_REFERENCES.md` (every source, and what it found).

---

## How to answer any question

1. **Answer first, in one sentence.** "Yes, a tenant sees only their own records."
2. **Then the evidence, with one number.** "The server checks every one of the 55 routes against one
   permission matrix, and the database itself refuses other rows."
3. **Then where it is.** "Chapter 4, Section 4.2.6, Table 4-7."

**If you do not know, say so, then say what you do know.** "We did not measure that. What we
measured was..." A panel trusts a team that names its limits, and the paper names every one of them.
Never guess a number. Never claim something the paper does not say.

**Pass the question to the right person.** Agree before the day who takes each area below (the
problem and the paper, the system and code, testing and evaluation, design and screens).

---

## 1. The problem and the client

**What problem does Hivelet solve?**
The boarding house's records were not connected. Income and expenses were typed into a workbook on a
USB flash drive, invoices were written in a paper book, rent was paid in cash, and repairs and
inquiries arrived by message or in person and left no record. Hivelet puts all four in one system.
*Chapter 1, Section 1.1; Chapter 4, Table 4-1 and Figure 4-1.*

**How do you know that was the problem, and not just the lack of a computer?**
Her own records showed it. When we transferred her workbook (937 income rows and 1,327 expense
allocations), 402 of the 937 income rows (43%) had no anniversary date and no deposit, and five invoice
numbers had each been used for two different payments. The records were already digital; they were
not connected. *Section 4.1.1; Chapter 5, conclusion 1.*

**Who is the client?**
The Fe Galang Da Silva Boarding House, 33 units in five clusters at 32 Sampaguita Street, Barangay 4
Sagpon, Old Albay District, Legazpi City. The landlady runs it day to day on behalf of its owner and is
the system's only administrator; the paper calls her "the owner" in that role. *Section 1.4;
Chapter 3, Participants.*

**How many units, and how many are occupied?**
33 units: Boarding House 22, Back Apartment 5, Front Apartment 3, Penthouse 1 and Linda 2. 32 are
occupied. *Section 4.1.*

> **Trap:** if a panelist opens the live site, the public page may show **no vacancy (33 of 33)**. That
> is because the evaluation account, loydtest, is the tenant of PH, the one vacant unit, for the
> demonstration. Say so plainly: "PH is held by our test account for the demo; the property has 32
> occupied, and we move the test account out after the defense." (`DEMO_SCRIPT.md`, last section.)

**How did you gather the requirements?**
Interviews with the landlady from February 2026, observation, a review of her income and expense
workbook, and two rounds of written questions answered on 17 September and 12 October 2026.
*Section 3.2.1.*

**How many requirements did you end with?**
44 functional requirements and 49 business rules, each traced in a traceability matrix. Graded against
the code on 16 September: 25 implemented as worded, 15 in part, 1 in the interface only, 3 not as
worded. Plus ten non-functional requirements. *Section 4.1.2, Tables 4-2 and 4-3.*

**Why only 25 of 44 "as worded"?**
Because we graded strictly against the exact wording, not against whether the need was met. The three
"not as worded" describe things the owner sees in another form. Being strict is why the number is
honest. *Section 4.1.2.*

---

## 2. Objectives, scope and limits

**What are your objectives?**
General: design, develop and evaluate Hivelet, a web-based apartment management system that improves
administrative workflow integration, communication and operational control. Specific: (1) analyze the
existing practices and set requirements; (2) develop six features; (3) pilot test it; (4) evaluate and
optimize it on ISO/IEC 25010. *Section 1.2.*

**Did you meet them?**
All four, each with evidence: every gap traced to a module (Table 4-2); all six features in use on
her real records; 82 of 83 tests passed (98.8%); rated 4.53, Very High Quality, with 51 changes made in
response. *Chapter 5, Section 5.2.*

**What does the system NOT do?**
It needs the internet to save, pay or sync (offline it only shows what was last loaded). Online payment
excludes refunds (made from Adyen's own dashboard), automated bank reconciliation and direct banking
integration. Electricity is outside the system: each unit has its own meter and the tenant pays the
electric company directly. *Section 1.4; Section 4.2.4.*

**Is GCash the main way to pay?**
No. Cash stays the main way; GCash through Adyen is optional. A GCash payment is recorded as Pending
Verification and counts only after the owner verifies it. *Section 1.4; Section 4.2.4.*

---

## 3. Related literature and the gap

**What gap does your study fill?**
Existing systems either target large properties or solve one function at a time: payments, booking,
tenants or maintenance. No study we found integrated booking, billing and receipts, tenant accounts,
repair requests and online payment for one small, cash-based boarding house. *Section 2.2.*

**Which study is closest to yours?**
Canlas et al. (2026), FixHub: a Philippine dormitory maintenance system, built with Agile and rated on
ISO/IEC 25010 by tenants, administrators and IT professionals. Our 4.53 is in the range they report.
*Sections 2.1.4 and 4.4.3.*

**Do you have local studies?**
Yes: Magno et al. (2024), Pavia et al. (2022, Bicol College), Pernate et al. (2025, Ormoc City),
Mangca (2023, Surigao City), Caparos et al. (2025, Region XII), Canlas et al. (2026), and Mia et al.
(2024) on Philippine small enterprises. *`STUDY_GUIDE_REFERENCES.md`.*

**What is your conceptual framework?**
Input-Process-Output (Figure 2-2). Input: the objectives, the literature, interviews and the owner's
workflows. Process: the Agile cycle and the modules built in it. Output: the system, its reports, the
evaluation results, the manuscript and the user manual, with feedback across all three. *Section 2.3.*

**How does your result agree or disagree with the literature?**
It agrees with Encarnacion et al. (2025) and Setty (2022) that one ledger improves oversight, and with
Saputra et al. (2025) that traceable requests improve accountability. It **qualifies** Magno et al.
(2024): digitizing alone did not make records agree, because our records were already in one database
and six screens still disagreed with it until the audit. *Sections 4.2.4, 4.2.5, 4.3.3.*

---

## 4. Method

**Why Agile and not Waterfall?**
The owner's needs changed as she used the system, and Agile let us show her working screens on her own
device each iteration and change them. *Section 3.2.*

**What were the iterations?**
Three. Construction, 24 July to 28 August 2026 (a working system and her records transferred).
Verification, 12 to 14 September (the system and documents checked against each other; 22 recorded
errors corrected). Consolidation, 15 September to the defense (her answers, real users, testing and
evaluation). *Section 4.2.1; Appendix M, Table M-19.*

**Why no Figma or separate design tool?**
The screens were prototyped directly in Vue and Tailwind so the landlady and tenants could try them on
their own phones with real data, and each prototype was reviewed with the landlady on her device.
*Sections 3.1.1 and 3.2.2.*

**Did an AI write your system?**
An AI coding assistant generated much of the code at our direction; we reviewed it, directed every
change and verified it. The verification is the point: 21 automated check suites, a screen-by-screen
comparison with the live database, the owner's walkthrough and the tenants' tasks. The AI-use statement
is ready for wherever the adviser says it goes. *Sections 3.1.1, 4.3.1, 4.3.3; `STUDY_GUIDE_CODE.md`,
Section 9.*

**Which testing standard did you follow?**
ISO/IEC/IEEE 29119-1 for the test levels (unit and integration, system, acceptance), and the ISO/IEC
25000 (SQuaRE) series for quality: the 25010 model, 25023 and 25022 measures, and the 25040 evaluation
process. *Sections 3.2.4 and 3.3.*

---

## 5. The system as built

**What is the architecture?**
A Vue 3 Progressive Web App in the browser talks only to an Express API on Vercel; only the API reads
or writes the PostgreSQL database on Supabase, which has row-level security on every table. Payments go
from Adyen's own form to Adyen directly. *Section 4.2.1, Figure 4-2.*

**Why these technologies?**
TypeScript on both sides catches wrong-shaped records before the code runs, which matters for real
money. PostgreSQL gives row-level security (the database itself enforces who sees what) and triggers
(every rate change is recorded whatever made it). *Section 3.1.1.*

**Why a PWA and not a native app?**
One code base serves the owner's laptop, Android and iPhone; it installs from the browser with no app
store; and the installed files are about 1.2 MB. *Section 4.2.7.*

**How do you install it?**
Open hivelet.vercel.app and choose **Add to Home Screen** (Safari) or **Install app / Add to Home
screen** (Chrome). It opens in its own window like an app. *Section 4.2.7.*

**Does it work offline?**
It opens offline and shows a read-only copy of what the person last loaded, with the time it was saved.
Paying and recording need a connection, and the copy is deleted at sign-out. *Sections 1.4 and 4.2.7.*

**What are the six features?**
Tenant and room management; booking and inquiries; financial tracking with optional GCash; maintenance
tickets and notifications; role-based access control; PWA support. *Sections 4.2.2 to 4.2.7.*

**How does a visitor inquire without an account?**
They send an inquiry about a specific unit and receive a private link and a short reference code;
either one (the code with their phone number) opens the conversation, where the owner's answer appears
and they can write back. The link's secret is stored only hashed. *Section 4.2.3.*

**How many tables does the database have? Your ERD says 21 and Appendix N says 24.**
Both are right. The ERD (Figure 4-6, drawn from the catalogue on 5 October) shows the 21 working
tables with 37 foreign keys. Appendix N lists all 24, which adds three backup tables kept from data
corrections. *Section 4.2.1; Appendix N.*

**Which rules are enforced by the database itself?**
One unit cannot have two active tenancies; one invoice number cannot be used twice for the same unit
and month; a gateway reference cannot be recorded twice; the 50% Share and the remitted amount are
computed columns no code can set. *Section 4.2.1.*

**How is the water fee computed?**
₱200 per occupant per month: two occupants, ₱400. *Table 4-6, BR-014.*

**What is the 50% Share?**
Say exactly this: **"A system-computed figure equal to half that row's Rent Amount, kept for ledger
parity with the owner's historical spreadsheet."** Example: ₱8,500 rent, ₱4,250. Do not add who it is
for or what it is used for; the system only reproduces her spreadsheet's column. *Table 4-6, BR-035.*

**What is the remitted amount?**
Rent plus water: ₱8,500 + ₱400 = ₱8,900. *Table 4-6, BR-038.*

**When is a bill overdue?**
From the day after its due date, with no grace period, as the owner confirmed. Bills are raised when
needed rather than by a scheduler. *Table 4-6; Section 4.1.2.*

**Does the rent go up automatically each year?**
No. The owner sets every rate by hand; the system keeps the history of each change (a database trigger
records the old rate, the new one, the date and who changed it). *Sections 4.1.2 and 4.2.2.*

**Why do some tenants show "move-in date not recorded"?**
Her workbook never recorded the move-in date of the current tenancies, so the system says so rather
than invent one. *Sections 4.1.2 and 4.2.2.*

**Why can the owner not edit a move-in date?**
On purpose, for now: the move-in date decides which months a tenant is shown owing and which tenancy a
receipt is credited to, so changing it can move receipts between tenants. It is safe to add once those
two rules are decided. (`QUESTIONS_TO_FINALIZE.md`, P8.)

**What happens when a payment is entered twice?**
The form warns before saving that the unit already has a payment for that period and shows it. If two
identical saves arrive at the same instant, the database keeps one and refuses the other. *Sections
4.2.4 and 4.3.6.*

**Can a receipt be deleted?**
No, it can be voided: it is kept, marked with when, by whom and why, and drops out of the totals.
*Table 4-5.*

**What does a tenant see?**
Their own unit, rent and amount due, their payments month by month (only receipts the owner verified
count as paid; a month with no receipt says "Not entered", never "owed"), their deposit, their repair
requests, notifications and details. *Sections 4.2.2, 4.2.4, 4.2.7; Figure 4-11.*

**Why "Not entered" instead of "Unpaid"?**
Because the records alone cannot tell an unpaid month from one the owner has not entered yet. Saying
"owed" when it might be paid would be wrong in front of the tenant. *Section 4.2.4.*

**How do repairs work?**
A tenant sends a request with a title, description, priority and a photo; the owner moves it through
dispatch, in progress and done; only the owner closes it, and the tenant is notified. The owner can
also log a repair she was told about in person, even for an empty unit. *Section 4.2.5.*

**Can the owner export her records?**
Yes. Both ledgers download as Excel files in her own workbook's layout, and 490 of 490 reconciliation
checks matched the export to the database. *Sections 4.2.4 and 4.3.1.*

---

## 6. Security and privacy

**Can a tenant see another tenant's records?**
No. Every role's rights come from one permission matrix checked against all 55 administrator and tenant
routes on every verification run, and row-level security is on for every table. In testing, another
tenant's repair answered "not found". *Sections 4.2.6 and 4.4.4; Table 4-7.*

**How are passwords stored?**
As bcrypt hashes, each with its own salt. A new password needs ten characters, a letter and a number,
and is refused if it appears in a public list of breached passwords. *Section 4.2.6.*

**What stops someone guessing passwords?**
The account locks after five failed sign-ins, for 15 minutes. *Section 4.2.6; Section 4.4.4.*

**Can the owner's changes be traced?**
Every administrator action is written to an audit trail the application cannot edit, delete or empty.
*Section 4.2.6.*

**Did anyone outside test the security?**
Three passive external scanners graded the site A+ (Qualys SSL Labs, Mozilla HTTP Observatory and
securityheaders.com); twelve checks by hand passed; a review of all 71 request handlers on 2 October
found no high-severity problem; Supabase's security advisor raised no warning on 5 October.
*Section 4.4.4.*

**What weaknesses remain?**
Two, named in the paper: the sign-in token is kept in the browser's storage, where an injected script
could read it (the enforced Content Security Policy and no raw HTML on screens stand against that), and
there is no second sign-in factor, even for the administrator. Both are recommendation 3. *Section
4.4.4; Chapter 5.*

**How did you protect the respondents' and tenants' privacy?**
Under the Data Privacy Act of 2012: voluntary participation, written consent, each tenant used only
their own account with an individual starting password, names removed before analysis, and names and
amounts hidden in every figure. *Section 3.4.*

**Why do the figures in Chapter 4 use sample names?**
So that no real tenant's name or payment appears in the paper. The units, rates and statuses are the
property's own; names, payments, expenses and repairs in those figures are samples. *Section 4.2.*

---

## 7. Testing

**How many tests, and how many passed?**
83 executed, 82 passed (98.8%), above the course standard of 90%, with no critical defect. *Table 4-12.*

| Level | Activity | Executed | Passed |
| :--- | :--- | --: | --: |
| Unit and integration | Automated check suites, 29 Sep 2026 | 20 | 20 |
| System | The owner's functional walkthrough, 30 Sep | 25 | 24 |
| Acceptance | Tenant tasks, 30 Sep | 34 | 34 |
| Acceptance | Simultaneous use by the owner and tenants | 4 | 4 |

**What was the one failure?**
Step 23b of the walkthrough: with the connection cut, the Overview showed ₱0 where the design requires
"—", so a missing figure is never read as a zero balance. Fixed, and it passed when re-tested on the
owner's laptop on 13 October. *Section 4.3.4.*

**What do the automated suites check?**
Every endpoint and the separation of roles (78 of 78), the ledger against the business rules, the Excel
exports against the database (490 of 490), the gateway's message signatures (73 of 73), that separate
records agree (30 of 30), the billing arithmetic, and that no screen shows stored or empty data as a
live figure. They run against the live system without writing to it. *Section 4.3.1, Table 4-8.*

**Why 20 suites in the table but 21 elsewhere?**
20 ran on 29 September for the results in Table 4-8. A twenty-first, for simultaneous saves, was added
on 12 October; it passes 15 checks, and each of four deliberate faults made it fail. *Section 4.3.6.*

**If every suite passed, how did you find the six screen defects?**
By comparing every figure on every screen with a read-only query of the live database. That found six
defects the suites had missed, for example a payment history that showed only online payments. The
lesson: passing checks show that what was tested is correct, not that everything is. *Section 4.3.3,
Table 4-9.*

**Was the GCash payment really tested?**
Yes, end to end on 26 September, from Adyen's authorization to the owner's verification queue, after
Adyen support replaced a misconfigured acquirer account (Case 08657379). The Adyen account is still
the test account, so no real money moves; going live is recommendation 3. *Section 4.3.2.*

**How fast is it?**
Every screen was usable within about three seconds on a phone and a little over two on a laptop. The
slowest was the tenant portal's first load, 3.05 seconds on an iPhone 15 over mobile data. *Section
4.3.5, Table 4-10.*

**Did you load test it?**
Yes, with simulated users, not people: 12 at once on the public pages and 6 on the owner's records,
each pausing like a reader. None of the 1,085 and 285 requests failed, and nineteen in twenty were
answered in under a second. *Section 4.3.6.*

**What about a weak connection?**
A page stops waiting after 25 seconds and says it could not reach the server; a save stops after 45
seconds and says it cannot tell whether the save arrived, so the person checks before sending again.
*Section 4.3.6.*

**Is it accessible?**
Scanned with axe-core against WCAG A and AA: no violation on the public pages at phone and computer
widths, nor on the owner's eight screens; 76 scans of 19 screens in all, once one defect on three
screens was fixed. PageSpeed gave the public page 100 for accessibility. *Sections 4.3.5, 4.3.6,
4.4.3.*

**How did real users do?**
The owner and three tenants used the live system on 30 September on their own devices. Tenants
completed all 34 task attempts, 31 without help (91%), with a median of 60 seconds a task. Help was
needed only at the start: the first sign-in and finding their unit and rent. *Section 4.3.7,
Table 4-11.*

**Why only three tenants?**
Purposive and convenience sampling of tenants at home that evening, chosen to cover cash payers, less
app-confident users, Android and iPhone and more than one cluster; and Nielsen and Landauer (1993)
show each additional tester finds fewer new usability problems. *Section 3.3, Participants.*

**Did two people saving at the same time cause problems?**
Before the fix, the same receipt sent twice or five times at once was saved every time, and two GCash
checkouts could open on one bill. After the fix (rules in the database), one is saved and the others
refused. One limit remains: receipts with no invoice number, or two acknowledgement receipts, sent at
the same instant are both saved. *Section 4.3.6.*

**How many defects did you find in total?**
35 across the testing activities, 32 resolved and 3 accepted as low risk; none critical. One more,
found in an audit of the live records on 13 October (two tenants shown owing a month they had paid),
was corrected the same day and is reported separately in Appendix M, Table M-27. *Table 4-20.*

---

## 8. The ISO/IEC 25010 evaluation

**What was the overall result?**
4.53 out of 5, Very High Quality, with every characteristic at least High Quality. *Table 4-17.*

| Characteristic | Mean | Rank |
| :--- | --: | --: |
| Portability | 4.89 | 1 |
| Functional Suitability | 4.86 | 2 |
| Security | 4.70 | 3 |
| Compatibility | 4.67 | 4 |
| Reliability | 4.62 | 5 |
| Performance Efficiency | 4.42 | 6 |
| Usability | 4.12 | 7 |
| Maintainability | 4.00 | 8 |

**Who rated it?**
Six people: the owner, three tenants, one technical evaluator (an IT professional in software quality
assurance) and one prospective tenant. No member of the team. *Tables 4-14 and 4-15.*

**Six respondents is very few. How can you claim Very High Quality?**
We claim it only for these six people, and the paper says so: the results describe how they rated the
system, not a population. What strengthens it is that every characteristic was also **measured**, and
the measurements agree with the ratings on seven of the eight. *Sections 4.4.1 and 4.4.5; Chapter 5,
conclusion 4.*

**How did you compute the means?**
Weighted mean per item, WM = Σ(f × w) / N; each characteristic's composite is the mean of its group
means, so one owner is not outweighed by three tenants on functions only she uses; the overall is the
mean of the eight composites. Averaging every response together gives 4.55 instead, with the same
interpretation and ranking. *Section 3.3; Section 4.4.2, Table 4-16.*

**Why did each group rate different characteristics?**
Each rated only what it can judge: tenants did not rate Security or Maintainability, prospective
tenants rated neither, and only the technical evaluator rated Maintainability. *Section 3.3.*

**Why is Usability the second lowest?**
The owner gave 3 to telling what each screen is for and learning without help, and the technical
evaluator gave 3 to all five items, before the fourteen changes made for that evaluator's group. The
measurement says tasks can be done (91% without help, no accessibility violation); the rating says a
first-timer does not find the way easily. Both are right, and recommendation 6 acts on it. *Section
4.4.3.*

**Why is Maintainability lowest, and only one respondent?**
Only the technical evaluator can judge it, and he reviewed the running system without inspecting the
code, so the measurement carries more weight. It points the same way: the system can be checked as a
whole on every change, but 154 of 204 database calls are written inside the request handlers instead
of service modules. *Sections 4.4.3 and 4.4.5; recommendation 6.*

**Why the 2011 edition of ISO/IEC 25010 and not 2023?**
The approved proposal named the 2011 edition's eight characteristics and the instrument was built on
them. Appendix M, Table M-21 shows where each result falls in the 2023 model, which renames Usability
and Portability and adds Safety. *Sections 3.3 and 4.4.*

**Why ISO/IEC 25040:2011 and not the 2024 edition?**
The 2024 edition was restructured as a quality evaluation framework, so its steps are not the five we
followed; the 2011 process was written for the 2011 quality model. (`00_READ_ME_FIRST.md`, Section 6.)

**What did you change because of the evaluation?**
51 changes, grouped by source in Table 4-19. All fourteen of the technical evaluators' comments of
3 October were addressed on the live system by 5 October, and one tenant's request to see the deposit
is now on the tenant's Overview. *Section 4.4.6.*

**Which sub-characteristics were not evaluated?**
Two of the 31: user interface aesthetics and reusability, which have neither a measure nor a survey
item; no conclusion is drawn about them. *Section 4.4.5.*

---

## 9. Deployment and the future

**Is the system in use now?**
Yes, at a public address with the owner's real records since September 2026. It has not yet replaced
her own records: it runs beside them until both agree, which is the last stage of the deployment plan.
*Section 4.5, Table 4-22.*

**Who keeps it running after you graduate?**
It needs no equipment at the property: it is hosted on Vercel and Supabase, and every approved change
deploys automatically. The owner is shown how to use it in the user manual (Appendix K). Backups are
taken before any change to the data. *Section 4.5.*

**How do you protect her real data during development?**
A backup before any change; every change to the data is a numbered migration that can be reviewed
before it runs; credentials are never in the code or documents, and a check for committed credentials
runs before every commit. *Section 4.5.*

**What would you do next?**
The eight recommendations: keep receipts up to date in the system; keep taking backups; move Adyen to
live with refunds, a protected sign-in cookie and a second factor; automated browser tests of the 26
walkthrough steps; faster pages on phones; strengthen Maintainability and Usability; and for future
researchers, test against real data and evaluate over a longer period. *Chapter 5, Section 5.3.*

**What would you do differently?**
Compare screens with the database from the start, not only at the end (that audit found what the
suites missed), and measure a first-time user finding their way before the evaluation, since that is
where Usability lost points. *Sections 4.3.3 and 4.4.3.*

---

## 10. Hard questions, and calm answers

**"Is the GCash payment just for show?"**
No. It works end to end: Adyen authorizes, its signed notification is checked, the payment lands as
Pending Verification, and the owner verifies it. It runs on Adyen's test account so no real money
moves yet; moving to live is a configuration change named in recommendation 3. *Section 4.3.2.*

**"So you have no real users?"**
The owner and three tenants used it on their own accounts on 30 September, the owner did the
walkthrough herself, and the system holds her real records. *Sections 4.3.4 and 4.3.7.*

**"Your technical evaluator never saw the code. Is Maintainability valid?"**
That is why the paper weighs the measured evidence more heavily there, and it reports the code's
weakness itself (154 of 204 database calls inside handlers). *Section 4.4.3.*

**"What if the owner forgets to verify a GCash payment?"**
It stays Pending Verification and does not settle the bill, and the Overview's "Needs your attention"
tile counts it until she does. The tenant sees it as waiting, not paid. *Section 4.2.4; Appendix K.*

**"What if the internet goes down at the property?"**
The installed app still opens and shows the last figures with the time they were saved; nothing can be
saved or paid until the connection returns, and the screen says so. Rent in cash is recorded once it
is back. *Sections 1.4 and 4.3.6.*

**"What if the hosting company shuts down?"**
Her records export to Excel in her own layout at any time, and backups are kept. *NFR-010; Section
4.5.*

**"Why should we trust numbers produced by an AI-written system?"**
Because we did not trust them either: every figure on every screen was compared with the database
(six defects found and fixed), the exports were reconciled 490 of 490, and the owner checked her own
walkthrough. *Sections 4.3.1 and 4.3.3.*

**"The five duplicated invoice numbers: did your system create them?"**
No. They are in her historical records, kept exactly as she wrote them and reported on every
verification run, because only her invoice book can say what each should read. *Sections 4.1.1 and
4.5.*

---

## If the live demo fails

Do not retry on stage. Say what happened in one sentence, then switch: play the film, or show the
figures in `CLAUDE MANUSCRIPT/images/`. If a sign-in is refused, do not try more than once (five wrong
tries lock the account for 15 minutes). `DEMO_SCRIPT.md` has the full plan.
