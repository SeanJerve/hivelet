# 3 MATERIALS AND METHODS

This chapter presents the strategies, tools, and methods used in the development of the Hivelet
system, and the instruments and procedures used in evaluating the system's functionality,
performance, and user acceptability.

## 3.1 Materials

This section presents the materials used in the documentation of the study and in the development of
the Hivelet system. These materials include the software and hardware components used in the design,
development, testing, and deployment of the Progressive Web Application (PWA). The software tools
include programming languages, frameworks, and database technologies, while the hardware consists of
the physical equipment used for system development and evaluation. Each material, its purpose, and
its contribution to the Hivelet system is discussed in the succeeding subsections.

### 3.1.1 Software

The development of the Hivelet system required modern front-end and back-end technologies to ensure a
responsive, accessible, and secure Progressive Web Application (PWA) for both property administrators
and tenants of a small-to-medium apartment system.

**Table 1.** Software requirements

| Software | Version |
| :--- | :--- |
| Visual Studio Code | 1.85+ |
| Vue 3 with TypeScript | 3.5 / TypeScript 5.7 |
| Vite (build tool) | 5.4 |
| Tailwind CSS | 4.0 |
| Node.js with Express.js (TypeScript) | LTS (v18+) / Express 4.19 |
| PostgreSQL, hosted on Supabase | 17.6 |
| Adyen Web Drop-in / API Library | 6.44 / 32.0 |

The development environment ran on Windows 10 or higher to ensure long-term system compatibility,
stability, and security.

As outlined in Table 1, the development used Vue 3 with TypeScript, built with Vite and styled with
Tailwind CSS, to create a responsive and mobile-adaptive user interface. Node.js and Express.js, also
written in TypeScript, served as the back-end framework responsible for server-side logic such as
booking management, financial tracking, and issue ticket processing. TypeScript was used on both sides
so that errors in the shape of a record are caught before the system runs, which matters in a system
that holds the owner's actual financial records.

PostgreSQL, hosted on Supabase, was used as the system's database management tool to store and
organize structured data such as tenant records, transaction history, and system logs. PostgreSQL was
chosen for its row-level security, which lets the database itself enforce who may read or change each
record, and for database triggers, which keep a history of every room rate change regardless of how
the change is made. Google Chrome was the primary browser for development and testing due to its
reliability and optimization for modern web applications.

Additionally, the user interface was prototyped directly in code rather than in a separate design
tool. Each screen was built as a working prototype in Vue and Tailwind CSS, generated with the help of
an AI coding assistant and reviewed by the researchers, so that the landlady and the tenants could try
it on their own phones with real data. The design rules the screens follow, covering color, type,
layout and wording, are recorded in the system's design guideline.

### 3.1.2 Hardware

To ensure efficient development, testing, and deployment of the Hivelet system, specific hardware
specifications were used during the development process. Since the system follows a Progressive Web
Application (PWA) architecture, both computer workstations and mobile devices were required.

**Table 2.** Workstation hardware specifications

| Component | Minimum specification |
| :--- | :--- |
| Processor | Intel Core i5 or AMD Ryzen 5 |
| Memory (RAM) | 8 GB DDR4 |
| Storage | 256 GB Solid State Drive (SSD) |
| Internet connection | 25 Mbps broadband or fiber |

As detailed in Table 2, the workstation used for local development, database management, and system
testing required an SSD to ensure fast processing and smooth execution of development tools. For
mobile testing, a mid-range Android device was planned to evaluate system responsiveness and
performance under real-world conditions. As shown in Table 3, this baseline mobile setup ensured that
the development team could evaluate the system's UI/UX layout and mobile adaptability using modern
device standards.

**Table 3.** Mobile testing hardware specifications (baseline)

| Component | Version |
| :--- | :--- |
| Operating system | Android 13 or higher |
| Processor or chipset | Octa-core (MediaTek Helio G99 or equivalent) |
| Memory (RAM) | 8 GB |
| Storage | 256 GB |
| Display | 6.78-inch FHD+ (for UI/UX layout testing) |

During testing, the workstation was a Dell XPS 15 laptop with Google Chrome 154; the response times
were taken on it over the boarding house's Wi-Fi and on an iPhone 15 in Safari over mobile data, and
the offline, installation and browser tests also used an Infinix GT20 with Android and Chrome. The
administrator used her own laptop, an Acer Nitro V 15, with Chrome.

## 3.2 Software Methodology

The researchers used the Agile Software Development Life Cycle (SDLC) in the development of the
Hivelet system. Agile is an iterative and flexible software development approach that emphasizes
continuous improvement, stakeholder collaboration, and incremental delivery of system components
rather than a rigid, linear process (Pressman & Maxim, 2020).

