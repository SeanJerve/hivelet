# 3 MATERIALS AND METHODS

This chapter presents the tools and methods used to develop the Hivelet system, and the instruments
and procedures used to test and evaluate it.

## 3.1 Materials

This section presents the software and hardware used to design, develop, test and deploy Hivelet, a
Progressive Web Application (PWA).

### 3.1.1 Software

Table 3-1 lists the software used to develop the system and the version of each.

**Table 3-1.** Software requirements

| Software | Version |
| :--- | :--- |
| Visual Studio Code | 1.85+ |
| Vue 3 with TypeScript | 3.5 / TypeScript 5.7 |
| Vite (build tool) | 5.4 |
| Tailwind CSS | 4.3 |
| Node.js with Express.js (TypeScript) | 22 LTS / Express 4.22 |
| PostgreSQL, hosted on Supabase | 17.6 |
| Adyen Web Drop-in / API Library | 6.44 / 32.0 |

The development environment ran on Windows 10 or higher.

The user interface was written in Vue 3 with TypeScript, built with Vite and styled with Tailwind
CSS, so that its screens adapt to both phones and laptops. Node.js and Express.js, also written in
TypeScript, formed the back end, which holds the server-side logic for inquiries and reservations,
financial tracking and repair requests. TypeScript was used on both sides so that errors in the shape
of a record are caught before the system runs, which matters in a system that holds the landlady's
actual financial records.

PostgreSQL, hosted on Supabase, was the database, holding tenant records, transaction history and the
audit log. PostgreSQL was chosen for its row-level security, which lets the database itself enforce
who may read or change each record, and for database triggers, which keep a history of every unit
rate change however the change is made. Google Chrome was the main browser for development and
testing.

Additionally, the user interface was prototyped directly in code rather than in a separate design
tool. Each screen was built as a working prototype in Vue and Tailwind CSS, generated with the help of
an AI coding assistant and reviewed by the researchers, so that the landlady and the tenants could try
it on their own phones with real data. The design rules the screens follow, covering color, type,
layout and wording, are recorded in the system's design guideline.

The landlady's past records were transferred from her own workbook rather than retyped. A transfer
script written by the researchers read the workbook's two sheets, Monthly Income and Monthly
Expenses, and loaded them into the database in one import on 28 August 2026; a verification script
then counted the rows loaded. Her August 2026 records were added on 30 September by a second script
that reads the workbook with the same rules, compares every row with the database and adds only the
rows not yet there. That script and the later corrections were written with the help of the same
AI coding assistant and reviewed by the researchers. Each correction was made as a numbered database
migration, run after a backup, that states its evidence and the values before and after; the later
ones also keep the old values in the system's audit log, and the largest, which re-dated 934
receipts, refuses to complete if the ledger total changes. The corrections make the records match
what she wrote, such as payment dates the import had read one day early and rent periods copied from
the receipt before. Her rent, water and expense amounts were kept as she wrote them, and the five
invoice numbers she had used twice were kept, not corrected.

### 3.1.2 Hardware

Because Hivelet is a PWA used on both computers and phones, its development and testing needed a
workstation and a mobile device.

**Table 3-2.** Workstation hardware specifications

| Component | Minimum specification |
| :--- | :--- |
| Processor | Intel Core i5 or AMD Ryzen 5 |
| Memory (RAM) | 8 GB DDR4 |
| Storage | 256 GB Solid State Drive (SSD) |
| Internet connection | 25 Mbps broadband or fiber |

Table 3-2 gives the minimum specification of the workstation used for local development, database
management and testing. The baseline for mobile testing, in Table 3-3, was a current mid-range Android
phone, on which layout and response were evaluated.

**Table 3-3.** Mobile testing hardware specifications (baseline)

| Component | Specification |
| :--- | :--- |
| Operating system | Android 13 or higher |
| Processor or chipset | Octa-core (MediaTek Helio G99 or equivalent) |
| Memory (RAM) | 8 GB |
| Storage | 256 GB |
| Display | 6.78-inch FHD+ (for UI/UX layout testing) |

