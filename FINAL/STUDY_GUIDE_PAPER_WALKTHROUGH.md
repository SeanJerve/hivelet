# Study guide: the paper, section by section

**For every member of the team.** This guide walks through the final paper in this folder, in the
paper's own order and with the paper's own section numbers, so that each of you can explain any part
of it to the panel. It covers the abstract, all five chapters, the references and every appendix.

Everything here is taken from the final chapters (01_ABSTRACT.md to 08_APPENDICES.md and the
appendices/ folder) as they stood on 24 October 2026. **If a chapter says something different from
this guide, the chapter wins.**

## How the paper is organised

| Part | What it does | File |
| :--- | :--- | :--- |
| Abstract | The whole study in one paragraph | 01_ABSTRACT.md |
| Chapter 1, Introduction | The problem, the four objectives, why it matters, what is in and out of scope | 02_CHAPTER_1_INTRODUCTION.md |
| Chapter 2, Theoretical Framework | What other studies found, the gap, the conceptual framework, the terms | 03_CHAPTER_2_THEORETICAL_FRAMEWORK.md |
| Chapter 3, Materials and Methods | The tools, the Agile method, how the system was tested and evaluated, ethics | 04_CHAPTER_3_MATERIALS_AND_METHODS.md |
| Chapter 4, Results and Discussion | One section per objective (4.1 to 4.4), then the deployment plan (4.5) | 05_CHAPTER_4_RESULTS_AND_DISCUSSION.md |
| Chapter 5, Summary, Conclusions and Recommendations | What was found, whether each objective was met, what to do next | 06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md |
| References | 35 sources | 07_REFERENCES.md |
| Appendices A to Q | The evidence and the documents behind the chapters | 08_APPENDICES.md and appendices/ |

The key idea that ties it together: **Chapter 1 sets four objectives, and Chapter 4 has one section
for each** (4.1 answers Objective 1, 4.2 Objective 2, 4.3 Objective 3, 4.4 Objective 4). Chapter 5
then says, objective by objective, that each was met.

## How to use this guide

1. Read one chapter of the paper.
2. Then read the matching part here. Each section has:
   - **What it says**: the section in plain words.
   - **Key facts and numbers**: copied exactly from the paper. Do not round them.
   - **Tables and figures**: what each one shows and how to read it.
   - **If the panel asks**: one or two likely questions, with a short answer from the paper.
3. At the end, try the checklist **"Can you explain these without notes?"**

Other guides in this folder go deeper on some things. This guide links to them instead of repeating
them:

- [STUDY_GUIDE_TEAM_REVIEWER.md](STUDY_GUIDE_TEAM_REVIEWER.md): the whole capstone in one sitting, a
  tour of every screen, and a word list.
- [STUDY_GUIDE_DEFENSE_QA.md](STUDY_GUIDE_DEFENSE_QA.md): the panel's likely questions with longer
  answers.
- [STUDY_GUIDE_REFERENCES.md](STUDY_GUIDE_REFERENCES.md): every reference, what it found and where
  the paper uses it.

**Four wording rules for the defense** (the paper follows them; so must we):

- The property has **33 units**, 32 of them occupied.
- The **50% Share** is described only as: *a system-computed figure equal to half that row's Rent
  Amount, kept for ledger parity with the owner's historical spreadsheet.* Say nothing more about it.
- **Adyen with GCash** is configured and working, on Adyen's test account. The owner sets every rate
  by hand; nothing raises rent automatically.
- Since 20 October 2026, nobody signs in with or gives an email; sign-in is by login ID or phone
  number.

---

# ABSTRACT

**What it says**
- Small boarding houses often run on spreadsheets, paper receipts and messages that are not connected,
  and the general property management systems on the market do not fit them.
- The team designed, developed and evaluated **Hivelet**, a web-based apartment management system
  delivered as a Progressive Web Application, for the Fe Galang Da Silva Boarding House.
- Moving the owner's real records into the system exposed problems the spreadsheet had hidden.
- The system was tested at three levels and evaluated on ISO/IEC 25010, and it met its general
  objective.

**Key facts and numbers**
- "a 33-unit property in Legazpi City".
- Her records: **937 income rows and 1,327 expense allocations**.
- Built in **three Agile iterations** with **Vue, Express and PostgreSQL**.
- Features: tenant and room management, inquiries about units, financial tracking with optional GCash
  payment through Adyen, maintenance requests with notifications, role-based access control, and
  installation from the browser without an app store.
- Tested at the unit and integration, system, and acceptance levels: **82 of the 83 tests executed
  passed (98.8 percent)**, no critical defect.
- Three tenants completed every task they attempted, **31 of 34 attempts without help**.
- Evaluated on the eight characteristics of **ISO/IEC 25010:2011**, following the **ISO/IEC 25040**
  evaluation process, using two kinds of evidence: measures from the tests, and a survey of the owner,
  three tenants, a prospective tenant and five technical evaluators.
- Rated **4.59 overall, Very High Quality**; every characteristic Very High Quality; **Portability
  highest, Maintainability lowest**; the measurements agreed with the ratings on every characteristic.

**Terms to know**
- **Progressive Web Application (PWA)**: a website that can be installed on a phone or computer from
  the browser and then works like an app, with no app store.
- **ISO/IEC 25010**: an international standard that describes software quality as eight
  characteristics (functional suitability, performance efficiency, compatibility, usability,
  reliability, security, maintainability, portability).
- **ISO/IEC 25040**: the standard that says how to carry out an evaluation, in five steps.

**If the panel asks**
- *"In one sentence, what did you find?"* "The results show that an integrated system can be fitted to
  a small, cash-based property without changing how its owner keeps her accounts" (Abstract).

---

# CHAPTER 1: INTRODUCTION

## 1.1 Background of the Study

**What it says**
- Apartment management means keeping tenant records, tracking money and handling maintenance, and it
  gets harder as the number of units grows.
- At the boarding house studied, records were kept in spreadsheets on a USB flash drive, and tenant
  concerns came by messaging app or by word of mouth. This is a **fragmented workflow**: records,
  messages and transactions sit in separate tools that do not talk to each other.
- Existing systems are built for large properties with stable infrastructure and staff. Local
  Philippine studies each solve only one part (payments, booking, a school setting).
- The gap: **no integrated platform** that brings together tenant management, financial tracking,
  communication and booking for a small, resource-constrained boarding house. Hivelet is the answer.

**Key facts and numbers**
- Records "were kept on a USB flash drive", with risks of "accidental deletion, file corruption,
  duplication, and lack of version control".
- Rent "is still collected in cash".
- A review of **213 studies** found real estate still needs to improve its adoption of digital tools
  (Ullah et al., 2018).
- Studies cited: Burke (2026); Mia et al. (2024); Kotkar et al. (2026); Ullah et al. (2018); Magno et
  al. (2024); Pavia et al. (2022, Bicol College); Pernate et al. (2025, Ormoc City); Mangca (2023b,
  Surigao City).

**If the panel asks**
- *"Why not just use an existing property management system?"* Many are "designed with assumptions
  aligned to large-scale or commercial property environments, such as stable infrastructure,
  structured workflows, and dedicated administrative personnel", which a small boarding house does not
  have.
- *"How is Magno et al. (2024) different from yours?"* Their system "primarily focuses on financial
  transactions and task management, without integrating communication, booking, and tenant
  interaction workflows into a unified system."

## 1.2 Objectives of the Study

**What it says**
- The **general objective**: to design, develop and evaluate Hivelet, a web-based apartment
  management system that improves administrative workflow integration, communication and operational
  control, for small, resource-constrained boarding houses.
- Four **specific objectives** follow. Learn them in order, because Chapter 4 and Chapter 5 follow the
  same order.

**Key facts and numbers**
1. **Analyze** the existing practices of the Fe Galang Da Silva Boarding House (tenant management,
   financial tracking, communication, booking) and set the system requirements.
2. **Develop** Hivelet with six features: tenant and room management; booking and reservation
   management; financial tracking with optional online payment recording; a maintenance ticketing and
   notification system; role-based access control for administrators and tenants; PWA support.
3. **Pilot test** it for functionality, responsiveness and operational performance.
4. **Evaluate and optimize** it on the ISO/IEC 25010 model: Functional suitability, Performance
   efficiency, Compatibility, Usability, Reliability, Security, Maintainability, Portability.

**If the panel asks**
- *"Where do you show each objective was met?"* Objective 1 in Section 4.1, 2 in 4.2, 3 in 4.3, 4 in
  4.4; and each one is concluded in Section 5.2, conclusions 1 to 4.
- *"What does 'pilot test' mean here?"* Testing on the real system, with its real users, before full
  use. Section 4.3 says the three qualities map to ISO/IEC 25010: functionality is Functional
  Suitability, responsiveness is the time behaviour of Performance Efficiency, and operational
  performance is capacity and Reliability.

## 1.3 Significance of the Study

**What it says**
- **For owners and administrators**: one central system instead of spreadsheets on a USB flash drive,
  which are prone to inconsistency, loss and duplication.
- **For tenants**: a structured way to send and follow maintenance concerns and see their own account,
  instead of messages and verbal reports that get lost.
- **For future researchers**: a local example of a PWA-based property system for small residential
  settings, and an example of evaluation with ISO/IEC 25010.

**If the panel asks**
- *"Who benefits most?"* The paper names three groups: property administrators and owners, tenants,
  and future researchers.

## 1.4 Scope and Delimitations

**What it says**
- **Scope** (what is in): moving the boarding house from spreadsheet and paper administration to one
  digital system, with room and tenant management, a public booking module for inquiries without an
  account, financial tracking (mainly cash, with optional GCash), and issue ticketing for maintenance.
- **Delimitations** (what is out, or limited): saving data, real-time updates and booking updates need
  the internet; offline access is limited to cached (stored) resources. Online payment excludes
  refunds, automated reconciliation with bank records, and direct banking integration.
- Each GCash payment is recorded as pending and counts only after the administrator verifies it.

**Key facts and numbers**
- "the 33-unit Fe Galang Da Silva Boarding House, at 32 Sampaguita Street, Barangay 4 Sagpon, Old
  Albay District, Legazpi City, near Bicol University".
- Refunds "are made from the gateway's own dashboard".
- Evaluated against ISO/IEC 25010 on all eight characteristics.

**Terms to know**
- **Scope** is what the study covers; **delimitations** are the limits the team chose on purpose.
- **Cached resources**: files the app keeps on the device so it can open without a connection.

**If the panel asks**
- *"Does the system work offline?"* Only partly, by design: "core functionalities, such as data
  encoding, real-time synchronization, and booking updates, strictly require an active internet
  connection." (Section 4.2.7 adds that the installed app shows a read-only copy of the last figures.)
- *"Can a tenant get a refund through Hivelet?"* No. The feature "explicitly excludes refunds, which
  are made from the gateway's own dashboard".

---

# CHAPTER 2: THEORETICAL FRAMEWORK

**Chapter opening: what it says**
- The chapter joins five bodies of literature: property management systems, Management Information
  Systems (MIS), financial analytics, digital communication systems and PWAs.
- Its argument: problems in small residential operations come mainly from **fragmented**
  administration, not from a lack of technology.

## 2.1 Review of Related Literature

This section has six subsections. Each one takes one theme and lists what the studies found.
For each reference in depth, see [STUDY_GUIDE_REFERENCES.md](STUDY_GUIDE_REFERENCES.md).

### 2.1.1 Fragmentation and Operational Inefficiencies in Property Management

**What it says**
- As tenants, transactions and repairs grow, manual records, spreadsheets and informal messages
  become hard to keep accurate.
- Studies from abroad and in the Philippines show the same problem.
- The main challenge is "not the absence of digital tools but the absence of a structure that
  consolidates administrative functions into one environment".

**Key facts and numbers**
- Burke (2026): apartment complexes of **50 to 500 units**; operational, tenant, regulatory, labor and
  technology challenges.
- Thevaraju et al. (2019): an apartment of **eight blocks and more than 1,000 units**, maintenance
  recorded by hand; they built a web system with Agile.
- Ullah et al. (2018): review of **213 studies** of smart real estate technology.
- Magno et al. (2024): digitization improves data consistency and transaction monitoring.
- Pavia et al. (2022): a property management system in a mock hotel for hospitality students, an
  institutional setting unlike a small apartment.