As illustrated in Figure 3, the dynamic and resource-constrained nature of small-scale apartment
management requires a development approach that can adapt to changing operational needs. In this
context, Agile was selected as the most appropriate methodology as it allowed continuous interaction
with the landlady and management of the Fe Galang Da Silva Boarding House, ensuring that system
features were aligned with actual administrative workflows such as tenant management, financial
tracking, booking coordination, and maintenance handling.

*Figure 3. Agile Software Development Life Cycle.*

![Agile Software Development Life Cycle](figures/figure-3-1-agile-cycle.png)

Unlike traditional SDLC models, Agile supports early identification of system issues through
iterative cycles of development and testing. This enabled the researchers to refine system components
based on real-time feedback, resulting in a more reliable, user-centered, and context-appropriate
solution. Furthermore, the Agile approach facilitated progressive evaluation of the system throughout
its development. The system was assessed using the ISO/IEC 25010:2011 software quality model
encompassing functional suitability, performance efficiency, compatibility, usability, reliability,
security, maintainability, and portability (ISO/IEC, 2011a). This ensured that the developed system
not only meets user requirements but also adheres to established software quality standards.

Additionally, the flexibility of Agile allowed the system to be continuously improved, modified, and
adapted without compromising performance. This is particularly important in ensuring that Hivelet
remains functional under varying conditions such as limited infrastructure, unstable internet
connectivity, and evolving user needs.

### 3.2.1 Requirements

In this phase, the researchers conducted needfinding through direct collaboration with the landlady
and management of the Fe Galang Da Silva Boarding House. This aligns with the first objective of the
study, which focuses on identifying user needs and operational challenges. Data were gathered through
interviews with the landlady, the first in February 2026, through observation, and through a review of
her income and expense workbook, to examine existing administrative practices, including the use of manual
ledgers, fragmented financial tracking, and unstructured communication for maintenance requests. These
findings revealed inefficiencies such as inconsistent record-keeping, delayed communication, and lack
of centralized monitoring. Two later rounds of written questions, answered on 17 September and 12 October 2026, settled what
the interviews had left open. Based on these insights, the researchers defined the system requirements,
scope, and core functionalities of Hivelet. Emphasis was placed on the need for a centralized digital
platform capable of integrating booking, financial tracking, and maintenance management within a
unified system.

### 3.2.2 Design

During the Design phase, the identified requirements were translated into system architecture and
interface prototypes. The researchers developed the interface as working prototypes in code, covering
three user roles: public users, tenants, and administrators. Each prototype was reviewed with the
landlady on the device she uses, and the findings were applied in the next iteration (Chapter 4,
Table 23). The system was designed with consideration for a resource-constrained environment,
characterized by limited infrastructure, unstable internet connectivity, and minimal administrative
resources. To address these constraints, Hivelet was structured as a lightweight Progressive Web
Application (PWA) with optimized performance, simple navigation, and minimal system requirements.

Workflows for booking, financial monitoring, and maintenance requests were mapped and refined through
stakeholder feedback to ensure alignment with real-world operations.

### 3.2.3 Development

This phase corresponds to the second objective of the study, which focuses on developing the system.
The researchers implemented the Hivelet system using Vue 3 with TypeScript for the front-end
interface, ensuring responsiveness across devices. The back-end was developed using Node.js and
Express.js in TypeScript to manage core functionalities such as booking processing, financial
computations, and maintenance ticket handling. An optional online payment feature was implemented
through the Adyen payment gateway, allowing a tenant to settle a bill through GCash without replacing
the primary cash-based financial workflow. PostgreSQL, hosted on Supabase, was used as the database
management system to store tenant records, transaction data, and system logs. The system was developed
incrementally, following Agile principles, allowing continuous refinement based on feedback and
testing results.

### 3.2.4 Testing

Aligned with the third objective, testing was carried out in four layers, each answering a different
question. The test levels, unit and integration, system, and acceptance, are those defined in
ISO/IEC/IEEE 29119-1 (International Organization for Standardization, International Electrotechnical Commission, &
Institute of Electrical and Electronics Engineers [ISO/IEC/IEEE], 2022), and each test was planned as a measure of the ISO/IEC 25010
sub-characteristics listed in Table 4B.

**Automated verification.** Twenty check suites were written alongside the system. They verify every
endpoint and the separation of roles, re-derive the owner's ledger and exported reports from the
database, check the payment gateway's message signatures, and confirm that no screen presents stored
or empty data as a live figure. They run against the live system without writing to it, and were run
after every significant change.

**Screen-versus-database audit.** Each figure shown on each screen was compared with a read-only query
of the live database for the same records, to confirm that a screen shows a person what the database
holds for them.