During testing, the workstation was a Dell XPS 15 laptop with Google Chrome 154. Response times were
taken on it over the boarding house's Wi-Fi and on an iPhone 15 in Safari over mobile data, and the
offline, installation and browser tests also used an Infinix GT20 with Android and Chrome. The
landlady used her own laptop, an Acer Nitro V 15, with Chrome, and the tenants used their own
phones. After the redesign, the screens were timed again on 10 November 2026 on a Windows 11 laptop
in a Chromium browser, on a different network from the boarding house's (Chapter 4, Section 4.3.5).

## 3.2 Software Methodology

The researchers developed Hivelet with the Agile Software Development Life Cycle (SDLC). Agile is an
iterative and flexible approach that emphasizes continuous improvement, stakeholder collaboration and
incremental delivery rather than a rigid, linear process (Pressman & Maxim, 2020).

Agile was chosen because the boarding house's needs could change while the system was being built,
and because it allowed continuous interaction with the landlady, so that the features followed her
actual work: tenant management, financial tracking, inquiries and reservations, and repair requests.
Figure 3-1 shows the cycle's six phases, described in Sections 3.2.1 to 3.2.6.

*Figure 3-1. Agile Software Development Life Cycle.*

![Agile Software Development Life Cycle](<../docs/FINAL MANUSCRIPT/figures/figure-3-1-agile-cycle.png>)

Unlike linear SDLC models, Agile lets issues be found early, because each iteration includes its own
testing.
The researchers refined the system from the feedback and test results of each iteration, and the
system was evaluated during its development rather than only at the end (Section 3.3).

The work ran from July to November 2026. A first working system was built from 24 July to 28 August
2026, and the landlady's records were transferred into it. It was then developed in three
iterations, each passing through the phases described below. Iteration 1, from 12 to 14 September,
verified the system and its documents against each other and corrected the errors found, and it had
no deployment work. Iteration 2, from 15 September to 31 October, took the landlady's answers to the
written questions of Section 3.2.1, put the system in her hands and her tenants', and refined it from
their feedback, the testing and the evaluation. Iteration 3, from 1 November, redesigned the look of
the screens and added no module. The testing and the formal evaluation took place in Iteration 2,
and a second round of users tried the redesigned system from 31 October to 10 November (Appendix C).

### 3.2.1 Requirements

This phase served the first objective of the study, identifying the boarding house's needs and
operational challenges. The researchers gathered data through interviews with the landlady, the first
in February 2026, through observation, and through a review of her income and expense workbook. They
examined her existing practices: manual ledgers, fragmented financial tracking and unstructured
communication about maintenance requests. These showed inconsistent record-keeping, delayed
communication and no central place to monitor the business. Two later rounds of written questions,
answered on 17 September and 12 October 2026, settled what the interviews had left open. From these
findings the researchers defined Hivelet's requirements and scope: one central system for inquiries
and reservations, financial tracking and maintenance requests.

### 3.2.2 Design

In this phase the requirements were turned into the system's architecture and into working
prototypes of its screens, built in code as described in Section 3.1.1, for three kinds of user: the
public, tenants and the administrator. Each prototype was reviewed with the landlady on the device
she uses, and the findings were applied in the next iteration (Chapter 4, Table 4-19). Because the
boarding house has limited infrastructure, unstable internet and a single administrator, Hivelet was
designed as a lightweight PWA with simple navigation and low device requirements. The workflows for
inquiries and reservations, financial tracking and maintenance requests were mapped first and then
refined from the feedback of the landlady and the tenants.

### 3.2.3 Development

This phase served the second objective of the study, developing the system. The researchers built it
with the software described in Section 3.1.1, refining it in each iteration from feedback and test
results. An optional online payment was added through the Adyen payment gateway, so that a tenant can
pay a bill with GCash, while cash paid in person remains the main way to pay. It works end to end in
Adyen's test environment, where it takes no real money. It is not live, because going live needs the
owner's merchant onboarding documents.

### 3.2.4 Testing

This phase served the third objective of the study, pilot testing the system. Testing was done in the
four parts below, at the test levels defined in ISO/IEC/IEEE 29119-1 (International Organization for
Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics
Engineers [ISO/IEC/IEEE], 2022): unit and integration, system, and acceptance. Each test was planned
as a measure of an ISO/IEC 25010 sub-characteristic listed in Table 3-6.

**Automated verification.** Twenty check suites were written alongside the system, and a twenty-first
on 12 October 2026. They verify every endpoint and the separation of roles, re-derive the landlady's
ledger and exported reports from the database, check the payment gateway's message signatures, and
confirm that no screen presents stored or empty data as a live figure. They read the live system
without writing to it, and were run after every significant change.