**If the panel asks**
- *"What is the one lesson of this subsection?"* The problem is fragmentation: the records exist but
  are not connected.

### 2.1.2 Management Information Systems as the Foundation of Centralization

**What it says**
- A **Management Information System (MIS)** collects, processes, stores and shares information to
  support control, coordination and decisions (Laudon et al., 2026).
- Without one, information sits in isolated records and tools, which is why manual work becomes
  inefficient.
- Integrated systems reduce redundancy and keep data consistent (Pressman & Maxim, 2020); data quality
  improves decision-making (Ghasemaghaei et al., 2018).

**Figure 2-1. Management Information System (MIS) framework, adapted from Laudon et al. (2026).**
- *What it shows*: an organization inside its environment. Inside the organization is an information
  system: **Input**, then **Processing** (classify, arrange, calculate), then **Output**, with a
  **Feedback** arrow from output back to input.
- *How to read it*: follow the arrows left to right, then the feedback loop back. Around the edge are
  outside parties (suppliers, customers, regulatory agencies, stockholders, competitors). The paper
  says it "illustrates the flow from operational inputs through processing to outputs that support
  decision-making."

**If the panel asks**
- *"Why is MIS your theoretical foundation?"* Because it explains the problem: information spread
  across "isolated records, disconnected tools, and inconsistent communication channels" cannot
  support decisions until it is centralized.

### 2.1.3 Financial Analytics and Administrative Decision Support

**What it says**
- Money problems appear when payment records are fragmented or manual.
- Structured, centralized financial records improve oversight and transparency and reduce errors.
- Financial records should be treated as decision support, integrated into the central system rather
  than kept as a separate feature.

**Key facts and numbers**
- Encarnacion et al. (2025): a payment monitoring system for student boarding houses.
- Magno et al. (2024) and Setty (2022): digital and centralized financial records.
- Caparos et al. (2025): a cloud-based property system for a real estate business in **Region XII**;
  staff rated it positively, **security highest**.

**If the panel asks**
- *"Which study supports your financial module?"* Encarnacion et al. (2025) and Setty (2022); Chapter
  4 (Section 4.2.4) says Hivelet's results agree with them.

### 2.1.4 Digital Communication and Structured Issue Resolution

**What it says**
- Informal messages lead to late replies, untracked requests and unhappy tenants.
- Recording a complaint as a request is what makes it traceable "from report to resolution".
- Booking studies in the Philippines focus on how a tenant finds and books a room.
- The closest study is FixHub (Canlas et al., 2026), a Philippine dormitory maintenance system
  evaluated with ISO/IEC 25010.

**Key facts and numbers**
- Jing and Lim (2021): high-rise apartments in China; the quality of the management process matters
  most to satisfaction.
- Altinay et al. (2024): interviewed **150 dormitory residents**.
- Saputra et al. (2025): a boarding house room system; tested with its administrator and **ten
  tenants**; **90 percent** were satisfied.
- Pernate et al. (2025), Ormoc City: rated **Excellent** by owners and **Very Good** by tenants, with
  Agile and ISO/IEC 25010.
- Mangca (2023b), Surigao City: web booking with SMS notifications; Mangca (2023a) is its assessment.
- Canlas et al. (2026), FixHub: Agile, ISO/IEC 25010 and the Technology Acceptance Model; surveys of
  tenants, administrators and IT professionals.

**If the panel asks**
- *"Which study is closest to yours, and how is yours different?"* Canlas et al. (2026). Its scope is
  "maintenance concerns, emergency alerts, and complaints"; Hivelet also covers money, tenants and
  inquiries.
- *"Why do Mangca 2023a and 2023b have letters?"* Two works by the same author in the same year are
  told apart with a and b.

### 2.1.5 Progressive Web Applications as an Accessibility and Integration Framework

