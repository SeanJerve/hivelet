# Fixes for the front matter and Chapters 1 to 3

**Checked 2026-09-26** against `Hivelet_Manuscript_as_of_2026-09-18.pdf` in this folder, page by
page. Page numbers below are the numbers printed on the page. Paste-ready text is given where the
fix is a matter of fact. Where it is a decision, it says so.

This replaces `docs/CHAPTER_3_RECONCILIATION.md` (2026-09-18) for Chapter 3. That file's database
version (15) was wrong: the live database is **PostgreSQL 17.6**, read with `select version()` on
2026-09-26. Its deployment item is now settled too (Vercel and Supabase).

---

## A. Wrong facts (fix these first)

| # | Where | Now says | Change to |
| :--- | :--- | :--- | :--- |
| A1 | p.6, §1.4, first line | "32-unit Fe Galang Da Silva Apartment" | "33-unit Fe Galang Da Silva Apartment". The owner confirmed 33 units on 2026-09-13 |
| A2 | p.6, §1.4 | "real-time monitoring of bed availability" | "real-time monitoring of room availability". The system tracks units, not beds |
| A3 | p.26, §2.4, Optional Online Payment Feature | "input or simulate digital payment transactions" | See B1 below |
| A4 | p.28, Table 1 and the two paragraphs after it | HTML5, JavaScript, MySQL | See B2 to B4 below |
| A5 | p.33, §3.2.3 | HTML5 / JavaScript / MySQL, and "to simulate or record digital payments" | See B5 below |
| A6 | p.34, §3.2.5 | "deployed to a university-managed server environment" | See B6 below |
| A7 | p.35, §3.3 | Survey goes to "the property owner and tenants" only | See B7 below. Chapter 4 also uses technical evaluators, the only group that rates Maintainability |

## B. Paste-ready replacements

**B1. §2.4, Optional Online Payment Feature (p.26).**

> **Optional Online Payment Feature** – A supplementary system function that allows tenants to
> settle a bill through GCash using the Adyen payment gateway, without serving as the primary
> financial processing mechanism of the system. A payment made this way enters a pending state and
> is settled only after the administrator verifies it.

**B2. Table 1. Software Requirements (p.28).** Replace the body of the table:

| Software | Version |
| :--- | :--- |
| Visual Studio Code | 1.85+ |
| Vue 3 with TypeScript | 3.5 / TypeScript 5.7 |
| Vite (build tool) | 5.4 |
| Tailwind CSS | 4.0 |
| Node.js with Express.js (TypeScript) | LTS (v18+) / Express 4.19 |
| PostgreSQL, hosted on Supabase | 17.6 |
| Adyen Web Drop-in / API Library | 6.44 / 32.0 |

**B3. The paragraph beginning "As outlined in Table 1" (p.28).**

> As outlined in Table 1, the development uses Vue 3 with TypeScript, built with Vite and styled
> with Tailwind CSS, to create a responsive and mobile-adaptive user interface. Node.js and
> Express.js, also written in TypeScript, serve as the back-end framework responsible for
> server-side logic such as booking management, financial tracking, and issue ticket processing.
> TypeScript was used on both sides so that errors in the shape of a record are caught before the
> system runs, which matters in a system that holds the owner's actual financial records.

**B4. The paragraph beginning "MySQL will be used" (p.28).** Keep the Google Chrome sentence at the end.

> PostgreSQL, hosted on Supabase, is used as the system's database management tool to store and
> organize structured data such as tenant records, transaction history, and system logs.
> PostgreSQL was chosen for its row-level security, which lets the database itself enforce who may
> read or change each record, and for database triggers, which keep a history of every room rate
> change regardless of how the change is made.

**B5. §3.2.3 Development (p.33), from "The researchers implement" to "system logs."**

