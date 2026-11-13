# 2 THEORETICAL FRAMEWORK

This chapter sets out the theoretical and empirical basis of the Hivelet system from the literature
on property management systems, Management Information Systems (MIS), financial analytics, digital
communication systems, and Progressive Web Applications (PWA). It treats these domains as connected
parts of one apartment management operation, and argues that the inefficiencies of small-scale
residential operations come mainly from fragmented administration, in which records, financial
monitoring, communication, and coordination sit in disconnected tools and processes. The reviewed
literature supports the need for an integrated, centralized, and accessible management system for
resource-constrained apartment operations.

## 2.1 Review of Related Literature

### 2.1.1 Fragmentation and Operational Inefficiencies in Property Management

The reviewed studies identify fragmented administrative workflows as one of the primary operational
issues in residential property management (Burke, 2026; Magno et al., 2024). As tenants,
transactions, and maintenance activities increase, manual documentation, spreadsheet-based tracking,
and informal communication become difficult to manage consistently and accurately.

Burke (2026), examining apartment complexes of 50 to 500 units, finds operational, tenant,
regulatory, labor, and technology challenges that differ from those of commercial properties. Among
them, residential tenants often ask for minor repairs, and the software in use often does not
connect with other financial and operational tools, which leaves information in separate silos.
Thevaraju et al. (2019) describe the same condition at an apartment of eight blocks and more than
1,000 units whose maintenance transactions were recorded by hand. They built a web system, developed
with the Agile methodology, through which management handles apartment and tenant data, maintenance
requests, notices, and complaints. Across the sector, Ullah et al. (2018), reviewing 213 studies of
smart real estate technology, find that real estate still needs to improve its adoption of digital
technologies and online platforms to move from traditional to smart practice.

Local studies show the same condition. Magno et al. (2024) observed that apartment rental management
suffers from tracking pending and paid bills across units, missed payment deadlines, and informal,
paper-based records, and that their system improved data management and reduced the errors of manual
processes. Pavia et al. (2022) built a property management system for the mock hotel in which
hospitality students take their practical examinations, and its users rated its design,
functionality, and user-friendliness positively. That is an institutional setting with predefined
workflows and technical support, which differs significantly from resource-constrained apartment
operations.

Together, these studies show that the main challenge in apartment management is not the absence of
digital tools but the absence of a structure that consolidates administrative functions into one
environment.

### 2.1.2 Management Information Systems as the Foundation of Centralization

The study's theoretical foundation is MIS. According to Laudon et al. (2026), an MIS is an organized
system that collects, processes, stores, and distributes information to support operational control,
coordination, and administrative decision-making. Within apartment management, this framework
explains why manual and semi-digital operations become inefficient: information is distributed across
isolated records, disconnected tools, and inconsistent communication channels. Figure 1, adapted from
Laudon et al. (2026), illustrates the flow from operational inputs through processing to outputs that
support decision-making.

*Figure 1. Management Information System (MIS) framework, adapted from Laudon et al. (2026).*

![Management Information System framework](figures/figure-2-1-mis-framework.png)

Ghasemaghaei et al. (2018) find that a firm's data analytics competency, which includes the quality
of its data, improves its decision-making performance. Pressman and Maxim (2020) explain that
integrated software systems improve consistency, maintainability, and operational reliability by
reducing redundancy and streamlining data flow across system components.

Within apartment management, these principles support a centralized design that keeps tenant
information, maintenance records, communication, and financial transactions in one system. Property
management studies point the same way, locating operational inefficiency where information systems
lack interoperability and centralized accessibility (Burke, 2026; Magno et al., 2024).

### 2.1.3 Financial Analytics and Administrative Decision Support

Financial management is central to apartment administration, since payment monitoring, expense
tracking, and cash flow visibility shape managerial decisions. The reviewed studies emphasize that
financial inefficiencies emerge when payment records are kept through fragmented or manual processes
(Encarnacion et al., 2025; Magno et al., 2024).

Encarnacion et al. (2025) built a web-based payment tracking system for boarding houses near a
university in Butuan City, where rent had been tracked through notes and verbal reminders, with
delayed payments and little transparency as a result. In their system, landlords create bills,
track payments, and monitor each tenant's balance, and tenants see their own bills and payment
history. Evaluated with ISO/IEC 25010, it simplified payment tracking, reduced manual work, and
improved communication between landlords and tenants. Magno et al. (2024) likewise built their
system to compute monthly bills, track billing transactions, and generate a billing statement for
each unit in place of paper-based records. Caparos et al. (2025) developed a cloud-based property
management system with automated billing, secure access controls, and real-time tenant communication
for a real estate business in Region XII, which its staff rated positively on usability, security,
operational efficiency, and tenant experience, security highest.