**Screen-versus-database audit.** Each figure shown on each screen was compared with a read-only query
of the live database for the same records, to confirm that a screen shows a person what the database
holds for them.

**Offline, installation, accessibility and simultaneous-use tests.** With an automated browser, the
installed application was opened without a connection and on throttled slow connections, and the
live system was read by several simulated simultaneous users, with every save blocked in the browser
so that no record was written. The same browser scanned the screens against the Web Content
Accessibility Guidelines, levels A and AA (World Wide Web Consortium, 2023).

**Functional walkthrough and user acceptance testing.** A 26-step walkthrough exercised once every
function that writes data, on the one vacant unit (Appendix L). The landlady and three tenants then
used the live system for their own tasks on their own devices, observed by the researchers, and the
landlady and two of the tenants used it at the same time. One prospective tenant used the public
website on their own phone. In the second round, ten tenants and four prospective tenants did the
same tasks on the redesigned system. Results are reported in Chapter 4, Section 4.3.

### 3.2.5 Deployment

The Hivelet system was deployed to Vercel, a cloud hosting service, on 24 September 2026, with its
database hosted on Supabase, and is reached through a public web address. On the adviser's advice
the researchers hosted it themselves rather than on the university's server, so the boarding house
needs no equipment beyond the landlady's own laptop and phone. The testing and the evaluation took
place on this deployment, as a pilot in which the system runs beside her own records, which it has
not yet replaced (Chapter 4, Section 4.5). The researchers did the configuration, database migrations
and environment setup.

### 3.2.6 Review and Maintenance

In this phase the researchers corrected the issues found by testing and by the ISO/IEC 25010
evaluation. Chapter 4, Table 4-19 lists the changes made in response to the evaluation.

## 3.3 Evaluation Procedure

The testing and the evaluation followed the ISO/IEC 25000 series of standards on software quality,
Systems and software Quality Requirements and Evaluation (SQuaRE). The quality model was that of
ISO/IEC 25010:2011, which divides the quality of a software product into eight characteristics
(functional suitability, performance efficiency, compatibility, usability, reliability, security,
maintainability and portability) and thirty-one sub-characteristics, and defines a separate model of
quality in use, the quality experienced by users in their own context (ISO/IEC, 2011a). The evaluation followed the five steps of
the evaluation process in ISO/IEC 25040: establishing the evaluation requirements, specifying the
evaluation, designing it, executing it and concluding it (ISO/IEC, 2011b). Each characteristic was
judged on two kinds of evidence. Measured quality came from the tests described in Section 3.2.4,
each expressed as a measure of a sub-characteristic in the form ISO/IEC 25023 uses, a ratio X = A / B
such as the number of executed test steps that gave the correct result over the number executed
(ISO/IEC, 2016b). Rated quality came from the survey questionnaire, in which every item was assigned to
one sub-characteristic before it was answered (Table 3-6). Quality in use was measured during the user
acceptance test as effectiveness (tasks completed), efficiency (time and wrong turns per task) and the
contexts covered, following ISO/IEC 25022 (ISO/IEC, 2016a). The survey used the 2011 edition's
characteristics. The 2023 revision of ISO/IEC 25010, which renames Usability and Portability and adds
Safety, was used only to show where each result falls in the newer model.

The evaluation served the fourth objective of the study, evaluating and optimizing the system with
the ISO/IEC 25010 model. So that performance and usability were measured as the users meet them, it
was conducted during actual use of the deployed system, except that four technical evaluators
reviewed a demonstration copy (see Participants).

A survey questionnaire was given to four groups: the landlady as the system's administrator, the
tenants, prospective tenants, and technical evaluators with a background in information technology. Each group rated only the
characteristics it was in a position to judge. Tenants did not rate Security, nor did prospective
tenants, who see only the public website. Only the technical evaluators, the group with the
background to judge it, rated Maintainability. Responses were given on the 5-point Likert scale of
Table 3-4 (Likert, 1932).