> The researchers implement the Hivelet system using Vue 3 with TypeScript for the front-end
> interface, ensuring responsiveness across devices. The back-end is developed using Node.js and
> Express.js in TypeScript to manage core functionalities such as booking processing, financial
> computations, and maintenance ticket handling. An optional online payment feature is implemented
> through the Adyen payment gateway, allowing a tenant to settle a bill through GCash without
> replacing the primary cash-based financial workflow. PostgreSQL, hosted on Supabase, is used as
> the database management system to store tenant records, transaction data, and system logs.

**B6. §3.2.5 Deployment (p.34), first sentence.**

> After successful testing, the Hivelet system is deployed to Vercel, a cloud hosting service,
> with its database hosted on Supabase, where the system is accessible through a public web
> address for real-world usage and evaluation.

**B7. §3.3 Evaluation Procedure (p.35), second paragraph.**

> A structured survey questionnaire is administered to three groups: the property owner, the
> tenants of the Fe Galang Da Silva Apartment, and technical evaluators with a background in
> information technology. Each group rates only the characteristics it is in a position to judge:
> tenants do not rate Security or Maintainability, and only technical evaluators rate
> Maintainability, since it requires reviewing the source code and documentation. Responses are
> measured using the 5-point Likert scale in Table 4, and mean scores are interpreted using the
> ranges in Table 13.

## C. Numbering, cross-references and typos

| # | Where | Problem | Fix |
| :--- | :--- | :--- | :--- |
| C1 | p.22, §2.3 | "Figure 1 illustrates the study's conceptual framework" | "Figure 2 illustrates…" |
| C2 | p.22, Figure 2 | "Ayden" appears twice in the diagram | "Adyen". This needs the diagram image redone |
| C3 | p.30, §3.2 | "As illustrated in Figure 2" (the Agile diagram) | "As illustrated in Figure 3" |
| C4 | p.36 | The Likert table is labelled "Table 3", the same number as the mobile hardware table | "Table 4. Likert Scale" |
| C5 | p.30 | "(Baseline)]" has a stray bracket | "(Baseline)" |
| C6 | p.12 | "According to Laudon and Laudon" has no year | "According to Laudon and Laudon (2006)" |
| C7 | p.44 | References are not in alphabetical order (Ghasemaghaei and Pressman are at the end) | Sort alphabetically, and confirm every listed source is cited in the text (Monteverde et al. and Thevaraju et al. could not be found in the body) |
| C8 | p.xiii (TOC) | "CURRICULUM VITAEx" | "CURRICULUM VITAE" |
| C9 | Throughout | The property is called both "Boarding House" (title) and "Apartment" (body) | Decide one name, or state once in §1.4 that both refer to the same property |

## D. Table of contents and lists (regenerate, do not hand-edit)

The table of contents, list of tables and list of figures do not match the body. The simplest fix
is to apply Word heading styles to every heading and insert an automatic table of contents.

- **Section titles in 2.1.1 to 2.1.5 differ between the TOC and the body.** For example, the TOC
  says "Structural Inefficiencies in Property Management Systems" but the body says
  "Fragmentation and Operational Inefficiencies in Property Management".
- **Chapter 4 entries are template leftovers:** "4.2 Objective 1 Title" and "4.3 Evaluation of the
  Developed Pet Adoption System". (The body itself says "4.3 Evaluation of the Developed System".)
- **Page numbers are wrong**: the TOC puts Chapter 4 on page 30; it is on page 37.
- **Abstract and Acknowledgement** are both listed on page vii. The Acknowledgement page does not
  exist yet, and the Abstract page is blank.
- **List of Tables:** "Table 2. Hardware Requirements" is titled "Workstation Hardware
  Specifications" in the body, and Tables 5 to 10 are template entries. Replace with Tables 5 to 25
  from Chapter 4.
- **List of Figures:** add Figures 4 to 8 from Chapter 4.
- **Appendices:** Appendix J shows page "10"; Appendix L still says "<System Name>"; the TOC calls
  the source code Appendix M but the body calls it Appendix N. Appendices C to M are not in the PDF
  yet.

## E. Front matter only the team or adviser can settle

