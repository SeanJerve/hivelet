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
Expenses, and loaded them into the database, and a verification script counted the rows loaded.
Later months were added by a second script that compares every row with the database and adds only
the rows not yet there. That script and the later corrections were written with the help of the same
AI coding assistant and reviewed by the researchers. Each correction was made as a numbered database
migration, run after a backup, that records its evidence and the values before and after. The
corrections make the records match what she wrote. Her amounts, and the five invoice numbers she had
used twice, were kept as written.

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

During testing, the workstation was a Dell XPS 15 laptop with Google Chrome. Response times were
taken on it over the boarding house's Wi-Fi and on an iPhone 15 in Safari over mobile data, and the
offline, installation and browser tests also used an Infinix GT20 with Android and Chrome. The
landlady used her own laptop with Chrome, and the tenants used their own phones.

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

A first working system was built and the landlady's records were transferred into it. It was then
developed in three iterations, each passing through the phases described below (Appendix C). The
first verified the system and its documents against each other and corrected the errors found. The
second put the system in the hands of the landlady and her tenants and refined it from their
feedback, the testing and the evaluation. The third redesigned the screens and added no module, and
a second round of users and technical evaluators tried and rated the redesigned system.

### 3.2.1 Requirements

This phase served the first objective of the study, identifying the boarding house's needs and
operational challenges. The researchers gathered data through interviews with the landlady, through
observation, and through a review of her income and expense workbook. They
examined her existing practices: manual ledgers, fragmented financial tracking and unstructured
communication about maintenance requests. These showed inconsistent record-keeping, delayed
communication and no central place to monitor the business. Written follow-up questions settled what
the interviews had left open. From these
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

**Automated verification.** Twenty-one check suites were written alongside the system. They verify every endpoint and the separation of roles, re-derive the landlady's
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

The Hivelet system was deployed to Vercel, a cloud hosting service, with its database hosted on
Supabase, and is reached through a public web address. On the adviser's advice
the researchers hosted it themselves rather than on the university's server, so the boarding house
needs no equipment beyond the landlady's own laptop and phone. The testing and the evaluation took
place on this deployment, as a pilot in which the system runs beside her own records, which it has
not yet replaced (Chapter 4, Section 4.5). The researchers did the configuration, database migrations
and environment setup.

### 3.2.6 Review and Maintenance

In this phase the researchers corrected the issues found by testing and by the ISO/IEC 25010
evaluation. Chapter 4, Table 4-19 lists the changes made in response to the evaluation.

## 3.3 Evaluation Procedure

This phase directly supports the fourth objective of the study, evaluating and optimizing the system
with the ISO/IEC 25010:2011 software quality model (ISO/IEC, 2011a). So that performance and
usability were measured as the users meet them, the evaluation was conducted during actual use of
the deployed system, on its eight characteristics: functional suitability, performance efficiency,
compatibility, usability, reliability, security, maintainability and portability. It followed the
five steps of the evaluation process in ISO/IEC 25040: establishing the evaluation requirements,
specifying the evaluation, designing it, executing it and concluding it (ISO/IEC, 2011b).

Each characteristic was judged on two kinds of evidence. Measured quality came from the tests in
Section 3.2.4, each expressed in the manner of ISO/IEC 25023 as a ratio X = A / B, such as the number
of test steps that gave the correct result over the number executed (ISO/IEC, 2016b). Rated quality
came from the survey questionnaire, in which each item was assigned to one sub-characteristic
(Table 3-6). Quality in use was measured during the user acceptance test as the tasks completed and
the time and wrong turns per task, following ISO/IEC 25022 (ISO/IEC, 2016a).

**Respondents.** The survey questionnaire was given to four groups: the landlady as the system's only
administrator, the tenants, prospective tenants, and technical evaluators with a background in
information technology, none of whom was a member of the research team. The landlady runs the
boarding house day to day on behalf of its owner. Tenants were chosen by purposive and convenience
sampling (Etikan et al., 2016) to include tenants who pay in cash, tenants less used to mobile
applications, users of both Android and iPhone handsets, and more than one cluster. Three were
observed, since the number of new usability problems found falls quickly with each additional tester
(Nielsen & Landauer, 1993). A prospective tenant used the public website as a person looking for a
unit would. Five technical evaluators reviewed the system, four of them on a demonstration copy holding sample
data, so that they did not see the boarding house's records. After the screens were redesigned in
the third iteration, the tasks and the questionnaire were repeated with a second round of tenants,
prospective tenants and the landlady, and three more technical evaluators reviewed the live system
and answered the questionnaire. Each group rated only the characteristics it
was in a position to judge: tenants and prospective tenants did not rate Security, and only the
technical evaluators rated Maintainability.

**Instruments.** Four instruments were used. Task cards were read aloud to each tester in English and
Filipino. An observation sheet recorded, for each task, whether it was completed without help, with
help or not at all, the time taken and the number of wrong turns. A defect log recorded the defects
found, and the ISO/IEC 25010 survey questionnaire had a section for each respondent group (Appendix J). Responses were
given on the 5-point Likert scale of Table 3-4 (Likert, 1932).

**Data gathering.** Each participant took part after giving consent (Section 3.4). Each tester used
their own device, the landlady and the tenants on their own accounts, while a facilitator read the
tasks without indicating where to tap and an observer completed the observation sheet. When a tester
was stuck, help followed a fixed order: a neutral prompt, then a hint, then a demonstration. A task
finished after the prompt counted as completed without help, one finished after the hint as
completed with help, and one that needed a demonstration as not completed. Each respondent answered
the survey after using the system, without the researchers viewing their answers. Page load times
were measured on the devices named in Section 3.1.2, with the browser's cache cleared for a first
load.

**Statistical treatment.** For each survey item the weighted mean was computed as

WM = Σ(f × w) / N

where *f* is the number of respondents choosing a rating, *w* the rating (1 to 5) and *N* the number of
respondents, and interpreted using Table 3-5. The composite mean of each characteristic is the mean of
its group means, so that the landlady is not outweighed by several tenants on functions only she
uses. The users' composites, from the landlady, the tenants and the prospective tenants, are reported
beside the technical evaluators', and each overall mean is the mean of the composites its
respondents rated. For the acceptance test, the task completion rate is the number of tasks completed
without help divided by the number attempted, reported with the median time per task and the mean
number of wrong turns. The results are descriptive, and no inferential test was made.

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
reached through Panelista reviewed a demonstration copy holding sample data, so none of them saw the landlady's records. The three of the second round reviewed the live system, which a member of the research team
signed into as the test tenant and as the administrator and handed to them ready to use, so they
could see the boarding house's records but were given no sign-in details. That member stayed with
them throughout. Each tenant used only their own account, which shows only their own
records, and received an individual starting password in person, which they replaced at first
sign-in. Respondents could give a name so that the researchers could tell the responses apart. The
names were removed before the responses were analyzed, and none appears in this paper. Names,
contact details and amounts are hidden in every figure in this paper, and faces appear only with
consent. Photographs and notes were kept by the researchers and will be deleted after the defense.