**What it says**
- A PWA uses a **web app manifest** (a file that names the app and its icon) and a **service worker**
  (a script that keeps the app's files on the device) so a website installs and works like an app,
  even offline or on a weak connection.
- One application can serve many platforms without a separate native app for each.
- This matters for small operations with limited infrastructure, weak connections and different
  devices.

**Key facts and numbers**
- Muawwal (2024); Biørn-Hansen et al. (2017); Anuar and Othman (2024) on PWA usability heuristics; Mia
  et al. (2024) on barriers for Philippine small enterprises.
- "A PWA is therefore the delivery layer that keeps the centralized functions of an MIS accessible
  across devices and conditions."

**If the panel asks**
- *"Why a PWA and not a native app?"* One code base works on every device, it installs without an app
  store, and it stays reachable on unstable connections (Biørn-Hansen et al., 2017; Muawwal, 2024).

### 2.1.6 Synthesis of Literature

**What it says**
- A **synthesis** pulls the reviewed studies together into one conclusion.
- Property studies show disconnected workflows; information systems studies explain them; financial
  and communication studies show that structure helps; PWA studies show how to keep it accessible.
- Recent housing systems were evaluated with ISO/IEC 25010 (Canlas et al., 2026; Pernate et al.,
  2025), the model this study uses.
- But these solutions are usually built **in isolation**, one function at a time. So an integrated
  framework is needed.

**If the panel asks**
- *"Summarize your literature review in one sentence."* "Operational inefficiencies in apartment
  management environments primarily emerge from fragmented administrative structures rather than the
  complete absence of digital technologies."

## 2.2 Gap Bridged by the Study

**What it says**
- The **research gap**: no integrated apartment management system designed for small,
  resource-constrained operations.
- Existing systems are either enterprise platforms or single-function tools (payments, booking,
  tenants or maintenance).
- Hivelet fills the gap by combining MIS principles, financial tracking, issue ticketing, tenant
  management, booking and cross-device access in one platform.

**Key facts and numbers**
- Single-function examples: Magno et al. (2024); Mangca (2023b); Pernate et al. (2025); Saputra et al.
  (2025); Setty (2022).
- Puspasari et al. (2025): a boarding house system that monitors rooms and sends billing notices
  through WhatsApp, but "its only user is the boarding house manager, so tenants cannot see their own
  bills or report a concern through it."

**If the panel asks**
- *"What exactly is your gap?"* "The absence of an integrated apartment management system specifically
  designed for small-scale and resource-constrained residential operations."

## 2.3 Concept of the Study

**What it says**
- The study's idea is to improve apartment management by integrating its core processes into one
  digital platform.
- It is drawn as an **Input-Process-Output (IPO) model**: inputs are turned by a process into outputs,
  with feedback back to the start.

**Figure 2-2. Conceptual Framework.**
- *What it shows*: three boxes, **Input**, **Process** and **Output**, joined by arrows, with a
  **Feedback** box returning from Output to Input.
- *How to read it*:
  - **Input**: the objectives of the study; the review of related literature; client interviews and
    observations of the workflow; and payment (integration and payment workflow).
  - **Process**: **Agile**, in which the modules are built: financial tracking (analytics, reports),
    booking (reservations, logic), tenant management (profiles, records), maintenance ticketing
    (requests, notifications) and the Adyen Payment API with GCash.
  - **Output**: the Hivelet system and its modules, the finished research manuscript, the system
    evaluation results (ISO/IEC 25010:2011) and the user manual.
  - **Feedback**: refinement in every phase from user evaluation and performance.

**If the panel asks**
- *"What are the outputs of your study?"* The system and its modules, reports exportable as Excel
  files, inquiry, tenancy and payment records, the manuscript, the ISO/IEC 25010 evaluation results,
  and the user manual.

## 2.4 Definition of Terms

**What it says**
- This section defines the words the paper uses in a particular way. These are **operational
  definitions**: what the word means in this study.

**Key facts and numbers** (learn these definitions; they are the paper's own words in short)
- **Hivelet**: the web-based apartment management system, a PWA, for the Fe Galang Da Silva Boarding
  House.
- **Resource-Constrained Environment**: limited money, minimal technical infrastructure, few staff.
- **Fragmented Workflow**: work done in disconnected tools (spreadsheets, paper, messaging apps).
- **Centralized System**: all data and processes in one integrated platform.
- **Booking Inquiry**: a prospective tenant's request about a room, reviewed by the administrator.
- **Issue Ticketing System**: tenants submit concerns that are tracked, assigned and resolved.
- **Role-Based Access Control (RBAC)**: each role (admin, tenant) can use only its own functions.
- **Optional Online Payment Feature**: paying a bill through GCash using Adyen; it "enters a pending
  state and is settled only after the administrator verifies it."
- **ISO/IEC 25010:2011**: eight characteristics, **thirty-one sub-characteristics**, plus a model of
  quality in use with five characteristics (effectiveness, efficiency, satisfaction, freedom from risk,
  context coverage). The **2023 revision** renamed usability as interaction capability and portability
  as flexibility, added safety as a ninth characteristic, and moved quality in use to a separate
  standard.
- **Adyen**: the payment gateway; "In this study it runs on Adyen's test account".
- **GCash**: a Philippine mobile wallet.
- **Landlady**: runs the boarding house day to day on behalf of its owner; the system's only
  administrator. **Owner**: in Chapter 4, the landlady in her role as administrator.
- **Tenant**, **Prospective Tenant**, **Technical Evaluator** (an IT professional from outside the
  team).
- **User Acceptance Testing (UAT)**: the intended users do their own tasks on the live system.
- **Weighted Mean**: the sum of each rating times the number who chose it, divided by the number of
  respondents.
- **50% Share**: "A system-computed figure equal to half that row's Rent Amount, kept for ledger parity
  with the owner's historical spreadsheet."

**If the panel asks**
- *"Why does Chapter 4 say 'owner' when she is the landlady?"* Section 2.4 and Section 3.3 explain it:
  she is the one person who uses the owner's side of the system, so Chapter 4 calls her the owner in
  that role.

---

# CHAPTER 3: MATERIALS AND METHODS

**Chapter opening: what it says**
- This chapter gives the tools used to build Hivelet, the method used to build it, and how it was
  tested and evaluated.

## 3.1 Materials

**What it says**
- The materials are the **software** (languages, frameworks, database) and **hardware** (equipment)
  used to design, build, test and deploy the PWA.

### 3.1.1 Software

**What it says**
- The screens are built with Vue 3 and TypeScript; the server with Node.js and Express in TypeScript;
  the data is in PostgreSQL on Supabase.
- **TypeScript** on both sides catches errors in "the shape of a record" before the system runs, which
  matters with real financial records.
- **PostgreSQL** was chosen for **row-level security** (the database itself decides who may read or
  change each row) and **triggers** (database rules that run automatically, here to keep a history of
  every room rate change).
- The interface was **prototyped directly in code**, generated with the help of an AI coding assistant
  and reviewed by the researchers, so the landlady and tenants could try it on their own phones.

**Table 3-1. Software requirements**
- *What it shows*: each software tool and its version.
- *How to read it*: left column the tool, right column the version. Rows: Visual Studio Code 1.85+;
  Vue 3 with TypeScript 3.5 / TypeScript 5.7; Vite (build tool) 5.4; Tailwind CSS 4.0; Node.js with
  Express.js (TypeScript) LTS (v18+) / Express 4.19; PostgreSQL, hosted on Supabase 17.6; Adyen Web
  Drop-in / API Library 6.44 / 32.0.
- The development environment ran on "Windows 10 or higher". Google Chrome was the main browser.

**If the panel asks**
- *"Why PostgreSQL?"* "for its row-level security ... and for database triggers, which keep a history
  of every room rate change regardless of how the change is made."
- *"Did you use Figma?"* No: "the user interface was prototyped directly in code rather than in a
  separate design tool."

### 3.1.2 Hardware

**What it says**
- A workstation (computer) and mobile phones were needed, because a PWA runs on both.
- Tables 3-2 and 3-3 give the **minimum** and **baseline** specifications. The last paragraph names the
  devices actually used in testing.

**Table 3-2. Workstation hardware specifications**
- *What it shows*: the minimum computer. Processor Intel Core i5 or AMD Ryzen 5; Memory 8 GB DDR4;
  Storage 256 GB Solid State Drive (SSD); Internet 25 Mbps broadband or fiber.

**Table 3-3. Mobile testing hardware specifications (baseline)**
- *What it shows*: the planned phone for testing. Android 13 or higher; octa-core (MediaTek Helio G99
  or equivalent); 8 GB RAM; 256 GB storage; 6.78-inch FHD+ display.

**Key facts and numbers** (devices actually used)
- Workstation: a **Dell XPS 15** with **Google Chrome 154**.
- Response times: on the laptop over the boarding house's Wi-Fi, and on an **iPhone 15 in Safari over
  mobile data**.
- Offline, installation and browser tests also used an **Infinix GT20** with Android and Chrome.
- The administrator used her own **Acer Nitro V 15** with Chrome.

**If the panel asks**
- *"Table 3-3 is a baseline. Which phones did you really use?"* An iPhone 15 and an Infinix GT20, plus
  the tenants' own phones (Table 4-21 also lists an iPhone 13).

## 3.2 Software Methodology

**What it says**
- The team used the **Agile Software Development Life Cycle (SDLC)**. Agile builds software in short,
  repeated cycles (iterations), working closely with the client and changing course on feedback,
  instead of one long fixed plan.
- Agile was chosen because the boarding house's needs changed, and it let the team work continuously
  with the landlady.
- The system was assessed against ISO/IEC 25010:2011 on its eight characteristics.

**Figure 3-1. Agile Software Development Life Cycle.**
- *What it shows*: a circle of six phases around the word AGILE: **1 Requirements**, **2 Design**,
  **3 Development**, **4 Testing**, **5 Deployment**, **6 Review and Maintenance**, then back to 1.
- *How to read it*: follow the arrows around the circle. Each lap is one iteration. Sections 3.2.1 to
  3.2.6 describe the six phases in the same order.

**If the panel asks**
- *"Why Agile and not Waterfall?"* "Agile supports early identification of system issues through
  iterative cycles of development and testing", and it allowed "continuous interaction with the
  landlady and management".
- *"How many iterations?"* Three (Section 4.2.1).

### 3.2.1 Requirements

**What it says**
- **Needfinding**: finding out what the users need. The team interviewed the landlady, observed her
  work and reviewed her income and expense workbook.
- They found manual ledgers, fragmented money tracking and unstructured maintenance requests.
- This phase serves Objective 1.

**Key facts and numbers**
- First interview: **February 2026**.
- Two later rounds of written questions, answered on **17 September and 12 October 2026**.

**If the panel asks**
- *"How did you gather requirements?"* Interviews (the first in February 2026), observation, a review
  of her workbook, and two rounds of written questions.

### 3.2.2 Design

**What it says**
- Requirements were turned into architecture and **working prototypes in code** for three user roles:
  public users, tenants and administrators.
- Each prototype was reviewed with the landlady on her own device, and the findings went into the next
  iteration (Table 4-19).
- Designed to be lightweight, simple to navigate, and to need little equipment.

**If the panel asks**
- *"How did the client take part in design?"* Each prototype "was reviewed with the landlady on the
  device she uses".

### 3.2.3 Development

**What it says**
- This phase serves Objective 2.
- Vue 3 with TypeScript for the screens; Node.js and Express in TypeScript for the server; PostgreSQL
  on Supabase for data; Adyen for optional GCash payment, without replacing the main cash workflow.
- Built step by step, following Agile.

### 3.2.4 Testing

**What it says**
- This phase serves Objective 3. Testing was done in **four layers**. The test levels come from
  **ISO/IEC/IEEE 29119-1**, a testing standard: **unit and integration** (small parts and how they
  connect), **system** (the whole system) and **acceptance** (the real users decide if it meets their
  needs).
- Each test was planned in advance as a measure of an ISO/IEC 25010 sub-characteristic (Table 3-6).

**Key facts and numbers** (the four layers)
1. **Automated verification**: **twenty check suites** that test every endpoint (address on the server
   the screens call) and role separation, re-derive the ledger and reports from the database, check the
   payment gateway's message signatures, and confirm no screen shows stored or empty data as live. They
   run against the live system **without writing to it**.
2. **Screen-versus-database audit**: each figure on each screen compared with a read-only query of the
   live database.
3. **Offline, installation, accessibility and simultaneous-use tests**: with an automated browser; every
   save blocked so nothing was written; screens scanned against the **Web Content Accessibility
   Guidelines (WCAG)**, levels A and AA.
4. **Functional walkthrough and user acceptance testing**: a **26-step walkthrough** of every function
   that writes data, on the one vacant unit; then the owner and three tenants used the live system for
   their own tasks.

**If the panel asks**
- *"How could you test on real financial records safely?"* The automated suites "run against the live
  system without writing to it", the browser tests blocked every save, and the walkthrough used "the
  one vacant unit".

### 3.2.5 Deployment

**What it says**
- After testing, the system was deployed to **Vercel** (a cloud hosting service), with the database on
  **Supabase**, at a public web address.
- A pilot was run with selected users before full deployment.

### 3.2.6 Review and Maintenance

**What it says**
- Refinements were made from the testing and evaluation results, across all eight ISO/IEC 25010
  characteristics, following Agile.

## 3.3 Evaluation Procedure

This is the most important methods section for the defense. It explains how the 4.59 was produced.

**What it says**
- Testing and evaluation follow the **ISO/IEC 25000 series**, called **SQuaRE** (Systems and software
  Quality Requirements and Evaluation). Inside that family:
  - **ISO/IEC 25010:2011** is the quality model (8 characteristics, 31 sub-characteristics, plus
    quality in use).
  - **ISO/IEC 25040** is the evaluation process in five steps: establish requirements, specify, design,
    execute, conclude.
  - **ISO/IEC 25023** says how to express a measure, as a ratio **X = A / B** (for example, test steps
    that passed over test steps executed).
  - **ISO/IEC 25022** says how to measure **quality in use** (effectiveness, efficiency, contexts
    covered).
- Each characteristic was judged on **two kinds of evidence**: **measured quality** (from the tests)
  and **rated quality** (from the survey).
- The survey used the 2011 edition; the 2023 edition was used only to show where results fall in the
  newer model.
- This section serves Objective 4.
- Four respondent groups: the administrator, tenants, prospective tenants and technical evaluators.
  **Each group rated only what it could judge**: tenants did not rate Security or Maintainability;
  prospective tenants rated neither; only technical evaluators rated Maintainability.

The section then has four labelled parts.

**Participants**
- The landlady took part as the only administrator; Chapter 4 calls her the owner.
- Tenants were chosen by **purposive and convenience sampling** (Etikan et al., 2016). Purposive means
  chosen for a purpose; convenience means chosen from those available. The team chose, from tenants at
  home that evening: cash payers, people less used to mobile apps, Android and iPhone users, and
  residents of more than one cluster.
- **Three tenants**, because "the number of new usability problems found falls quickly with each
  additional tester" (Nielsen & Landauer, 1993).
- **One prospective tenant** (not living there, invited by the team) used the public site on their own
  phone without an account.
- **Five technical evaluators**: the first, an IT professional in software quality assurance, reviewed
  the running system on **3 October 2026**; the other four came through **Panelista** (a platform that
  matches capstone projects with volunteer evaluators), each asked to have at least three years'
  experience, and reviewed a **demonstration copy** with sample data on **15 to 18 October**. "None
  inspected the source code."

**Instruments** (the tools used to collect data)
- Four instruments: **task cards** read aloud in English and Filipino; an **observation sheet**
  (completed without help, with help, or not at all; time; wrong turns); a **defect log**; and the
  **ISO/IEC 25010 survey questionnaire**, with a section for each group.

**Data gathering**
- Each tester gave **written consent**, used their own account and device, and was asked to **think
  aloud** (say what they expect as they go).
- Help followed a fixed order: a neutral prompt after about thirty seconds ("What are you looking
  for?"), then a hint, then a demonstration.
  - Finished after the prompt = **completed without help**.
  - Finished after the hint = **completed with help**.
  - Needed a demonstration = **not completed**.
- No screen was recorded; photographs only with permission.
- Page load times were measured once per screen with the browser cache cleared for a first load.

**Statistical treatment**
- **Weighted mean** of each survey item: **WM = Σ(f × w) / N**. Here *f* is how many respondents chose a
  rating, *w* is the rating (1 to 5), and *N* is the number of respondents. Σ means "add them all up".
- **Composite mean** of a characteristic: the mean of its item means, first per group, then the **mean
  of the group means**, "so that one administrator is not outweighed by several tenants on functions
  only she uses".
- **Overall mean**: the mean of the eight composites.
- Task completion rate: tasks completed without help ÷ tasks attempted, with the **median** time (the
  middle value) and the mean number of wrong turns.
- Only **descriptive statistics** (numbers that describe the data) were used. "No inferential test is
  made", so the results describe how these respondents rated the system and are not generalized to a
  wider population.

**Table 3-4. Likert scale**
- *What it shows*: the five answer choices. A **Likert scale** (Likert, 1932) asks how much a person
  agrees with a statement.
- *How to read it*: 5 Strongly Agree, 4 Agree, 3 Neutral, 2 Disagree, 1 Strongly Disagree.

**Table 3-5. Interpretation of mean scores**
- *What it shows*: how to turn a mean into words. "The range from 1 to 5 is divided into five equal
  intervals of 0.80."
- *How to read it*: find the band your mean falls in. 4.21 – 5.00 Very High Quality; 3.41 – 4.20 High
  Quality; 2.61 – 3.40 Moderate Quality; 1.81 – 2.60 Low Quality; 1.00 – 1.80 Very Low Quality. The
  important row is the top one: every result in Table 4-17 falls in it.

**Table 3-6. Survey items and tests assigned to the ISO/IEC 25010:2011 sub-characteristics**
- *What it shows*: for each of the 31 sub-characteristics, which survey items rate it and which test
  measures it.
- *How to read it*:
  - Columns **O, T, E, P** are the four sections of the questionnaire: **O** = administrator (owner),
    **T** = tenants, **E** = technical evaluators, **P** = prospective tenants. The numbers are the item
    numbers in that section (see Appendix J).
  - The last column is the test that measures it (from Section 3.2.4).
  - A blank in O to P means no survey item; "(rated only)" means no test; "(not evaluated)" means
    neither.
- *Important cells*: **User interface aesthetics** and **Reusability** are "(not evaluated)", which is
  why Chapter 4 says two sub-characteristics have neither evidence. **Maintainability** items are only
  in column E.

**If the panel asks**
- *"Why the mean of group means instead of averaging everyone?"* So that "one administrator is not
  outweighed by several tenants on functions only she uses". (Section 4.4.2 gives the other result:
  averaging everyone gives 4.47.)
- *"Why only three tenants?"* Purposive and convenience sampling, and Nielsen and Landauer (1993):
  each extra tester finds fewer new usability problems.
- *"Can you generalize your results?"* No. "No inferential test is made, so the results are reported as
  descriptions of how the respondents rated the system."

## 3.4 Ethical Considerations

**What it says**
- Because real records and real tenant accounts were used, the study followed the **Data Privacy Act
  of 2012 (Republic Act No. 10173)**.
- Taking part was voluntary and could be withdrawn with no effect on a tenancy.
- Each tenant used only their own account, with an individual starting password given in person and
  replaced at first sign-in.
- Names were removed before analysis and appear nowhere in the paper. Names, contact details and
  amounts are hidden in every figure; faces only with consent.
- Photographs and notes "will be deleted after the defense".

**If the panel asks**
- *"How did you protect the tenants' data?"* The Data Privacy Act of 2012, voluntary consent, own
  accounts only, names removed before analysis, and names and amounts hidden in every figure.

---

# CHAPTER 4: RESULTS AND DISCUSSION

**Chapter opening: what it says**
- The results follow the four objectives: **4.1** (Objective 1), **4.2** (Objective 2), **4.3**
  (Objective 3), **4.4** (Objective 4), then **4.5**, the deployment plan.
- Every quality characteristic is judged on two kinds of evidence: what was measured in testing, and
  how users rated it.

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

*Answers Objective 1.*

**What it says**
- The section first describes the property, then the old practices (4.1.1) and the requirements that
  came from them (4.1.2).

**Key facts and numbers**
- **33 rentable units in five clusters**: Boarding House (22 units), Back Apartment (5), Front
  Apartment (3), Penthouse (1), Linda (2).
- Three residential floors and a rooftop penthouse level: **11, 11, 10 and 1 units**.
- **32 of the 33 units are occupied** at the time of writing.
- The owner confirmed these figures on **13 September 2026**.

### 4.1.1 Existing Practices and Identified Problems

**What it says**
- Before Hivelet, the owner kept a two-sheet workbook (**Monthly Income Report** and **Monthly
  Expenses Report**) on a USB flash drive, plus a paper invoice book. Rent was cash on site; requests
  came by messaging app or in person; inquiries left no record.
- The strongest evidence came from her own records: moving them into the system exposed hidden
  problems.
- The decisive finding: "each area kept its own informal record, and nothing connected one to another".

**Key facts and numbers**
- Transferred: **937 income rows and 1,327 expense allocations**.
- **402 of the 937 income rows (43%)** had no anniversary date and no deposit.
- **Five invoice numbers** were each used for two different payments, once for two tenants on the
  same day. They were kept exactly as she wrote them and are reported on every verification run.
- An **anniversary date** is the day of the month a tenancy started; the rent period runs from it.

**Table 4-1. Existing practices and identified problems**
- *What it shows*: for each of the four areas, what the owner did and what problem it caused.
- *How to read it*: one row per area (Tenant management, Financial tracking, Communication, Booking);
  middle column the old practice; right column the problem. Example: Financial tracking, "Income and
  expense sheets typed by hand; invoices written in a paper book", caused "Totals depend on manual
  arithmetic; nothing checks an invoice number against the book; one file on a USB flash drive is the
  only copy".

**Figure 4-1. The owner's process before the system.**
- *What it shows*: a swimlane diagram. Columns are the four areas (rent collection, expenses, repair
  requests, inquiries); rows are who acts (tenant or prospect, then owner), then the records kept, then
  the problem from Table 4-1.
- *How to read it*: follow each column down. Rent ends in the paper invoice book and the workbook on a
  USB flash drive (the only copy); repairs and inquiries end in "No record". That shows the
  fragmentation: every path ends in a separate record or none.

**If the panel asks**
- *"How do you know fragmentation was the real problem?"* Her own records: 43% of income rows lacked an
  anniversary date and deposit, and five invoice numbers were used twice. The records existed; they
  were not connected.
- *"Did you fix her duplicate invoice numbers?"* No. They were "kept exactly as she wrote them and are
  reported on every verification run."

### 4.1.2 System Requirements

**What it says**
- The analysis produced functional requirements (what the system must do), business rules (the rules
  of her business the system must follow) and non-functional requirements (how well it must do it).
- Each requirement is traced in a **traceability matrix** (a table linking each requirement to the
  part of the system that meets it).
- Questions that needed the owner's answer were asked, not assumed.

**Key facts and numbers**
- **44 functional requirements** and **49 business rules**.
- Graded against the code on **16 September 2026**: **25** implemented as worded, **15** in part,
  **1** in the interface only, **3** not as worded (what those three describe is visible to the owner in
  another form).
- **Ten non-functional requirements**: one per ISO/IEC 25010 characteristic plus two for auditability
  and exportability.
- The owner confirmed: a bill is **overdue from the day after its due date**; she **sets rates by
  hand**, so every rate change is recorded and no increase is applied automatically; a tenant needs no
  email address to be recorded; on **20 September 2026** she confirmed every unit's rate.
- Her answers of **12 October 2026**: the bottom figure of her income sheet is a year-to-date total;
  her **thirteen expense categories** stay and she may add her own; tenants do not report cash payments.
- Her workbook never recorded move-in dates, so the system shows them as not recorded.

**Table 4-2. Identified gaps, system requirements and implementing modules**
- *What it shows*: the chain from problem to solution, which is the proof that Objective 1 was met.
- *How to read it*: read each row left to right: the gap found, the requirement written for it, and
  the module (with its Chapter 4 section) that meets it. Example: "Requests not followed to completion"
  leads to "Record each request and its status until the owner closes it", met by "Maintenance
  Ticketing and Notification (4.2.5)". There are seven rows, covering all six modules (Financial
  Tracking appears twice).

**Table 4-3. Non-functional requirements and where each is measured**
- *What it shows*: the ten non-functional requirements, NFR-001 to NFR-010, and the section or table
  that reports each.
- *How to read it*: code, requirement, where measured. The important cell is **NFR-007** (modular,
  maintainable code): "Section 4.4.3 (Maintainability): partly met". It is the one requirement the paper
  says was only partly met.
- Note under the table: NFR-008 first named the university's server; on the adviser's advice the team
  used its own hosting, and the requirement was reworded.

**If the panel asks**
- *"Why only 25 of 44 as worded?"* The grading was against the exact wording; the three "not as worded"
  are things "visible to the owner in another form". (See
  [STUDY_GUIDE_DEFENSE_QA.md](STUDY_GUIDE_DEFENSE_QA.md), Section 1.)
- *"Does rent go up automatically?"* No. She sets rates by hand; every change is recorded and "no
  increase is applied automatically."

## 4.2 Development of the Hivelet System

*Answers Objective 2. Each feature the objective names has its own subsection.*

**What it says**
- Figures 4-2 to 4-6 model the system as built; Figures 4-7 to 4-11 show its screens as they stood on
  **5 October 2026**.
- The units, rates and statuses in Figures 4-7 and 4-8 are real; the names, payments, expenses and
  repair requests in Figures 4-7, 4-9, 4-10 and 4-11 are **sample records**, so no real tenant appears.

### 4.2.1 System Architecture and Technology Stack

**What it says**
- Built in **three Agile iterations**. Then the architecture (where each part runs), four diagrams of
  the design, and an extract of the data dictionary.
- The browser app talks to **one server program** (an Express API on Vercel), which alone reads or
  writes the database. **Row-level security** is on for every table.
- Payment details go from Adyen's own form to Adyen directly. Every database change is a **numbered,
  reviewable migration** (a file that changes the database in a recorded way).
- Some rules live in the database itself so nothing can bypass them.

**Key facts and numbers**
- Iteration 1: **24 July to 28 August 2026**, a working system and the owner's records transferred.
- Iteration 2: **12 to 14 September**, system and documents checked against each other, **22 recorded
  errors** corrected, automated checks added.
- Iteration 3: **15 September to the defense**, the owner's answers, real users, feedback, testing and
  evaluation.
- The formal ISO/IEC 25010 evaluation was done once, in the third iteration.
- The ERD (Figure 4-6), drawn from the database's own catalogue on **5 October 2026**: **21 tables**,
  each with a primary key, and **37 foreign keys**.
- Rules enforced by the database: one unit cannot have two active tenancies; one invoice number cannot
  be used twice for the same unit and month; a gateway reference cannot be recorded twice; the 50%
  Share and the remitted amount are computed columns.
- The complete dictionary, "every column of all 24 tables", is in Appendix N.

**Table 4-4. Technology stack of the developed system**
- *What it shows*: each layer of the system, the technology used, and its purpose.
- *How to read it*: Presentation (Vue 3.5, TypeScript 5.7, Vite 5.4, Tailwind CSS 4.0: the screens);
  Application (Node.js with Express 4.19 in TypeScript: rules, calculations, access checks); Data
  (PostgreSQL 17.6 on Supabase, with row-level security); Payment gateway (Adyen Web Drop-in 6.44, API
  Library 32.0, with GCash); Client delivery (PWA, vite-plugin-pwa); Hosting (Vercel).

**Figure 4-2. System architecture.**
- *What it shows*: three zones. **Client device** (the Hivelet web app, its service worker, and the
  Adyen Drop-in GCash form); **Vercel** (the static app files and the Express API at /api); **Supabase**
  (the PostgreSQL 17.6 database). The Adyen payment gateway and GCash sit to the side.
- *How to read it*: follow the arrows. The app gets its files from Vercel and sends requests over HTTPS
  with the sign-in token to the API; only the API queries the database. The API lists what it does
  (sign-in with signed tokens and bcrypt passwords, role checks, input validation, business rules, an
  audit record, workbook downloads). The bottom line: "Payment details go from the form to Adyen
  directly, never through the API".

**Figure 4-3. Context diagram.**
- *What it shows*: the whole system as one circle (process 0) with the four outside parties: Visitor or
  prospect, Owner (administrator), Tenant, and the Adyen payment gateway (GCash).
- *How to read it*: each arrow is data going in or out. For example, the owner sends payments with
  invoice numbers, and gets overview figures, ledgers and workbook downloads back.

**Figure 4-4. Level 1 data flow diagram.**
- *What it shows*: the system opened into **eight processes** and **six data stores**, in the
  **Yourdon-DeMarco notation** (circles are processes; open rectangles are stores; boxes are outside
  parties).
- *How to read it*: processes 1.0 Handle inquiries, 2.0 Manage units and rates, 3.0 Manage tenants and
  tenancies, 4.0 Bill and record payments, 5.0 Manage repair requests, 6.0 Record expenses, 7.0 Produce
  reports, 8.0 Sign in, manage own account. Stores D1 Units and rates, D2 Tenants and tenancies, D3
  Bills and receipts, D4 Expenses, D5 Inquiries, D6 Repair requests. The paper's own example: the owner
  records a cash receipt through **4.0**, which writes it to **D3**, and **7.0** reads it from D3 for the
  Overview and the Excel workbooks. Notifications and the audit record are left out for readability.

**Figure 4-5. Use case diagram.**
- *What it shows*: what each type of user can do. Actors (stick figures): Visitor or prospect, Tenant,
  Owner (administrator) and Adyen (GCash). Ovals are use cases.
- *How to read it*: a line from an actor to an oval means that actor may use that function. Shared
  ovals in the middle (sign in, update own details and password, read notifications, see own recent
  actions) connect to both tenant and owner. "Each use case is a function the server grants to that
  role and refuses to every other (Table 4-7)."

**Figure 4-6. Entity-relationship diagram.**
- *What it shows*: the database tables and how they link, in **Crow's Foot notation** (the line ends
  show "one" or "many").