- **p.3, Result of Final Oral Defense:** the place is still "<Online via Google Meet / CSB2 Room
  101>" and the date is "January 1, 2023". Fill in after the defense is scheduled.
- **p.5 and p.6, the two adviser certifications** give an older title: "Hivelet: A Web-Based
  Apartment Management System with Financial Analytics, Booking, and Issue Tracking for Fe Galang
  Da Silva Boarding House". The cover says "Hivelet: A Web-Based Apartment Management System for Fe
  Galang Da Silva Boarding House". These are signed documents, so do not edit them. Ask the adviser
  whether they need to be reissued with the current title.
- **Curriculum Vitae (p.50 to 51):** still the blank template, with 2019 to 2023 as example years.

## G. Found on the second pass (2026-09-28)

Checked against the same PDF, and against the system as it stands on 2026-09-28. These were not
in the first pass.

| # | Where | Now says | Change to |
| :--- | :--- | :--- | :--- |
| G1 | p.7, §1.4, the delimitation sentence on online payment | "restricted to basic transaction recording and explicitly excludes advanced financial processing capabilities like automated reconciliation, refunds, or direct banking integration" | See G6. The refund part is right and Chapter 5 (recommendation 5) now rests on it, but "basic transaction recording" undersells a real payment through the Adyen gateway |
| G2 | p.23, §2.3, the Output phase | "generated outputs such as financial reports, booking records, and transaction receipts" | "generated outputs such as financial reports exportable as Excel files, enquiry and tenancy records, and payment records". **The system does not produce receipts:** it records the number from the owner's paper receipt book and never makes one up (Chapter 4, §4.2.4) |
| G3 | p.24, §2.4, Progressive Web Application | "without requiring installation" | "without requiring installation from an app store". Chapter 4, §4.2.7 says the app **can** be installed on a phone, and the Portability survey asks about exactly that |
| G4 | p.33, §3.2.2 Design | "covering three user roles: public users, tenants, and administrators" | Keep; it matches the system. The code also stores a *prospect*, but that is only the saved record of a visitor who sent an enquiry, with the same rights as the public, so it is not a fourth kind of user. Chapter 4, §4.2.6 now says so |
| G7 | p.43-44, References | **Ullah et al. (2021) is cited four times in the body** (§1.1 twice, §2.1.1, §2.1.6) and once in Chapter 4, §4.1.1, **but is not in the reference list** | Add its full APA entry. Only the team has the source; check the author names, title and year against it. Checked by extracting every in-text citation from the PDF text on 2026-09-28: every other citation has a reference entry, and Monteverde et al. (2023) and Thevaraju et al. (2019) are listed but cited nowhere (C7) |
| G5 | p.28, §3.1.1, and p.33, §3.2.2 | Figma used for the interface prototypes | **Team to confirm.** No Figma file or link is in the repository. If the prototypes were made some other way, name that instead; a panel member may ask to see them |

**G6. §1.4, the delimitation sentence on online payment (p.7).** Replace from "Additionally, the
supplementary online payment feature" to "direct banking integration."

> Additionally, the supplementary online payment feature lets a tenant pay a bill through GCash
> using the Adyen payment gateway; each such payment is recorded as pending and counts only after
> the administrator verifies it. The feature explicitly excludes refunds, which are made from the
> gateway's own dashboard, automated reconciliation against bank records, and direct banking
> integration.

## H. The testing method, written for Chapter 3 (added 2026-09-29)

Chapter 4 now reports automated verification, measured offline and simultaneous-use tests, a
walkthrough, a user acceptance test with the owner and tenants, and the survey. Chapter 3 must
describe each of them as the method, or the panel will find results with no method behind them.
These replace the optional note on §3.2.4 in section F. They are written in the past tense because
the work will be done by the time the paper is read; if the manuscript is submitted before
30 September, change "were" to "will be".

**H1. §3.2.4 Testing (p.34). Replace the whole subsection.**