Read with Ghasemaghaei et al. (2018), these studies treat financial records not merely as reports
but as decision support, most useful when they are integrated with the other operational records
rather than kept as a standalone feature.

### 2.1.4 Digital Communication and Structured Issue Resolution

Operational efficiency in apartment environments also depends on communication and maintenance
coordination. The reviewed studies identify informal communication as a contributor to delayed
responses, inconsistent issue tracking, and reduced tenant satisfaction (Jing & Lim, 2021; Saputra et
al., 2025).

Jing and Lim (2021) found, among residents of high-rise apartments in China, that management service
quality affects residential satisfaction and the willingness to recommend, and that the quality of
the management process matters most. Interviewing 150 dormitory residents, Altinay et al. (2024)
found that dormitory management needed improvement in information management, communication, and
service quality, and proposed digital communication platforms, regular maintenance schedules, and
more transparent financial management.

Saputra et al. (2025) built a web-based room management system for a boarding house that handles
room data, tenant registration, payment invoices, and complaints. In acceptance testing with its
administrator and ten tenants, 90 percent were satisfied, and the system reduced administrative
workload and data entry errors.

Communication with prospective tenants has followed the same pattern. In Ormoc City, where rooms in
boarding houses were found through newspapers, posters, friends, and social media, Pernate et al.
(2025) built a mobile application with real-time listings, booking, and digital transactions,
developed with Agile and evaluated with ISO/IEC 25010, which owners rated Excellent and tenants Very
Good. In Surigao City, Mangca (2023b) developed a web-based boarding house booking system with SMS
notifications, and its tenants and owners credited the notifications with reducing miscommunication
(Mangca, 2023a). Setty (2022) built a website on which homeowners list their properties and
prospective tenants register, search for a home, and contact its owner. Each centers on how a
prospective tenant finds and books a room.

Closest to this study, Canlas et al. (2026) developed FixHub, a maintenance reporting system for
dormitories in the Philippines, using the Agile methodology, and evaluated it with ISO/IEC 25010 and
the Technology Acceptance Model through surveys of tenants, administrators, and IT professionals, who
rated it very highly on every criterion. Its scope is maintenance concerns, emergency alerts, and
complaints.

The literature therefore treats structured communication and maintenance ticketing as integral parts
of an apartment management system rather than supplementary features: a concern recorded in one
system can be traced, coordinated, and followed to completion.

### 2.1.5 Progressive Web Applications as an Accessibility and Integration Framework

A centralized system also has to be reachable on the devices and connections its users have. PWAs
provide a technological framework for meeting that need in resource-constrained environments
(Biørn-Hansen et al., 2017; Muawwal, 2024).

Muawwal (2024) shows that a PWA, built from a web app manifest and a service worker, gives a website
the features of an installed application without a separate native application for each platform:
it could be installed on mobile and desktop devices and remained accessible offline or on an unstable
connection. Biørn-Hansen et al. (2017) likewise explain that PWAs reduce development complexity by
letting a single application operate across multiple platforms without separate native
implementations. Because a PWA is used like an installed application but delivered as a website, its
usability has also been given heuristics of its own (Anuar & Othman, 2024).

These characteristics matter in small-scale apartment operations, where limited infrastructure,
inconsistent connectivity, and varied devices can keep conventional enterprise systems out of reach.
Mia et al. (2024) found that small Philippine enterprises adopted the digital tools they already
knew and could use at no upfront cost, such as social media, and that what held back adoption was
less money or skill than the owners' hesitation and readiness, including doubt that a tool fits how
the business already works. Accessibility, simplicity of deployment, and a fit with existing practice
are therefore critical considerations. A PWA serves as the delivery layer that keeps the centralized
functions of an MIS accessible across devices and conditions.

### 2.1.6 Synthesis of Literature

The reviewed literature shows that the inefficiencies of apartment management come mainly from
fragmented administration rather than from a complete absence of digital technologies. Property
management studies find systems that do not connect with one another and records that are
disorganized and inaccurate (Burke, 2026; Magno et al., 2024). Information systems and software
engineering literature links better decisions to the quality of the data an organization holds and
analyzes (Ghasemaghaei et al., 2018) and credits integrated systems with reducing redundancy and
streamlining the flow of data (Pressman & Maxim, 2020).