- *How to read it*: rooms and profiles are the two centers. Every bill, payment, receipt, tenancy,
  repair request and inquiry belongs to one unit; every tenancy, bill and payment to one person.
- Terms: a **primary key (PK)** uniquely identifies a row; a **foreign key (FK)** points to a row in
  another table.

**Table 4-5. Data dictionary extract: monthly income records**
- *What it shows*: the columns of the table the owner reads most, the income ledger.
- *How to read it*: Column name; Type (uuid is a unique ID, numeric(10,2) is money, varchar is text);
  Null (can it be empty); Key (PK, FK or Computed); Description.
- *Important cells*: **water_payment** (₱200 per occupant, BR-014); **fifty_percent_share**, Computed,
  "A system-computed figure equal to half the row's Rent Amount, kept for ledger parity with the owner's
  historical spreadsheet (BR-035)"; **remitted_amount**, Computed, Rent Amount plus Water Payment
  (BR-038); **verification_status** (Verified, Pending Verification or Rejected); **voided_at,
  voided_by, void_reason** ("a voided receipt is kept, never deleted").

**If the panel asks**
- *"Why does the ERD show 21 tables but Appendix N 24?"* See the Note at the end of this guide; the
  [Defense Q&A](STUDY_GUIDE_DEFENSE_QA.md) answers it in Section 5.
- *"Can a receipt be deleted?"* No; it is voided, with when, by whom and why, and kept.

### 4.2.2 Tenant and Room Management Module

**What it says**
- The Rooms and rates screen shows each unit's cluster, floor, current rate and status; each tenancy
  has occupants, move-in date and emergency contacts.
- When the owner changes a rate, a **database trigger** records the old rate, new rate, date and who
  made the change.
- Transferred tenancies show the move-in date as **not recorded**, not a guessed date.

**Key facts and numbers**
- Since **13 October 2026** a tenant sees the deposit held for their tenancy on their own Overview, as
  one tenant asked in the survey.

**Figure 4-7. Room and rate directory.**
- *What it shows*: the owner's Rooms and rates screen, with the property's real units, rates and
  statuses (names are samples).

**If the panel asks**
- *"Why does a tenant say 'move-in date not recorded'?"* Her workbook never recorded it, so the system
  does not invent one.

### 4.2.3 Booking and Reservation Management Module

**What it says**
- Visitors see each unit and its rate, read live from the database, and send an inquiry about a
  specific unit **without an account**.
- They get a **private link** and a **short reference code**; either one (the code with the phone
  number) opens the conversation with the owner.
- An accepted inquiry becomes a tenancy; a reserved unit takes no new inquiries; the public site never
  shows a tenant's name.