> Testing was carried out in four layers, each answering a different question.
>
> **Automated verification.** Twenty check suites were written alongside the system. They verify
> every endpoint and the separation of roles, re-derive the owner's ledger and exported reports
> from the database, check the payment gateway's message signatures, and confirm that no screen
> presents stored or empty data as a live figure. They run against the live system without writing
> to it, and were run after every significant change.
>
> **Screen-versus-database audit.** Each figure shown on each screen was compared with a read-only
> query of the live database for the same records, to confirm that a screen shows a person what
> the database holds for them.
>
> **Offline, installation and simultaneous-use tests.** With an automated browser, the installed
> application was opened without a connection and on throttled slow connections, and the live
> system was read by several simultaneous users, with every save blocked in the browser so that no
> record was written.
>
> **Functional walkthrough and user acceptance testing.** A 26-step walkthrough exercised every
> function that writes data once, on the one vacant unit. The owner and three to five tenants then
> used the live system for their own tasks on their own devices, observed by the researchers, and
> used it all at the same time. Results are reported in Chapter 4, Section 4.3.

**H2. §3.3 Evaluation Procedure (p.35). Add after the paragraph in B7.**

> **Participants.** The owner, as the only administrator, took part as a matter of course. Tenants
> were chosen by purposive sampling from the occupied units, to include tenants who pay in cash on
> site, tenants less used to mobile applications, users of both Android and iPhone handsets, and
> residents of more than one cluster. Technical evaluators were IT faculty, developers or IT
> professionals who were given access to the source code and documentation before rating.
>
> **Instruments.** Four instruments were used: task cards read aloud to each tester, in English
> and Filipino; an observation sheet recording, for each task, whether it was completed without
> help, with help, or not at all, the time taken, and the number of wrong turns; a defect log; and
> the ISO/IEC 25010 survey questionnaire, with a separate section for each respondent group and the
> tenant section in English and Filipino.
>
> **Data gathering.** Each tester gave written consent before taking part. Each used their own
> account on their own device while a facilitator read the tasks without indicating where to tap
> and an observer completed the observation sheet. Screen recordings and photographs were taken
> only with the tester's permission. Each tester answered the survey immediately after their
> session, without the researchers viewing their answers. Page load times were measured on the
> workstation in Table 2 and the phone in Table 3, three times per screen, and the median was
> recorded.
>
> **Statistical treatment.** For each survey item the weighted mean was computed as
>
> WM = Σ(f × w) / N
>
> where *f* is the number of respondents choosing a rating, *w* the rating (1 to 5) and *N* the
> number of respondents, and interpreted using Table 13. The composite mean of each characteristic
> is the mean of its item means, computed per respondent group and then [DECISION PENDING: as the
> mean of the group means, or across all respondents; the same choice as Chapter 4, §4.4.2]. For
> the acceptance test, the task completion rate is the number of tasks completed without help
> divided by the number attempted, reported with the median time per task and the mean number of
> wrong turns, following the effectiveness and efficiency measures of the ISO/IEC 25010 quality in
> use model.

**H3. Ethical considerations. Add at the end of §3.3, or as §3.4 if the template allows one.**

> The study used the owner's real records and the tenants' real accounts, so it followed the Data
> Privacy Act of 2012 (Republic Act No. 10173). Participation was voluntary and could be withdrawn
> at any time without any effect on a tenant's tenancy. Each tenant used only their own account,
> which shows only their own records, and received an individual starting password in person, which
> they replaced at first sign-in. Survey responses were anonymous. Names, contact details and
> amounts are hidden in every figure in this paper, and faces appear only with consent. Recordings
> and notes were kept by the research team and are deleted after the defense.

## F. Optional improvements (not errors)

- §2.4 defines ISO/IEC 25010 with only three example characteristics. Listing all eight would
  match Objective 4.
- ~~§3.2.4 Testing describes unit and integration testing. Consider describing the suites and the
  walkthrough instead.~~ Now a required fix with paste-ready text: section H1.
- Chapter 3 is written in the future tense ("will be used"). Where the work is done, the past or
  present tense avoids a second disagreement with Chapter 4.