Financial studies further show that structured payment records improve administrative oversight and
transparency (Encarnacion et al., 2025; Magno et al., 2024). Communication and maintenance studies
emphasize that accountability improves when issues are resolved through structured digital workflows
rather than informal communication channels (Jing & Lim, 2021; Saputra et al., 2025).

PWA literature shows how these integrated functions can stay accessible across varying device
conditions (Biørn-Hansen et al., 2017; Muawwal, 2024), which matters for small enterprises that
hesitate over tools that do not fit their practice (Mia et al., 2024). Recent housing systems have
also been evaluated with ISO/IEC 25010 (Canlas et al., 2026; Pernate et al., 2025), the quality model
this study uses.

Yet the systems these studies describe are mostly built in isolation. They frequently address one
function, such as financial management, communication, or tenant tracking, and so remain partial
solutions that do not address how apartment management workflows depend on one another. The
literature therefore points to the need for one system that centralizes administrative processes,
formalizes communication, supports financial monitoring, and remains accessible in resource-constrained
residential settings. Appendix R maps these studies by theme, from the problem to the gap this study
fills.

## 2.2 Gap Bridged by the Study

The synthesis shows a research gap: the absence of an integrated apartment management system
designed for small-scale, resource-constrained residential operations. Existing systems are commonly developed either as enterprise-oriented platforms or around one part
of the work. Some center on how a prospective tenant finds and books a room (Mangca, 2023b; Pernate
et al., 2025; Setty, 2022). Others digitize the owner's records, such as rental records and payments
(Magno et al., 2024), or room data, tenant registration, invoices and complaints (Saputra et al.,
2025). Puspasari et al.
(2025), for example, developed a web-based boarding house information system that monitors room
status and sends billing notifications through WhatsApp, but its only user is the boarding house
manager, so tenants cannot see their own bills or report a concern through it.

While these systems improve specific operational areas, small apartment and boarding house operations
face conditions they were not built around: small portfolios that find it hardest to pay for better
software and so keep systems that do not integrate (Burke, 2026), and owners who hesitate over a tool
that does not fit how the business already works (Mia et al., 2024). As a result, many small
operations continue to rely on manual documentation, spreadsheet-based records, informal
communication channels, and disconnected payment records.

This study addresses this gap through Hivelet, a PWA-based apartment management system built for a
small boarding house. It brings tenant and room management, booking and reservation management,
financial tracking, and maintenance ticketing into one system, organized on MIS principles and
usable across devices.

## 2.3 Concept of the Study

The concept of this study is that apartment management improves when its connected processes,
namely tenant management, payment tracking, inquiries and reservations, and maintenance handling,
move from separate manual handling into one centralized digital platform.

Figure 2 illustrates the study's conceptual framework using the Input-Process-Output (IPO) model,
which maps how inputs are transformed into outputs.

*Figure 2. Conceptual Framework.*

![Conceptual framework](figures/figure-2-2-conceptual-framework.png)

In this study, the Input phase consists of the study objectives, review of related literature, client
interviews, needfinding observations, analysis of the landlady's existing administrative and payment
workflows and records, and the requirement for an optional online payment through GCash.
From these inputs, the researchers identified the operational gaps, user requirements, and system
constraints of the boarding house.

The Process phase applies the Agile Software Development Life Cycle, with iterative stages of
requirements, design, development, testing, deployment, and review (Section 3.2). Within this phase,
the six features named in Objective 2 are implemented: tenant and room management (tenants, units and
rates), booking and reservation management (inquiries and reserved units), financial tracking (income
and expense ledgers and reports) with an optional online payment integration using the Adyen API
with GCash, maintenance ticketing and notification, role-based access control for the landlady,
tenants and visitors, and Progressive Web Application support.

The Output phase includes the developed Hivelet system, its functional modules, and generated
outputs such as financial reports exportable as Excel files, inquiry and tenancy records, and payment
records. It also includes the completed research manuscript, system evaluation results based on
ISO/IEC 25010:2011, and the user manual. Feedback from the outputs, chiefly the users' evaluation and
the system's operational performance, returns to the input, so that each iteration starts from what
the last one found.

## 2.4 Definition of Terms

**Hivelet**: The web-based apartment management system, delivered as a PWA, that this study
developed for the Fe Galang Da Silva Boarding House to keep tenant and room management, inquiries and
reservations, financial tracking, and repair requests in one system.

**Progressive Web Application (PWA)**: The form in which Hivelet is delivered: a website that the
landlady or a tenant can add to a phone's home screen from the browser, without an app store, and that
shows the figures last loaded when there is no connection.