**Key facts and numbers**
- "The link's secret is stored only in hashed form." (**Hashed** means scrambled one way so it cannot
  be read back.)
- The no-names rule is checked on every verification run against **all 33 units**.

**Figure 4-8. Public unit catalogue (top) and inquiry form (bottom).**
- *What it shows*: two screenshots, the public list of units with rates, and the form to ask about a
  unit.

### 4.2.4 Financial Tracking and Payment Recording Module

**What it says**
- The owner records a cash payment with her invoice number, or with none; the system **never makes up
  an invoice number** and warns if the same tenant already has a payment for that month.
- A receipt is filed under the month the rent is for, not the day it was paid. Both ledgers keep her
  workbook's layout and download as Excel files.
- A GCash payment through Adyen enters **Pending Verification** and changes nothing until the owner
  verifies it.
- Tenants see their months; only verified receipts count as paid, and a month with no receipt shows
  **"Not entered"**, never as owed, "because the records alone cannot tell an unpaid month from one not
  yet entered."
- Electricity is outside the system: each unit has its own meter and the tenant pays the electric
  company directly.
- Discussion: agrees with Encarnacion et al. (2025) and Setty (2022), and adds that consolidation also
  exposed errors already in her records.

**Figure 4-9. The monthly income ledger.**
- *What it shows*: the owner's Monthly Income screen in her workbook's layout (sample records).

**Table 4-6. Business rules for computed figures, with a worked example**
- *What it shows*: every computed figure, its rule number, and an example.
- *How to read it*: Rule (with its BR number), what is computed, and a worked example. Learn the
  examples:
  - **BR-014 Water fee**: occupants × ₱200. Unit 2C, two occupants: 2 × ₱200 = ₱400.
  - **BR-038 Remitted amount**: Rent Amount + Water Payment. ₱8,500 + ₱400 = ₱8,900.
  - **BR-035 50% Share**: a system-computed figure equal to half that row's Rent Amount, kept for ledger
    parity with the owner's historical spreadsheet. ₱8,500 ÷ 2 = ₱4,250.
  - **BR-033 Rent period**: from the tenancy's anniversary date. Anniversary on the 13th: rent for 13
    August to 12 September.
  - **BR-010, BR-011, BR-012 Due date and overdue**: overdue from the next day, no grace period. Due 13
    September: overdue from 14 September.
  - **BR-039 Deposit**: equal to the rent at move-in, set once. Moved in at ₱8,500: deposit ₱8,500.
  - **BR-040 Linda's units**: water at ₱200 per occupant, recorded separately, kept out of the remitted
    amount. Unit LF, two occupants: ₱400 as Linda's water; remitted = rent only.
  - **BR-045 Expense total**: the sum of its allocations to property areas. ₱6,000 + ₱2,000 = ₱8,000.

**If the panel asks**
- *"Is GCash the main way to pay?"* No; cash is. A GCash payment counts only after the owner verifies
  it.
- *"Why 'Not entered' instead of 'unpaid'?"* The records alone cannot tell an unpaid month from one not
  yet entered.

### 4.2.5 Maintenance Ticketing and Notification Module

**What it says**
- A tenant sends a repair request with a title, description and priority, follows it, and may cancel
  it before work starts.
- The owner can log a repair she hears about in person, even for an empty unit. Only the owner closes a
  request, and the tenant is notified when it is done.
- In-app notifications cover verified or declined payments (for tenants) and new payments, inquiries
  or comments (for the owner).
- Discussion: matches Saputra et al. (2025) on traceable requests and Jing and Lim (2021) on
  responsiveness.

**Figure 4-10. Maintenance requests board.**
- *What it shows*: the repairs board, with requests in columns by status (sample records).

### 4.2.6 Role-Based Access Control

**What it says**
- Three kinds of user: the public, tenants and the administrator, plus a **prospect** record for each
  visitor who sends an inquiry (who has only the public's rights).
- All rights come from **one permission matrix**; row-level security is on for every table.
- Password and account protections are listed; their testing is in Section 4.4.4.

**Key facts and numbers**
- **55** administrator and tenant routes checked against the matrix on every verification run.
- Passwords stored as **bcrypt hashes with a per-password salt** (bcrypt is a slow one-way scrambling
  method; a salt is random data added so that equal passwords look different).
- A new password needs **ten characters, a letter and a number**, and is refused if it is in a public
  list of breached passwords.
- An account **locks after five failed sign-ins**; a new account must change its password at first
  sign-in.
- Every administrator action goes to an **audit trail** the application "cannot edit, delete or
  empty".

**Table 4-7. Role and privilege matrix**
- *What it shows*: which role may use which function.
- *How to read it*: rows are functions; columns are Visitor, Tenant, Administrator. "Yes" = allowed,
  "No" = refused, "Own" = only their own records, "All" = everyone's.
- *Important cells*: "Pay a bill online with GCash" is **Own** for Tenant and **No** for Administrator;
  "View a unit, its bills, payments and receipts" is **Own** for Tenant and **All** for Administrator;
  every management function is Administrator only.

**If the panel asks**
- *"Can a tenant see another tenant's records?"* No. The matrix gives a tenant only "Own", every route
  is checked against it, and row-level security is on for every table.

### 4.2.7 Progressive Web Application Implementation

**What it says**
- The client is a PWA with a **service worker** and a **manifest**, so it installs without an app store
  (Add to Home Screen in Safari; Install app or Add to Home screen in Chrome).
- It keeps a **read-only copy** of what the signed-in person last loaded, so the installed app can show
  it offline under a notice with the time it was saved. Paying and recording still need a connection;
  the copy is removed at sign-out.
- Screens adapt to the device; tables on a computer become cards on a phone. One code base served the
  laptop, an Android phone in Chrome and an iPhone in Safari.

**Key facts and numbers**
- App files kept on the device: **about 1.2 MB** (as built on 13 October 2026).
- Offline copy since **1 and 2 October 2026**.

**Figure 4-11. The tenant portal on a mobile phone.**
- *What it shows*: the tenant's screen on a phone (sample records).

**If the panel asks**
- *"Doesn't offline reading break your delimitation?"* No: "This stays within the delimitation in
  Section 1.4", because nothing can be saved or paid offline.

## 4.3 Pilot Testing of the Developed System

*Answers Objective 3: functionality, responsiveness and operational performance.*

**What it says**
- The three qualities are ISO/IEC 25010 characteristics: functionality = **Functional Suitability**;
  responsiveness = time behaviour of **Performance Efficiency**; operational performance = capacity and
  **Reliability**.
- Each test was assigned in advance to the sub-characteristics it measures (Table 3-6; Appendix M,
  Table M-23).

### 4.3.1 Automated Verification

**What it says**
- Twenty automated check suites were written during development. They run on the live system and
  **write nothing**, so they are safe on the owner's real records.
- They found problems in her records too (the five receipt anomalies), which are reported, not
  corrected, "because only her invoice book can say what each should read."
- The worst defects found in development **showed no error on screen**: a cash payment confirmed with
  nothing written to the ledger, and a partial payment that lost the remaining debt. Each now has a
  check that fails if it returns.

**Key facts and numbers**
- On **29 September 2026**, the evening before the first test with real users, **all 20 passed**.

**Table 4-8. Results of automated verification (29 September 2026)**
- *What it shows*: the main suites, what each checks, and the result.
- *How to read it*: Suite, what it checks, result. Key results: Endpoint and access control **78 of
  78**; Ledger integrity passed, **5 receipt anomalies** reported for the owner; Report reconciliation
  (Excel exports against the database) **490 of 490**; Payment gateway **73 of 73**; Record relations
  **30 of 30**; Data presentation **6 of 6**; Document consistency passed (44 requirements, 49 rules).

**If the panel asks**
- *"Why automate checks at all?"* "the most dangerous defects are the silent ones".

### 4.3.2 Use in the Live Environment

**What it says**
- The system has run at a public address with the owner's real records since **September 2026**.
- Real problems were found and fixed in real use (her phone, the GCash acquirer account).
- All pilot test records were then removed by one reviewed migration after a backup.

**Key facts and numbers**
- **22 September**: a checkout raised the first real bill, **₱8,200.00 for unit 1a**; a test receipt
  voided four minutes later returned the ledger to its **937 rows**.
- **23 September**: the owner found it hard to use on her phone; causes measured (a table **518 pixels**
  wide on a **301-pixel** screen; edit buttons touch screens never showed) and fixed the same day.
- GCash payments were refused at first by a misconfigured acquirer account on Adyen's side, which Adyen
  support confirmed and replaced (**Case 08657379**).
- **26 September**: a test payment passed end to end, from Adyen's authorization to the owner's
  verification queue.

**If the panel asks**
- *"Was GCash really tested?"* Yes, end to end on 26 September, after Adyen replaced the misconfigured
  acquirer account.

### 4.3.3 Screen-versus-Database Audit

**What it says**
- The suites prove each part correct on its own, but not that a screen shows a person what the database
  holds.
- On **26 September 2026**, a tenant's payment history read "Nothing recorded" though the tenant had
  seven receipts that year, while every suite passed. So the team compared every figure on every screen
  with a read-only database query.
- Lesson: "**passing checks show that what was tested is correct, not that everything is.**"
- It **qualifies** (adds a condition to) Magno et al. (2024): here all records were already digital and
  in one database, yet six screens disagreed with it.

**Key facts and numbers**
- The audit found **six defects** no automated check had caught, **all fixed on 26 September**: a
  payment history showing only online payments; rental and personal expenses in one column; a
  placeholder move-in date for every tenant; an opened checkout listed as a payment; a voided receipt
  in a tenant's list; the Boarding House's remitted amount halved on the income screen.

**Table 4-9. Results of the screen-versus-database audit (26 and 29 September 2026)**
- *What it shows*: each screen checked, what was compared, and the result.
- *How to read it*: Screen, what was compared, result. "Matched" means the screen agreed with the
  database (the Owner overview "Matched to the peso"). Rows that say "defect fixed" are where the six
  defects were (Monthly Income one, Monthly Expenses one layout, Tenants one, Activity one, Tenant
  payments two). The tenant screens were checked on 29 September.

**If the panel asks**
- *"If every suite passed, how did you find these?"* By comparing each screen with the database for the
  same records.

### 4.3.4 Functional Walkthrough Testing

**What it says**
- A **26-step walkthrough** (30 rows counting sub-steps) exercises every function that writes data,
  once, on the one unoccupied unit.
- The owner did it herself on **30 September 2026** on her laptop, signed in to her own account, with a
  team member reading each step. Full results: Appendix M, Table M-1.

**Key facts and numbers**
- Of the 30 rows: **24 passed the first time, 1 failed, 5 not performed as written**.
- The one failure, **step 23b**: with the connection cut, the Overview showed **₱0** where the design
  requires **"—"**, so a missing figure is never read as a zero balance. Re-tested on the owner's laptop
  on **13 October 2026**, it passed.
- Not exercised: a rate change and its reversal were skipped; an expense split across two areas was
  entered as two expenses.

**If the panel asks**
- *"What was your one failed test?"* Step 23b, ₱0 instead of "—" with no connection; fixed and passed
  on 13 October.

### 4.3.5 Responsiveness and Operational Performance

**What it says**
- Response time = from the tap until the figures the user came for are on screen.
- Every screen was usable within about three seconds on the phone and a little over two on the laptop.
- Google tools found the public page's largest element slow on a mid-range phone, and the owner's
  Overview moving as figures arrived (recommendation 5).

**Key facts and numbers**
- Measured **30 September 2026** on a Dell XPS 15 (Chrome 154, Wi-Fi) and an iPhone 15 (Safari, mobile
  data).
- Slowest: tenant portal first load, **3.05 seconds** on the phone.
- **PageSpeed Insights** (Google's speed test), emulating a mid-range phone on slow 4G: public page
  **85 to 88**, largest element at **3.4 to 3.6 seconds**, and **100 for accessibility**.
- **Lighthouse** on the owner's Overview: a **layout shift of 0.22** (how much the page jumps while
  loading) and **0.7 seconds** of script work on the phone.

**Table 4-10. Page load and response times (30 September 2026, seconds)**
- *What it shows*: how many seconds each screen took on the laptop and on the phone.
- *How to read it*: each row is a screen; the two number columns are laptop and phone; lower is
  faster. "not measured" means no phone timing. The important cell is **Tenant portal, first load:
  3.05** on the phone (the slowest). Note that a second load of the public page is much faster (0.62
  and 0.95) because the files are already on the device.

### 4.3.6 Offline Use, Installation, Weak Connections and Simultaneous Users

**What it says**
- On **29 September 2026** the live system was tested with no connection, a weak one, installed, and
  under many requests, using an automated browser in phone emulation with every save blocked.
- One weakness was found and fixed that evening: on a weak signal a page could wait for minutes with no
  message. Now a page stops after 25 seconds, a save after 45 seconds.
- **Simultaneous saves**: two identical requests arriving at once could both pass a check before either
  was saved. Fixed with rules in the database, which refuse the second save whatever the order.

**Key facts and numbers**
- Offline: the installed app opened on **all ten addresses** tried, in **about 1.5 seconds**, showed no
  personal or financial data until sign-in.
- Slow connection: a returning visitor saw the units after **0.3 seconds instead of 4.6**.
- **Load test** (a script acting as many users at once): **12** simulated users on the public pages and
  **6** on the owner's records; **none of the 1,085 and 285 requests failed**; nineteen in twenty
  answered in under a second. "These were simulated users, not people."
- Timeouts: a page stops after **25 seconds**; a save stops after **45 seconds** and says it **cannot
  tell whether the save arrived, so the reader should check before sending it again**.
- Accessibility: **axe-core 4** (an automatic checker) against **WCAG 2 A and AA** found no violation on
  the public pages at phone and computer widths, nor on the owner's eight screens.
- Before the fix, the same receipt sent twice or five times at once was saved every time, and two GCash
  checkouts could open on one bill; after, one saved and every other refused; a checkout abandoned for
  more than **15 minutes** no longer holds the bill.
- Since **12 October 2026** a **twenty-first suite** repeats these tests; it passes **15 checks**, and
  each of **four deliberate faults** made it fail.
- Two limits remain: two identical receipts with no invoice number, or two acknowledgement receipts, at
  the same instant would both be saved; and two people changing the same record differently at once
  was not tried.

**If the panel asks**
- *"Why not just check for duplicates in the program?"* "a check followed by a save can always be
  outrun", so the fix is a rule in the database.
- *"Did you load test with real people?"* No; simulated users. The owner and tenants together are in
  Section 4.3.7.

### 4.3.7 User Acceptance Testing with the Owner and Tenants

**What it says**
- The owner and three tenants used the live system for their own tasks on **30 September 2026**, each
  on their own device and account, after written consent.
- Where the observer's sheet and the system's activity record disagreed, the activity record was used.
- Help was needed only at the start (first sign-in, finding their unit and rent). Repairs reached the
  owner at once and she acted on them that evening.
- In the session where the owner and two tenants used it at the same time, every screen loaded and no
  session affected another.
- On two phones, offline behaviour matched Table M-24, except the Android phone showed the "cannot tell
  whether it was saved" message after 60 to 80 seconds instead of 45; corrected 1 October, on time on
  re-test 13 October 2026.

> **Note:** the paper still has a placeholder line at the top of this section: "[TO DO when the owner
> signs Appendix O: add "The owner's signed acceptance form is in Appendix O." ...]". Do not read it
> out; it waits for the owner's signature.