**Offline, installation, accessibility and simultaneous-use tests.** With an automated browser, the installed
application was opened without a connection and on throttled slow connections, and the live system was
read by several simulated simultaneous users, with every save blocked in the browser so that no record was written. The same browser scanned the
screens against the Web Content Accessibility Guidelines, levels A and AA (World Wide Web Consortium,
2023).

**Functional walkthrough and user acceptance testing.** A 26-step walkthrough exercised every function
that writes data once, on the one vacant unit. The owner and three tenants then used the live system
for their own tasks on their own devices, observed by the researchers, and the owner and two of the
tenants used it at the same time. Results are reported in Chapter 4, Section 4.3.

### 3.2.5 Deployment

After successful testing, the Hivelet system was deployed to Vercel, a cloud hosting service, with its
database hosted on Supabase, where the system is accessible through a public web address for
real-world usage and evaluation. A pilot implementation was conducted with selected users to validate
real-world performance before full deployment. The researchers performed the final system
configuration, database migration, and environment setup to ensure smooth operation.

### 3.2.6 Review and Maintenance

This phase complemented the evaluation procedure by implementing refinements and system improvements
based on the results gathered from testing and the ISO/IEC 25010 evaluation. Following Agile
principles, identified issues related to functional suitability, performance efficiency,
compatibility, usability, reliability, security, maintainability, and portability were addressed
through iterative optimization and maintenance activities.

## 3.3 Evaluation Procedure

The testing and the evaluation followed the ISO/IEC 25000 series of standards on software quality,
Systems and software Quality Requirements and Evaluation (SQuaRE). The quality model was that of
ISO/IEC 25010:2011, which divides the quality of a software product into eight characteristics and
thirty-one sub-characteristics, and defines a separate model of quality in use, the quality
experienced by users in their own context (ISO/IEC, 2011a). The evaluation followed the five steps of
the evaluation process in ISO/IEC 25040: establishing the evaluation requirements, specifying the
evaluation, designing it, executing it and concluding it (ISO/IEC, 2011b). Each characteristic was
judged on two kinds of evidence. Measured quality came from the tests described in Section 3.2.4,
each expressed as a measure of a sub-characteristic in the form ISO/IEC 25023 uses, a ratio X = A / B
such as the number of executed test steps that gave the correct result over the number executed
(ISO/IEC, 2016b). Rated quality came from the survey questionnaire, in which every item was assigned to
one sub-characteristic before it was answered (Table 4B). Quality in use was measured during the user
acceptance test as effectiveness (tasks completed), efficiency (time and wrong turns per task) and the
contexts covered, following ISO/IEC 25022 (ISO/IEC, 2016a). The survey used the 2011 edition's
characteristics; the 2023 revision of ISO/IEC 25010, which renames Usability and Portability and adds
Safety, was used only to show where each result falls in the newer model.

This phase directly supports the fourth objective of the study, which focuses on evaluating and
optimizing the system using the ISO/IEC 25010 Software Quality Model. To ensure a realistic measurement
of system performance and usability, the evaluation was conducted during actual use in the deployment
environment, with a specific emphasis on eight key attributes: functional suitability, performance
efficiency, compatibility, usability, reliability, security, maintainability, and portability.

A structured survey questionnaire was administered to four groups: the administrator of the boarding
house, its tenants, prospective tenants, and technical evaluators with a background in information
technology. Each group rated only the characteristics it is in a position to judge: tenants did not
rate Security or Maintainability, prospective tenants, who see only the public website, rated neither,
and only technical evaluators rated Maintainability, the group with the background to judge it. Responses were measured using the 5-point Likert scale (Likert, 1932) in Table 4, and mean scores were
interpreted using the ranges in Table 4A.

**Participants.** The landlady, who runs the boarding house day to day on behalf of its owner, took
part as the system's only administrator. Because she is the one person who uses the owner's side of
the system, Chapter 4 refers to her, in that role, as the owner. Tenants were chosen by purposive and convenience sampling (Etikan et al., 2016): from the tenants
at the boarding house on the evening of the test, the researchers chose ones who pay in cash on site,
ones less used to mobile applications, users of both Android and iPhone handsets, and residents of more than one cluster. Three tenants were observed because the number of new
usability problems found falls quickly with each additional tester (Nielsen & Landauer, 1993). One prospective tenant, a person who does
not live at the boarding house and was invited by the researchers to use the public website as someone
looking for a room would, used it on their own phone without an account: they browsed the units and
rates and sent an inquiry about a unit. The
administrator's reply was tested separately by the team. Five technical evaluators took part. The
first, an IT professional who works in software quality assurance, reviewed the running system on 3
October 2026. The other four, reached through Panelista, a platform that matches capstone projects
with volunteer evaluators, with at least three years' experience asked of each, reviewed a
demonstration copy of the system on 15 to 18 October: the same software on a separate database
holding sample data, so that no outside reviewer saw the owner's records. None inspected the source
code.