**Resource-Constrained Environment**: In this study, a small residential operation such as the Fe
Galang Da Silva Boarding House, with limited money, staff, and technical infrastructure, whose
management relies on a mix of manual and basic digital tools rather than an integrated system.

**Fragmented Workflow**: The handling of tenant records, finances, and repair requests in
disconnected tools (spreadsheets, paper records, and messaging applications), which leaves data
inconsistent and coordination delayed.

**Centralized System**: In this study, one database and one website holding every record the landlady
had kept in separate files and channels: tenants, units and rates, payments, expenses, repair
requests and inquiries.

**Small-Scale Apartment Management**: The administration of a resource-constrained environment as
defined above: in this study, the 33 units of the Fe Galang Da Silva Boarding House, run by the
landlady as the system's only administrator.

**Management Information System (MIS)**: The view of Hivelet taken in Chapter 2: a system that turns
the landlady's raw records, such as receipts, expenses and repair requests, into the summaries she reads
on the Overview and in the downloaded workbooks.

**Inquiry**: A message a prospective tenant sends about a unit through the public website, without
an account. The landlady answers it in the system, may mark the unit Reserved so that it takes no other
inquiry, and if the person rents, moves them in from it. This is the form booking and reservation
management takes in this study: nothing is booked or paid for online.

**Financial Tracking**: The Hivelet module in which the landlady records tenant payments and operating
expenses, the figures that Cash Flow Monitoring summarizes.

**Cash Flow Monitoring**: In this study, the landlady's view of money in and out: income, operating
expenses and net income by month on the Overview, and the monthly income and expense workbooks she
downloads.

**Maintenance Ticketing**: The Hivelet module through which a tenant sends a repair request, which
the landlady assigns, tracks, and updates until it is resolved.

**User Authentication**: Signing in with a login ID or phone number and a password. The landlady creates
each tenant's account with an individual starting password, which the tenant replaces at the first
sign-in.

**Role-Based Access Control (RBAC)**: The rule that each of Hivelet's three kinds of user, the
public, tenants and the administrator, can use only the functions given to that role, checked by the
server on every request (Section 4.2.6).

**Optional Online Payment Feature**: The Hivelet function through which a tenant may pay a bill with
GCash through Adyen. A payment made this way is recorded as pending and counts only after the landlady
verifies it. It supplements rent paid in person and recorded by the landlady, and does not replace it.

**ISO/IEC 25010:2011**: The international software quality standard (International Organization for
Standardization & International Electrotechnical Commission [ISO/IEC], 2011a) against which this
study evaluated Hivelet. It defines eight characteristics of product quality: functional
suitability, performance efficiency, compatibility, usability, reliability, security,
maintainability and portability, divided into thirty-one sub-characteristics. It also defines a
model of quality in use, with five characteristics: effectiveness, efficiency, satisfaction, freedom
from risk and context coverage. The 2023 revision renamed usability as interaction capability and
portability as flexibility, added safety as a ninth characteristic, and moved quality in use into a
separate standard (ISO/IEC, 2023).

**Adyen**: The payment gateway through which a tenant may pay a bill online with GCash. In this study
it runs in Adyen's test environment, where it works end to end but takes no real money. Going live
needs the owner's merchant onboarding documents, which were outside the study.

**GCash**: A Philippine mobile wallet, offered in Hivelet as the optional online way to pay a bill.
It is not live, for the reason given under Adyen, so rent is paid in person and recorded by the
landlady.

**Landlady**: The person who runs the Fe Galang Da Silva Boarding House day to day on behalf of its
owner, and the system's only administrator.

**Owner**: The proprietor of the Fe Galang Da Silva Boarding House, for whom the landlady runs it.
Taking the GCash payment live needs the owner's merchant onboarding documents (Section 1.4).

**Tenant**: A person renting a unit, who uses the system through their own account to view their
bills, receipts and repair requests and to pay online.

**Prospective Tenant**: A person looking for a unit who uses only the public website, without an
account, to view the units and their rates and to send an inquiry.

**Technical Evaluator**: An information technology professional from outside the research team who
rated the system against ISO/IEC 25010:2011.

**User Acceptance Testing (UAT)**: Testing in which the intended users perform their own tasks on the
live system, to decide whether it meets their needs (Section 4.3.7).

**Weighted Mean**: The average rating of a survey item: the sum of each rating multiplied by the
number of respondents who chose it, divided by the number of respondents (Section 3.3).

**50% Share**: A system-computed figure equal to half that row's Rent Amount, kept for ledger parity
with the owner's historical spreadsheet.