**Key facts and numbers**
- **31 of 34 attempts without help (91 percent)**; every task attempted was completed.
- Two of three tenants were helped through first sign-in; one to find their unit and rent.
- The owner's full year of Monthly Income opened in **about three seconds** during simultaneous use.
- Tests needing several tenants saving at once were not performed, "because only two attended
  together".

**Table 4-11. Tenant task results (30 September 2026)**
- *What it shows*: each group of tasks, how the tenants did, how long it took, and how often they went
  the wrong way.
- *How to read it*:
  - The task codes (T-01 to T-16) are the task cards in Appendix L, Part T.
  - **"Tenants attempting"** counts **people**; the next three columns count **attempts** (one per
    tenant per task card). Example: first sign-in has two cards and 3 tenants, so 4 + 2 + 0 = 6
    attempts.
  - **Completion without help** = completed without help ÷ attempts: 4 ÷ 6 = 67%.
  - **Median time** is the middle value in seconds; **mean wrong turns** is the average number of wrong
    taps or pages per attempt.
- *Important cells*: the **All tasks** row: 31 without help, 3 with help, 0 not completed, median **60**
  seconds, **0.2** wrong turns, **91%**. The two lowest rates are first sign-in (**67%**) and finding
  unit, rent and balance (**75%**).

**Table 4-12. Summary of test execution by level**
- *What it shows*: all testing, grouped by the ISO/IEC/IEEE 29119 test levels, with the overall pass
  rate. This is the table that proves Objective 3.
- *How to read it*: one row per activity. **Executed** counts only tests actually run; **Not performed
  or not applicable** are left out of the pass rate. Pass rate = passed ÷ executed.
  - Unit and integration: automated suites, 20 / 20 / 0 failed, **100%**.
  - System: owner's walkthrough, 25 executed / 24 passed / 1 failed / 5 not performed, **96%**.
  - Acceptance: tenant tasks, 34 / 34, **100% (91% without help)**.
  - Acceptance: simultaneous use, 4 / 4, 3 not performed or not applicable, **100%**.
- *Important cell*: **All levels: 83 executed, 82 passed, 1 failed, 8 not performed, 98.8%**. The
  course standard is **90 percent**; no critical defect was found.

**If the panel asks**
- *"How many tests passed?"* 82 of 83 executed (98.8%), above the course standard of 90 percent, with
  no critical defect.
- *"Where did tenants struggle?"* Only at the start: first sign-in and finding their unit and rent.

## 4.4 Evaluation of the System Based on ISO/IEC 25010

*Answers Objective 4.*

**What it says**
- The evaluation followed the five steps of ISO/IEC 25040 on the ISO/IEC 25010:2011 model.
- The 2011 edition was used because the approved proposal named its eight characteristics and the
  instrument was built on them.
- Each characteristic was judged on **measured quality** (Section 4.3, in the manner of ISO/IEC 25023)
  and **rated quality** (the survey).
- ISO/IEC 25010 was revised in 2023 (Usability renamed *Interaction Capability*, Portability renamed
  *Flexibility*, *Safety* added); Appendix M, Table M-21 shows where each result falls in the new model.

**Table 4-13. The evaluation process, following ISO/IEC 25040**
- *What it shows*: the five steps of the standard and what the team did at each.
- *How to read it*: Step, what the standard requires, how it was done.
  1. Establish the evaluation requirements: Objective 4; the live system (and for four evaluators a
     demonstration copy); ISO/IEC 25010:2011; the owner, tenants and evaluators.
  2. Specify the evaluation: measures from the tests (Table M-23); survey items assigned to
     sub-characteristics (Table 3-6); criteria: Table 3-5 for means, and for tests "at least 90 percent
     passed with no critical defect open".
  3. Design the evaluation: measurements 29 September; walkthrough and acceptance test 30 September;
     evaluators' review 3 October; four more evaluators 15 to 18 October.
  4. Execute the evaluation: Section 4.3 and the survey (Tables M-2 to M-17).
  5. Conclude the evaluation: Tables 4-17 and 4-18, and the changes made (Table 4-19).

### 4.4.1 Respondents

**What it says**
- Ten people answered, each after using the system and giving consent. No team member was a
  respondent.
- The four outside evaluators reviewed a demonstration copy (same software, separate database with
  sample data) so no outsider saw the owner's records.
- Two groups have one respondent each, so the results describe these ten people, not a wider
  population.

**Key facts and numbers**
- Prospective tenant and three tenants: **30 September 2026**, after their tasks. The owner: that
  night. One technical evaluator: **4 October**. Four more: **15 and 16 October and two on 18
  October**.

**Table 4-14. Distribution of respondents**
- *What it shows*: how many respondents per group. Owner / administrator **1 (10.00%)**; Tenants **3
  (30.00%)**; Technical evaluators **5 (50.00%)**; Prospective tenants **1 (10.00%)**; Total **10**.

**Table 4-15. Instrument administration and response rate**
- *What it shows*: forms distributed, retrieved and valid per group. Every group 100%; total **10
  distributed, 10 retrieved, 10 valid, 100%**.
- *How to read it*: **response rate** = forms retrieved ÷ forms distributed.

**If the panel asks**
- *"Ten respondents is very few."* The paper agrees: "the results describe how these ten people rated
  the system, not a sample from which a wider population can be inferred." The measurements back the
  ratings (Section 4.4.5).

### 4.4.2 Interpretation of Scores

**What it says**
- Items use the scale of Table 3-4 and are read with Table 3-5.
- A characteristic's composite is the **mean of its group means**; the overall is the mean of the eight
  composites.
- Averaging every response together gives **4.47** instead of **4.59**: same interpretation (Very High
  Quality), same highest (Portability), but Usability becomes lowest, because pooling lets the five
  technical evaluators outweigh the one owner.

**Table 4-16. Worked computation of a weighted mean**
- *What it shows*: one weighted mean worked out in full, so the panel can see the formula used.
- *How to read it*: each row is a rating *w* (5 down to 1), how many chose it (*f*), and *f × w*. Add
  the last column (Σ = 15) and divide by N (3).
- *Important cell*: the indicator is "I can see my own unit details, my bill, and what I still owe."
  (Functional Suitability, rated by tenants). All three tenants chose 5, so **WM = 15 / 3 = 5.00**, Very
  High Quality.

**If the panel asks**
- *"Show us how you computed a mean."* Table 4-16: 3 × 5 = 15, 15 ÷ 3 = 5.00.
- *"Isn't the mean of group means just inflating your score?"* The paper reports the pooled figure too:
  4.47, still Very High Quality.

### 4.4.3 Results by Characteristic

**What it says**
- All eight characteristics were rated Very High Quality, and no group mean fell below High Quality.
- Each rating is read beside the measured evidence.
- Usability and Maintainability, the two lowest, are explained in detail.

**Key facts and numbers**
- **Portability 4.86** (highest): one code base installed on an Android phone and an iPhone without an
  app store.
- **Functional Suitability 4.79**: every feature present; 96 to 100 percent of correctness checks right.
- **Security 4.68** (Section 4.4.4).
- **Reliability 4.61**: the evaluators' lowest item, **3.80**, for handling a failed request without
  showing wrong data, names the one failed test (the ₱0 of step 23b).
- **Compatibility 4.55**: every browser combination tried worked.
- **Performance Efficiency 4.48**: no failed request, but two to three seconds on a phone.
- **Usability 4.42**: "the lowest of the characteristics all four groups rated". The prospective tenant
  gave every item 5; tenants **4.47**; the owner gave **3** to telling what each screen is for and to
  learning without help. The technical evaluators' mean rose from **3.00 to 4.20**: the first gave 3 to
  all five items before the **fourteen changes** (eleven about usability); the next four gave **4.80,
  4.60, 3.60 and 5.00**. **76 accessibility scans of 19 screens** found no violation once one defect on
  three screens was corrected.
- **Maintainability 4.32** (lowest composite): five respondents gave **4.00, 5.00, 4.60, 3.00 and
  5.00**, none inspecting the source code, so "the measurement, read from the code itself, carries more
  weight than the rating". Three database calls in four are written inside the request handlers.
- The results are in the range Canlas et al. (2026) report for a Philippine dormitory system.

**Table 4-17. Summary of evaluation results**
- *What it shows*: the final score for each characteristic. This is the table that proves Objective 4.
- *How to read it*: **n** is how many respondents rated it; **Composite mean** is the score;
  **Interpretation** comes from Table 3-5; **Rank** is 1 (highest) to 8 (lowest).
- Values: Functional Suitability 10, 4.79, rank 2; Performance Efficiency 10, 4.48, rank 6;
  Compatibility 10, 4.55, rank 5; Usability 10, 4.42, rank 7; Reliability 10, 4.61, rank 4; Security
  **6**, 4.68, rank 3; Maintainability **5**, 4.32, rank 8; Portability 10, 4.86, rank 1.
- *Important cells*: **Overall 4.59, Very High Quality**. Security has n = 6 (owner plus five
  evaluators) and Maintainability n = 5 (evaluators only), because of who could judge them.