**Participants.** The landlady, who runs the boarding house day to day on behalf of its owner, took
part as the system's only administrator. Tenants were chosen by purposive and convenience sampling
(Etikan et al., 2016): from the tenants at the boarding house on the evening of
the test, the researchers chose ones who pay in cash on site, ones less used to mobile applications,
users of both Android and iPhone handsets, and tenants from more than one cluster. Three tenants were
observed because the number of new usability problems found falls quickly with each additional
tester (Nielsen & Landauer, 1993). One prospective tenant, who does not live at the boarding house,
was invited by the researchers to use the public website as someone looking for a unit would. On
their own phone and without an account, they browsed the units and rates and sent an inquiry about
one. Replying to an inquiry was tested separately by the researchers. Five technical evaluators took
part. The first, an IT professional who works in software quality assurance, reviewed the running
system on 3 October 2026. The other four were reached through Panelista, a platform that matches
capstone projects with volunteer evaluators, and each was asked to have at least three years'
experience. They reviewed a demonstration copy of the system on 15 to 18 October, the same software
on a separate database holding sample data. None inspected the source code. A second round was held
on the redesigned system of Iteration 3, between 31 October and 10 November 2026. Ten tenants and
four prospective tenants did the same tasks, and sixteen people answered the questionnaire: eleven
tenants, four prospective tenants and the landlady.

**Instruments.** Four instruments were used. Task cards were read aloud to each tester in English and
Filipino. An observation sheet recorded, for each task, whether it was completed without help, with
help, or not at all, the time taken, and the number of wrong turns. A defect log was kept. The
ISO/IEC 25010 survey questionnaire (Appendix J) had a separate section for each of the four
respondent groups, and the tenant and prospective tenant sections were in English and Filipino.

**Data gathering.** Each participant took part after giving consent (Section 3.4). The landlady and
each tenant used their own account on their own device, and each prospective tenant the public
website without an account, while a facilitator read the tasks without indicating where to tap and
an observer completed the observation sheet. Testers were asked to think aloud, saying, for example,
whether they expected a change to their personal details to save, whether a payment showed as
settled once the landlady confirmed it, and whether a repair request appeared once sent. They were
not interviewed during or after their tasks. When a tester was stuck, help followed a fixed order: a
neutral prompt after about thirty seconds ("What are you looking for?"), then a hint about where to
look, and only then a demonstration. A task finished after the prompt counted as completed without
help, one finished after the hint as completed with help, and one that needed a demonstration as not
completed. Photographs were taken for documentation, only with the tester's permission, and no
screen was recorded.

Each respondent answered the survey after using the system, without the researchers viewing their
answers: the tenants and the prospective tenant straight after their tasks, the landlady the same
evening, the first technical evaluator the day after their review, and the other four after their
reviews of the demonstration copy. In the second round, the tenants, the prospective tenants and the
landlady answered after using the redesigned system. Page load times were measured once per screen
on the devices named in Section 3.1.2, with the browser's cache cleared for a first load.

**Statistical treatment.** For each survey item the weighted mean was computed as

WM = Σ(f × w) / N

where *f* is the number of respondents choosing a rating, *w* the rating (1 to 5) and *N* the number of
respondents, and interpreted using Table 3-5. The composite mean of each characteristic is the mean of
its item means, computed per respondent group and then as the mean of the group means, so that the
landlady is not outweighed by several tenants on functions only she uses. The overall mean is the
mean of the eight composites. The two rounds were computed the same way, each on its own and then
together. The second round had no technical evaluators and so no Maintainability ratings, and its
overall mean is the mean of seven composites. For the acceptance test, the task completion rate is
the number of tasks completed without help divided by the number attempted, reported with the median
time per task and the mean number of wrong turns, following the effectiveness and efficiency measures
of the ISO/IEC 25010 quality in use model. The second round reports no times, since time on task was
not recorded reliably in it.

Only these descriptive statistics were used, and they were read alongside the results of the tests in
Section 3.2.4. No inferential test was made, so the results describe how these respondents rated the
system.

**Table 3-4.** Likert scale

| Scale | Meaning | Description |
| :---: | :--- | :--- |
| 5 | Strongly Agree | The respondent strongly agrees with the statement |
| 4 | Agree | The respondent agrees with the statement |
| 3 | Neutral | The respondent neither agrees nor disagrees with the statement |
| 2 | Disagree | The respondent disagrees with the statement |
| 1 | Strongly Disagree | The respondent strongly disagrees with the statement |

Table 3-5 divides the range from 1 to 5 into five equal intervals of 0.80.

**Table 3-5.** Interpretation of mean scores