**Instruments.** Four instruments were used. Task cards were read aloud to each tester, in English and
Filipino. An observation sheet recorded, for each task, whether it was completed without help, with
help, or not at all, the time taken, and the number of wrong turns. A defect log was kept. The fourth
was the ISO/IEC 25010 survey questionnaire, with a separate section for each of the four respondent
groups (the administrator, tenants, prospective tenants and technical evaluators); the tenant and
prospective tenant sections were in English and Filipino.

**Data gathering.** Each tester gave written consent before taking part. Each used their own account on their own device while a
facilitator read the tasks without indicating where to tap and an observer completed the observation
sheet. Testers were asked to think aloud, saying, for example, whether they expected a change to their
personal details to save, whether a payment showed as settled once the owner confirmed it, and whether
a repair request appeared once sent; they were not interviewed during or after their tasks. When a
tester was stuck, help followed a fixed order: a neutral prompt after about thirty seconds ("What are
you looking for?"), then a hint about where to look, and only then a demonstration. A task finished
after the prompt counted as completed without help, one finished after the hint as completed with
help, and one that needed a demonstration as not completed. Photographs were taken for
documentation, only with the tester's permission; no screen was recorded. Each respondent answered the survey after using the system,
without the researchers viewing their answers: the tenants and the prospective tenant straight after
their tasks, the administrator the same evening, the first technical evaluator the day after the
evaluators' review, and the other four after their reviews of the demonstration copy. Page load times were measured once per screen
on the devices named in Section 3.1.2, with the browser's cache cleared for a first load.

**Statistical treatment.** For each survey item the weighted mean was computed as

WM = Σ(f × w) / N

where *f* is the number of respondents choosing a rating, *w* the rating (1 to 5) and *N* the number of
respondents, and interpreted using Table 4A. The composite mean of each characteristic is the mean of
its item means, computed per respondent group and then as the mean of the group means, so that one
administrator is not outweighed by several tenants on functions only she uses; the overall mean is the
mean of the eight composites. For the acceptance test, the task completion rate is the number of tasks
completed without help divided by the number attempted, reported with the median time per task and the
mean number of wrong turns, following the effectiveness and efficiency measures of the ISO/IEC 25010
quality in use model.

The responses are summarized with descriptive statistics, the weighted mean of each item and the
composite mean of each characteristic, and read alongside the results of the tests in Section 3.2.4. No
inferential test is made, so the results are reported as descriptions of how the respondents rated
the system.

**Table 4.** Likert scale

| Scale | Meaning | Description |
| :---: | :--- | :--- |
| 5 | Strongly Agree | The respondent strongly agrees with the statement |
| 4 | Agree | The respondent agrees with the statement |
| 3 | Neutral | The respondent neither agrees nor disagrees with the statement |
| 2 | Disagree | The respondent disagrees with the statement |
| 1 | Strongly Disagree | The respondent strongly disagrees with the statement |

The mean of each item, and the composite mean of each characteristic, is interpreted with Table 4A.
The range from 1 to 5 is divided into five equal intervals of 0.80.

**Table 4A.** Interpretation of mean scores

| Mean score | Verbal interpretation |
| :--- | :--- |
| 4.21 – 5.00 | Very High Quality |
| 3.41 – 4.20 | High Quality |
| 2.61 – 3.40 | Moderate Quality |
| 1.81 – 2.60 | Low Quality |
| 1.00 – 1.80 | Very Low Quality |

Table 4B assigns every survey item and every test to the sub-characteristic it measures. Item numbers
are those of each group's section of the questionnaire (O = administrator, T = tenants, E = technical
evaluators, P = prospective tenants).

**Table 4B.** Survey items and tests assigned to the ISO/IEC 25010:2011 sub-characteristics

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
| | Replaceability | | | | | Export in the owner's layout |

## 3.4 Ethical Considerations

The study used the owner's real records and the tenants' real accounts, so it followed the Data Privacy Act of 2012 (Republic Act No. 10173, 2012). Participation was voluntary and could be withdrawn at any
time without any effect on a tenant's tenancy. Each tenant used only their own account, which shows
only their own records, and received an individual starting password in person, which they replaced at
first sign-in. Respondents could give a name so that the researchers could tell the responses apart; the
names were removed before the responses were analyzed, and none appears in this paper. Names, contact details and amounts are hidden in every
figure in this paper, and faces appear only with consent. Photographs and notes were kept by the
research team and will be deleted after the defense.