**If the panel asks**
- *"Why is Maintainability lowest?"* Its raters did not inspect the code, and the code itself shows the
  weakness: database calls written inside the request handlers. Recommendation 6.
- *"Why is Usability low if it is a simple system?"* The owner's two 3s and the first evaluator's 3s
  before the changes; the owner learned it with each step read to her.

### 4.4.4 Security

**What it says**
- Ratings were high; two items were lower, and the paper links them to evidence or says no reason was
  given.
- Outside scanners, manual checks and a code review all held.
- Two weaknesses remain by design, left to recommendation 3.

**Key facts and numbers**
- The owner gave every Security item **5**. Technical evaluators: **4.60** role restriction and audit
  trail; **4.40** tenant kept out of admin data; **4.20** authentication and session handling; **4.00**
  handling of credentials.
- Three passive external scans graded the site **A+**: **Qualys SSL Labs**, **Mozilla HTTP
  Observatory** (all 12 tests passed once the **Content Security Policy** was enforced) and
  **securityheaders.com**, on **29 and 30 September 2026**. (A Content Security Policy tells the
  browser which scripts it may run.)
- **Twelve checks by hand** passed, including locking after five wrong passwords, no personal data
  behind the Back button after sign-out, and another tenant's repair answering "not found".
- A review of all **71 request handlers** on **2 October** found no high-severity problem; Supabase's
  security advisor raised no warning on **5 October**.
- Remaining weaknesses: the **sign-in token is kept in the browser's storage**, where an injected
  script could read it; and sign-in takes a **password only, with no second factor**, even for the
  administrator.

**If the panel asks**
- *"What security weaknesses remain?"* The two above; both are recommendation 3.

### 4.4.5 Measured and Rated Evidence Together

**What it says**
- Puts both kinds of evidence side by side for each characteristic.
- For all eight characteristics, the measured and rated evidence agree.
- **Quality in use** (the quality users experience in their own context) was measured in the
  acceptance test, in the manner of ISO/IEC 25022.

**Key facts and numbers**
- Of the **thirty-one** sub-characteristics, **twenty-seven** have a measured result and
  **twenty-five** are rated; **two** (user interface aesthetics and reusability) have neither, and no
  conclusion is drawn about them.
- Quality in use: effectiveness, all **34** tasks completed, **31** without help; efficiency, median
  **60 seconds** and **0.2** wrong turns; context coverage, the owner's laptop, an Android phone and an
  iPhone.

**Table 4-18. Measured and rated evidence by characteristic**
- *What it shows*: for each characteristic, how many sub-characteristics it has, how many were
  measured, how many rated, the measured result, and the composite mean.
- *How to read it*: compare the "Measured result" column with the "Composite mean" column in the same
  row. They should point the same way. Example: Maintainability, the lowest mean (4.32), also has the
  one measured weakness: "**154 of 204 database calls inside the request handlers**".
- *Important cells*: the **All** row: **31** sub-characteristics, **27** measured, **25** rated, overall
  **4.59**. Other measured results to know: Performance Efficiency "every screen usable within 3.05 s
  on a phone"; Compatibility "5 of 5 device and browser combinations"; Usability "0 accessibility
  violations in 76 scans"; Security "A+ from all three outside scanners".

**If the panel asks**
- *"Why trust ratings from ten people?"* Because every characteristic was also measured, and the
  measurements agree with the ratings on all eight.
- *"Which sub-characteristics did you not evaluate?"* User interface aesthetics and reusability.

### 4.4.6 Optimization in Response to the Evaluation

**What it says**
- Objective 4 asks to evaluate **and optimize**. This section counts the changes made from feedback
  and testing, and the defects found.
- Defect severities: **critical** (a wrong amount in the records or lost data); **high** (a wrong amount
  shown, a core task blocked, or an exploitable weakness); **medium** (a misleading display or a
  weakness with a workaround); **low** (usability, appearance or hardening).
- One more high-severity defect was found on **13 October 2026** in an audit of the live records (two
  tenants shown owing a month they had paid) and corrected the same day. It is outside the counts;
  Appendix M, Table M-27 describes it.

**Key facts and numbers**
- **51 changes** in all; every one is in Appendix M, Table M-18.
- Each of the technical evaluators' **fourteen comments of 3 October 2026** was addressed on the live
  system by **5 October**.
- Defects: **35 found, 32 resolved, 3 accepted** as low risk; **no defect found was critical**.

**Table 4-19. Optimizations made in response to evaluation, by source**
- *What it shows*: the 51 changes grouped by where the finding came from.
- *How to read it*: Source (with date), number of changes, characteristics served, examples. The
  sources: the owner's phone review 23 Sep (4); screen-versus-database audit 26 Sep (7); development
  reviews 26 to 28 Sep (11); pre-testing audit and Lighthouse 29 and 30 Sep (5); testing day 30 Sep
  (3); evaluation account and security reviews 2 and 7 Oct (3); technical evaluators' review 3 Oct
  (14); the survey 30 Sep to 4 Oct (4). **All: 51.**
- *Important cell*: the technical evaluators' row, **14**, the largest group, "all addressed by 5 Oct".

**Table 4-20. Defects found, by activity, severity and disposition**
- *What it shows*: how many defects each test activity found, the worst one, and what happened to them.
- *How to read it*: Activity, Found, Highest severity (with the example), Resolved, Open or accepted.
  - Screen-versus-database audit: 6 found, high, 6 resolved.
  - Functional walkthrough: 1, medium (₱0 instead of "—"), 1 resolved.
  - Testing day on phones: 1, medium (the late message on Android), 1 resolved.
  - Check of the evaluation account, 2 October: 1, high (online payment refused for an amount owed),
    1 resolved.
  - Security review and outside probe, 2 October: **12**, high, operational (the hosting provider's
    visitor challenge could block payment notifications), **9 resolved, 3 accepted** as low risk:
    sign-in attempt limits counted per server instance, signing out not revoking a token, a wide
    connection policy.
  - Technical evaluators, 3 October: 14, medium (phone, email and photo validation), 14 resolved.
- *Important cell*: **All activities: 35 found, 32 resolved, 3 accepted.**

**If the panel asks**
- *"What did you change because of the evaluation?"* 51 changes (Table 4-19), including all fourteen of
  the evaluators' comments, and the deposit now shown on the tenant's Overview.
- *"Were any defects critical?"* No. "No defect found was critical."

## 4.5 Deployment Plan and Strategies

**What it says**
- Hosted on **Vercel**, database on **Supabase**, payment gateway on **Adyen**. Every approved change is
  deployed automatically from the project's main code branch.
- The system is not yet the owner's main record; it runs beside her own records.
- Three risks are managed on purpose: her records are real; credentials must stay secret; the five
  historical receipt anomalies must not be mistaken for system errors.

**Table 4-21. Software and hardware requirements for deployment**
- *What it shows*: what each side needs to use the system, and what was actually used in testing on
  30 September 2026.