| Mean score | Verbal interpretation |
| :--- | :--- |
| 4.21 – 5.00 | Very High Quality |
| 3.41 – 4.20 | High Quality |
| 2.61 – 3.40 | Moderate Quality |
| 1.81 – 2.60 | Low Quality |
| 1.00 – 1.80 | Very Low Quality |

Table 3-6 assigns every survey item and every test to the sub-characteristic it measures. Item numbers
are those of each group's section of the questionnaire (O = administrator, T = tenants, E = technical
evaluators, P = prospective tenants).

**Table 3-6.** Survey items and tests assigned to the ISO/IEC 25010:2011 sub-characteristics

| Characteristic | Sub-characteristic | O | T | E | P | Measured by (Section 3.2.4) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Functional Suitability | Functional completeness | 1 | 1, 3 | 1 | 1 | Requirements traceability; walkthrough |
| | Functional correctness | 2, 3, 4, 6 | | 2, 3, 5 | | Automated verification; screen-versus-database audit; walkthrough |
| | Functional appropriateness | 5 | 2 | 4 | 2, 3 | User acceptance test |
| Performance Efficiency | Time behaviour | 7, 8 | 9, 10 | 6, 7 | 7, 8 | Load and response times on real devices |
| | Resource utilization | | | 8 | | Lighthouse; size of the code downloaded |
| | Capacity | 9 | | | | Simultaneous-user test |
| Compatibility | Co-existence | 12 | 15 | 11 | | (rated only) |
| | Interoperability | 10, 11 | 14 | 9, 10 | 10 | Browser matrix; gateway checks; export checks |
| Usability | Appropriateness recognizability | 13 | 4 | 12 | 4 | User acceptance test |
| | Learnability | 17 | 8 | 16 | | User acceptance test |
| | Operability | 14 | 5, 6 | 13 | 5 | User acceptance test |
| | User error protection | 15, 16 | 7 | 14, 15 | 6 | Walkthrough |
| | User interface aesthetics | | | | | (not evaluated) |
| | Accessibility | | | | | Accessibility scans (axe-core; WCAG 2.0 to 2.2, A and AA) |
| Reliability | Maturity | | 12 | | 9 | Defect log |
| | Availability | 18 | 11 | | | (rated only) |
| | Fault tolerance | 20 | 13 | 17, 19 | | Offline and weak-connection tests; walkthrough |
| | Recoverability | 19, 21 | | 18, 20 | | Live use; offline tests |
| Security | Confidentiality | 22, 23 | | 21, 22 | | Walkthrough; manual protection checks; code review |
| | Integrity | | | | | Gateway signature checks; code review |
| | Non-repudiation | | | | | Audit trail |
| | Accountability | 24 | | 23 | | Audit trail |
| | Authenticity | 25 | | 24, 25 | | Manual protection checks; passive external scans |
| Maintainability | Modularity | | | 30 | | Permission matrix check |
| | Reusability | | | | | (not evaluated) |
| | Analysability | | | 26, 27 | | Migration history |
| | Modifiability | | | 28 | | Configurable settings |
| | Testability | | | 29 | | Automated verification |
| Portability | Adaptability | 26 | 16, 17 | 31 | 11 | Screen widths; devices used |
| | Installability | 27, 28 | 18 | 32, 33 | 12 | Installation tests |
| | Replaceability | | | | | Export in the landlady's layout |

## 3.4 Ethical Considerations

The study used the landlady's real records and the tenants' real accounts, so it followed the
Data Privacy Act of 2012 (Republic Act No. 10173, 2012). Participation was voluntary and could be
withdrawn at any time without any effect on a tenant's tenancy. The landlady and each tenant signed
the informed consent form (Appendix P), and the prospective tenants and the technical evaluators
agreed through the data privacy notice that opens the questionnaire. The four technical evaluators
reached through Panelista reviewed a demonstration copy holding sample data, so none of them saw the
landlady's records. Each tenant used only their own account, which shows only their own
records, and received an individual starting password in person, which they replaced at first
sign-in. Respondents could give a name so that the researchers could tell the responses apart. The
names were removed before the responses were analyzed, and none appears in this paper. Names,
contact details and amounts are hidden in every figure in this paper, and faces appear only with
consent. Photographs and notes were kept by the researchers and will be deleted after the defense.