- *How to read it*: Side (Owner, Tenants and visitors, Hosting, Administration), the requirement, and
  the device used. Owner: a current browser on a computer and internet (her Acer Nitro V 15 with Chrome;
  the team's Dell XPS 15 on Windows 11 with Chrome 154, Edge and Firefox 157). Tenants and visitors: any
  current browser on a phone or computer (Infinix GT20 with Chrome 154; iPhone 15 and iPhone 13 with
  Safari; the tenants' own phones, models not recorded). Hosting: Vercel, Supabase, an Adyen merchant
  account with GCash. Administration: a computer that can run Node.js, only for backups and
  verification runs (Node.js 22.16).

**Table 4-22. Deployment plan and strategies**
- *What it shows*: the five stages of putting the system into use, and the status of each.
- *How to read it*: Stage, activity, status.
  1. Environment preparation: **Done**.
  2. Record transfer (937 income rows and 1,327 expense allocations): **Done**.
  3. Pilot use alongside her existing records: **In progress**.
  4. Training and hand-over (manual in Appendix K, accounts issued): **Done** (accounts prepared 29
     September 2026; the owner guided through the system, and the owner and three tenants using it on
     their own accounts, on 30 September 2026; acknowledgement receipts for payments with no invoice
     number added on 1 October 2026).
  5. Full transition, the system becomes her main record once both records agree: **Not yet** (as of
     13 October 2026).
- *Important cell*: **Stage 5, "Not yet"**. Be honest about it at the defense.

**If the panel asks**
- *"Is the owner using it as her main record?"* Not yet; it runs beside her own records until both
  agree (stage 5).
- *"How do you protect her real data?"* A backup before any change; every change a numbered migration
  reviewed before it runs; credentials never in code or documents, with a check before every commit.

---

# CHAPTER 5: SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

**Chapter opening: what it says**
- Summarizes the study, states the conclusions, and gives recommendations for the owner, for further
  development, and for future researchers.
- Read it aloud before the defense: nearly every key number is here again.

## 5.1 Summary

**What it says**
- A one-paragraph restatement of the problem and the study, then four numbered points, one per
  objective.

**Key facts and numbers**
1. Existing practices: two-sheet workbook on a USB flash drive, paper invoice book, cash, requests by
   message or in person. 937 income rows and 1,327 expense allocations; 43% lacked an anniversary date
   and deposit; five invoice numbers used twice. 44 functional requirements, 49 business rules; 25 as
   worded, 15 in part, 1 interface only, 3 not as worded.
2. Developed with all six features; it holds the owner's real records.
3. Twenty suites passed on 29 September 2026 (including **490** report reconciliation checks); six
   screen defects found and corrected; walkthrough 24 of 30 rows passed first time, one failed, five
   not performed; tenants 31 of 34 without help; **82 of 83 (98.8 percent)**; no critical defect; every
   screen within about three seconds on a phone; no failed request under twelve simulated visitors or
   six simulated readers of the owner's records.
4. Evaluated by the five steps of ISO/IEC 25040; 27 of 31 sub-characteristics measured, 25 rated;
   **4.59 overall**: Functional Suitability 4.79, Performance Efficiency 4.48, Compatibility 4.55,
   Usability 4.42, Reliability 4.61, Security 4.68, Maintainability 4.32, Portability 4.86; **51
   changes** made.

## 5.2 Conclusions

**What it says**
- Each objective was achieved, with the evidence named. **Conclusions answer the objectives**; that is
  why there are exactly four.

**Key facts and numbers**
1. **First objective achieved**: every gap traced to a requirement and a module (Table 4-2). "The main
   problem at the property was not the lack of a digital tool but the lack of connection between its
   records."
2. **Second objective achieved**: all six features in use on her real records; they keep her report
   layout, invoice numbers and cash as the main way to pay, "so using the system requires no change to
   how she keeps her accounts."
3. **Third objective achieved**: 82 of 83 (98.8 percent), above the course standard of 90 percent, no
   critical defect (Tables 4-12 and 4-20). The one failure appeared only on a real device in its user's
   hands and passed on re-test.
4. **Fourth objective achieved**: Very High Quality overall (4.59), every characteristic Very High
   Quality (Tables 4-17 and 4-19). The ratings agree with the measured evidence, and "they describe how
   ten people rated the system over three weeks, two of the four groups with one respondent each."

**If the panel asks**
- *"What is your main conclusion?"* The property's problem was the lack of connection between its
  records, and Hivelet fixed it without changing how she keeps her accounts.

## 5.3 Recommendations

**What it says**
- Eight recommendations in three groups. Each one comes from a weakness or limit named in Chapter 4,
  with the section in brackets.

**Key facts and numbers**

*For the owner*
1. Keep the system's receipts up to date with her receipt book, entering each on Monthly Income; the
   system can become her main record only once the two agree (Table M-27; Table 4-22).
2. Keep taking a backup before any change, and read the five flagged invoice numbers as history.

*For continued development*
3. Move the Adyen account from test to live and let the system refund a rejected GCash payment; keep
   the sign-in token in a cookie no script can read; add a second sign-in factor for the administrator
   (Sections 1.4, 4.3.2, 4.4.4).
4. Automated browser tests of all 26 walkthrough steps; extend the duplicate-receipt rule to receipts
   with no invoice number and acknowledgement receipts; keep deleted repair requests and inquiries as
   archived records; list finished repairs by date; call the action **Void** rather than Delete on
   Monthly Income and let the owner see voided receipts; record each tenancy's agreed term; warn when a
   headcount exceeds a unit's capacity.
5. Make pages appear faster on phones (largest element at 3.4 to 3.6 seconds; layout shift 0.22) by
   pre-rendering the public page, serving the typefaces from the site itself, and reserving the space
   each figure takes; keep figures already loaded.
6. Strengthen the two lowest characteristics: **Maintainability (4.32)**, by moving database work out
   of the request handlers (three calls in four) into service modules, reviewed by more than one
   developer, and giving evaluators the architecture, ERD and data dictionary; **Usability (4.42)**, by
   taking the owner through each screen with the user manual and showing each new tenant how to sign in
   and find their unit and rent.

*For future researchers*
7. Check a system against its own real data, not only test cases (Section 4.3.3).
8. Evaluate over a longer period with every tenant, including two people changing the same record at
   once; measure availability over months, the owner's time on record-keeping, and the two
   sub-characteristics not covered (user interface aesthetics, reusability); build the instrument on
   ISO/IEC 25010:2023; ask tenants what is missing.

**If the panel asks**
- *"What would you do next?"* Recommendation 3 first: Adyen live with refunds, a protected cookie and a
  second factor. See [STUDY_GUIDE_DEFENSE_QA.md](STUDY_GUIDE_DEFENSE_QA.md), Section 9.

---

# REFERENCES

**What it is**
- The list of every source cited in the paper: **35 references**, sorted alphabetically by first
  author.
- The style is **APA, 7th edition** (as [STUDY_GUIDE_REFERENCES.md](STUDY_GUIDE_REFERENCES.md) notes):
  author, year, title, source in italics with volume, and a DOI or web address.

**How references are cited in the text**
- **Author-date** citations, for example (Burke, 2026) or "Magno et al. (2024)".
- **"et al."** ("and others") is used for three or more authors; two authors are joined with "&" inside
  brackets (Pressman & Maxim, 2020) and "and" in a sentence ("Jing and Lim (2021)").
- Two works by the same author in the same year get **a** and **b**: Mangca (2023a) and (2023b); ISO/IEC
  (2011a) for 25010 and (2011b) for 25040; ISO/IEC (2016a) for 25022 and (2016b) for 25023.
- Group authors are spelled out at first citation with the short form in square brackets, for example
  "International Organization for Standardization & International Electrotechnical Commission
  [ISO/IEC], 2011a".

**What kinds of sources**
- Journal articles and conference papers (for example Burke, 2026; Canlas et al., 2026; Biørn-Hansen et
  al., 2017).
- Books: Laudon et al. (2026), *Management information systems* (18th ed.); Pressman and Maxim (2020),
  *Software engineering* (9th ed.).
- Standards: ISO/IEC 25010:2011, 25040:2011, 25022:2016, 25023:2016, 25010:2023, and ISO/IEC/IEEE
  29119-1:2022.
- A law: Republic Act No. 10173, the Data Privacy Act of 2012.
- A web guideline: WCAG 2.2 (World Wide Web Consortium, 2023).
- Methods sources: Likert (1932), Etikan et al. (2016), Nielsen and Landauer (1993).
- A master's capstone: Setty (2022).

**If the panel asks**
- *"Which local studies did you use?"* Magno et al. (2024), Pavia et al. (2022), Pernate et al. (2025),
  Mangca (2023a, 2023b), Caparos et al. (2025), Encarnacion et al. (2025), Canlas et al. (2026) and Mia
  et al. (2024). See [STUDY_GUIDE_REFERENCES.md](STUDY_GUIDE_REFERENCES.md) for each.

---

# APPENDICES

The appendix list (08_APPENDICES.md) says each appendix starts on a new page with its letter and title.
Chapter 4 cites K, M, N and O by letter, so those letters must not change.

**Appendix A. Letter of Request.** The signed letter to the owner asking to conduct the study. It is
there to show the client agreed. The list marks it **[TO DO: scan it in]**.

**Appendix B. Appointments.** The adviser appointment papers, showing the study was formally
supervised. Also marked **[TO DO: scan them in]**.

**Appendix C. Gantt Chart.** Figure C-1, the development schedule from July to October 2026, taken
from the project's version history. A **Gantt chart** shows each activity as a bar along a timeline. It
shows the three iterations, that the second iteration had no deployment work, and a dashed block for
the Module 01 documents between the first and second iterations. It is there to show the Agile
schedule as it really ran.

**Appendix D. Context Diagram.** The same image as Figure 4-3, placed here as the full-page version.

**Appendix E. Data Flow Diagram (Level 1).** The same image as Figure 4-4.

**Appendix F. Data Flow Diagrams (Child Diagrams).** Figures F-1 to F-4 open four of the eight level 1
processes into their steps: **1.0 handle inquiries, 3.0 manage tenants and tenancies, 4.0 bill and
record payments, 5.0 manage repair requests**. Processes 2.0, 6.0, 7.0 and 8.0 each do one operation, so
they are not opened. A **child diagram** is a more detailed drawing of one process. It is there to show
the design one level deeper.

**Appendix G. Use Case Diagram.** The same image as Figure 4-5.

**Appendix H. Entity-Relationship Diagram.** The same image as Figure 4-6.

**Appendix I. Initial Design.** Figures I-1 to I-4: four screens of the first working version, **28
August 2026** (public landing page, a unit category, the tenant directory, the tenant overview on a
phone), with sample tenants. Because the interface was prototyped in code, the first version is the
initial design. It notes the second iteration removed an automatic rent increase the owner does not
apply and corrected the number of units on the public page. It is there to show how the design
changed.

**Appendix J. Evaluation Instrument.** The ISO/IEC 25010 questionnaire exactly as respondents saw it in
a Google Form, in English and Filipino. Section 1 (About you) sends each respondent to one section:
Section 2 owner and administrator, Section 3 tenants, Section 4 technical evaluators, Section 5
prospective tenants. Rated items: **owner 28, tenants 18, technical evaluators 33, prospective tenants
12**, numbered as in Table 3-6. It is there so the panel can see every question behind the means.

**Appendix K. User's Manual.** Part 1 for tenants (in English and Filipino) and Part 2 for the
landlady: signing in, each screen, recording a payment or expense, tenants, rooms, repairs, inquiries,
weak connections, looking after the records, and quick answers. It is the hand-over document named in
Table 4-22, stage 4, and the basis of recommendation 6.

**Appendix L. Test Cases.** Every test case run on **30 September 2026**, with its ISO/IEC 25010
characteristic, the requirement it traces to, what to do, what should happen and the result (Pass,
Fail, Pass after fix, NT not tested). Parts: A owner and administrator (A-05 to A-32 are the
walkthrough), T tenant tasks, P public site, C simultaneous use, O offline, weak signal and installing,
S security, CO browsers and devices, PF performance timings, N changes shipped on 30 September. The
prospective tenant's task cards were not recorded on the day. It is the raw evidence behind Sections
4.3.4 to 4.3.7.

**Appendix M. Supporting Evidence for Chapter 4.** The detailed results Chapter 4 summarizes:
- M-1 the walkthrough, step by step.
- M-2 to M-17: for each characteristic, a ratings table (every item, by group, with mean, **SD** and
  interpretation) and a measured-evidence table (each measure as X = A / B). **SD (standard
  deviation)** shows how spread out the ratings were; 0.00 means everyone gave the same rating.
- M-18 all 51 optimizations; M-19 the three iterations phase by phase; M-20 quality in use; M-21 the
  2011 to 2023 mapping; M-22 simultaneous use; M-23 tests mapped to characteristics; M-24 offline and
  installation; M-25 simulated users; M-26 simultaneous saves; M-27 the correction of 13 October 2026.
It is there so every Chapter 4 number can be checked.

*How to read a ratings table (for example Table M-2, Functional Suitability)*: rows are the items,
grouped by who rated them; each group ends with a **group mean** (Owner 4.83, Tenants 5.00, Technical
evaluators 4.32, Prospective tenant 5.00); the last row, the **composite**, is the mean of those group
means (4.79).

**Appendix N. Data Dictionary.** Every table and column of the live database: type and length, whether
required, default, keys and description, grouped as Property, People, Money, Requests, System and
Backup. The appendix list gives **24 tables, 238 columns**. No sample values are given, because the rows
hold personal data. It is there so the database design can be checked column by column (Table 4-5 is an
extract).

**Appendix O. User Acceptance Sign-off.** The owner's signed acceptance form, scanned. It states the
test was held on **30 September 2026** by the owner, three tenants and one prospective tenant. Still
marked **[TO DO: signature]**; the owner signs only if she agrees.

**Appendix P. Informed Consent Form.** The blank form each tester signed (Section 3.4), never the signed
copies, which carry names.

**Appendix Q. Source Code.** The repository's layout; the code itself is shown at the defense on
request. Key facts: **63 components, of which 19 are screens**; the API in **49 files**; **81 numbered
migrations**; the check suites in the scripts folders. Each change is recorded with its author, date and
reason.

---

# Where the paper seems to disagree with itself

These are places where two parts of the paper do not match on the surface. Do not resolve them at the
defense; know them, and say what each part says.

> **Note 1: number of tables.** Section 4.2.1 says the ERD has "21 tables, each with a primary key, and
> 37 foreign keys", and also that the complete dictionary covers "every column of all 24 tables".
> Appendix N's own grouping includes a **Backup** group of three tables (copied_period_backup_031,
> date_paid_import_backup_032, rent_period_drift_backup_030). The
> [Defense Q&A](STUDY_GUIDE_DEFENSE_QA.md) (Section 5) says both are right.

> **Notes 2 to 4, fixed on 24 October 2026.** Appendix I now names the screens as Figures 4-7 to 4-11
> (it said 4-4 to 4-8), the appendix list now gives Appendix M as Tables M-1 to M-27 (it said M-26),
> and Appendix J now gives the survey as 30 September to 18 October 2026 (it said 4 October), matching
> Section 4.4.1.

> **Note 5: number of suites.** Section 3.2.4 says "Twenty check suites were written alongside the
> system." Section 4.3.6 says "Since 12 October 2026 a twenty-first suite repeats these tests". Both
> are true at different dates: Table 4-8 reports the twenty run on 29 September.

> **Note 6: an unfinished line.** Section 4.3.7 still contains "[TO DO when the owner signs Appendix O:
> ...]", and Appendices A, B and O are marked TO DO.

---

# Can you explain these without notes?

Say each answer aloud, in your own words, with one number and where it is in the paper.

1. What is a fragmented workflow, and what proved the boarding house had one?
2. How many units does the property have, in which five clusters, and how many are occupied?
3. State the general objective and the four specific objectives in order.
4. Which Chapter 4 section answers each objective?
5. What is in the scope, and what are the delimitations of online payment?
6. Which study is closest to Hivelet, and how is Hivelet different?
7. What is the research gap (Section 2.2)?
8. Draw the conceptual framework (Figure 2-2) from memory: input, process, output, feedback.
9. Why Agile? Name its six phases (Figure 3-1) and the dates of the three iterations.
10. Why PostgreSQL, and what are row-level security and a trigger?
11. What are SQuaRE, ISO/IEC 25010, 25040, 25023, 25022 and 29119-1, each in one line?
12. What is the difference between measured quality and rated quality?
13. Explain the weighted mean formula and work Table 4-16.
14. Why the mean of group means? What is the result if every response is averaged together?
15. Read the bands of Table 3-5. What range is Very High Quality?
16. Who were the ten respondents, and why did each group rate only some characteristics?
17. How were the tenants sampled, and why three?
18. How many requirements and business rules, and how were they graded on 16 September?
19. Work the water fee, remitted amount and 50% Share for a ₱8,500 rent with two occupants.
20. When does a GCash payment count, and why does a tenant see "Not entered"?
21. What does the role and privilege matrix (Table 4-7) let a tenant do?
22. What did the screen-versus-database audit find, and what is its lesson?
23. What was the one failed test, and when did it pass?
24. Read Table 4-12: how do you get 83 executed, 82 passed and 98.8%?
25. Read Table 4-11: why do the attempt columns add up to more than the number of tenants?
26. What is the slowest screen, and what did the load test show?
27. What are the simultaneous-saves problem, its fix, and its two remaining limits?
28. Give the overall mean, the highest and lowest characteristics, and why Maintainability is lowest.
29. What are the two remaining security weaknesses, and which recommendation answers them?
30. How many changes were made in response, how many defects were found, and is the system her main
    record yet?
