# 2 THEORETICAL FRAMEWORK

This chapter establishes the theoretical and empirical foundation of the Hivelet system by
synthesizing literature on property management systems, Management Information Systems (MIS),
financial analytics, digital communication systems, and Progressive Web Applications (PWA). Rather
than treating these domains independently, the study positions them as interconnected operational
components within apartment management environments. The framework argues that inefficiencies in
small-scale residential operations emerge primarily from fragmented administrative structures, where
records, financial monitoring, communication, and operational coordination exist across
disconnected tools and processes. The reviewed literature collectively supports the need for an
integrated, centralized, and accessible management system tailored for resource-constrained
apartment environments.

## 2.1 Review of Related Literature

### 2.1.1 Fragmentation and Operational Inefficiencies in Property Management

The increasing complexity of apartment and boarding house operations has intensified the need for
structured and centralized management systems. The reviewed studies identify fragmentation of
administrative workflows as one of the primary operational issues in residential property management
(Burke, 2026; Setty, 2022): as tenants, transactions, and maintenance activities increase, manual
documentation, spreadsheet-based tracking, and informal communication become difficult to manage
consistently and accurately.

Burke (2026), examining apartment complexes of 50 to 500 units, finds operational, tenant,
regulatory, labor, and technology challenges that differ from those of commercial properties.
Thevaraju et al. (2019) describe the same condition at an apartment of eight blocks and more than
1,000 units whose maintenance transactions were recorded by hand, and built a web system, developed
with the Agile methodology, through which management handles apartment and tenant data, maintenance
requests, notices, and complaints. Across the sector, Ullah et al. (2018), reviewing 213 studies of
smart real estate technology, find that real estate still needs to improve its adoption of digital
technologies and online platforms to move from traditional to smart practice.

This condition is also reflected in local implementations. Magno et al. (2024) observed that
apartment administrators commonly experience difficulties in tracking payments, organizing tenant
records, and managing paper-based transactions, and that digitization improves data consistency and
transaction monitoring. Pavia et al. (2022) show that a property management system improved
coordination and service operations in a mock hotel for hospitality students, an institutional
setting with predefined workflows and technical support that differs significantly from
resource-constrained apartment operations.

Together, these studies show that the main challenge in apartment management is not the absence of
digital tools but the absence of a structure that consolidates administrative functions into one
environment, where fragmented workflows become cohesive and traceable processes.

### 2.1.2 Management Information Systems as the Foundation of Centralization

This theoretical foundation is grounded in Management Information Systems (MIS), which emphasize the
transformation of fragmented operational data into centralized and actionable information for
decision-making. According to Laudon et al. (2026), MIS functions as an organized system that
collects, processes, stores, and distributes information to support operational control,
coordination, and administrative decision-making. Within apartment management, this framework
explains why manual and semi-digital operations become inefficient: information is distributed across
isolated records, disconnected tools, and inconsistent communication channels. Figure 2-1, adapted from
Laudon et al. (2026), illustrates the flow from operational inputs through processing to outputs that
support decision-making.

*Figure 2-1. Management Information System (MIS) framework, adapted from Laudon et al. (2026).*

**[KEEP: the Figure 2-1 image from the current manuscript, p. 13. Before the defense, compare it with the functions-of-an-information-system figure in the 18th edition (2026); if they differ, redraw it from that edition.]**

Ghasemaghaei et al. (2018) find that a firm's data analytics competency, which includes the quality
of its data, improves its decision-making performance. Pressman and Maxim (2020) explain that
integrated software systems improve consistency, maintainability, and operational reliability by
reducing redundancy and streamlining data flow across system components.

Within apartment management, these principles support a centralized architecture that integrates
tenant information, maintenance records, communication, and financial transactions in one
environment. Property management studies point the same way, locating operational inefficiency where
information systems lack interoperability and centralized accessibility (Burke, 2026; Magno et al.,
2024).

### 2.1.3 Financial Analytics and Administrative Decision Support

Financial management is one of the most critical components of apartment administration, since
payment monitoring, expense tracking, and cash flow visibility shape managerial decisions. The
reviewed studies emphasize that financial inefficiencies emerge when payment records are kept through
fragmented or manual processes (Encarnacion et al., 2025; Magno et al., 2024; Setty, 2022).

Encarnacion et al. (2025) demonstrate that a structured payment monitoring system improves
administrative oversight in student boarding houses by providing organized financial ledgers, payment
summaries, and transaction visibility. Magno et al. (2024) observed that digital transaction tracking
improves billing management and payment monitoring compared with paper-based systems, and Setty
(2022) explains that centralized financial management systems improve transparency and reduce
administrative errors by consolidating transaction records into one database. In the Philippines,
Caparos et al. (2025) developed a cloud-based property management system with automated billing,
secure access controls, and real-time tenant communication for a real estate business in Region XII,
which its staff rated positively on usability, security, operational efficiency, and tenant
experience, security highest.

Read with Ghasemaghaei et al. (2018), these studies treat financial records not merely as reports
but as decision support, most useful when they are integrated into a centralized operational
framework rather than kept as a standalone feature.

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
more transparent financial management. Yet in traditional management settings, tenant concerns are
reported verbally or through messaging applications, so requests go unrecorded and follow-up is
inconsistent.

Saputra et al. (2025) built a web-based room management system for a boarding house that handles
room data, tenant registration, payment invoices, and complaints; in acceptance testing with its
administrator and ten tenants, 90 percent were satisfied, and the system reduced administrative
workload and data entry errors. Recording a complaint as a request is what makes it traceable from
report to resolution.

Communication with prospective tenants has followed the same pattern. In Ormoc City, where rooms in
boarding houses were found through newspapers, posters, friends, and social media, Pernate et al.
(2025) built a mobile application with real-time listings, booking, and digital transactions,
developed with Agile and evaluated with ISO/IEC 25010, which owners rated Excellent and tenants Very
Good. In Surigao City, Mangca (2023b) developed a web-based boarding house booking system with SMS
notifications, and its boarders and owners credited the notifications with reducing miscommunication
(Mangca, 2023a). Each centers on how a tenant finds and books a room.

Closest to this study, Canlas et al. (2026) developed FixHub, a maintenance reporting system for
dormitories in the Philippines, using the Agile methodology, and evaluated it with ISO/IEC 25010 and
the Technology Acceptance Model through surveys of tenants, administrators, and IT professionals, who
rated it very highly on every criterion. Its scope is maintenance concerns, emergency alerts, and
complaints.

The literature therefore treats structured communication and maintenance ticketing as integral parts
of an apartment management system rather than supplementary features: a concern recorded in one
system can be traced, coordinated, and followed to completion.

### 2.1.5 Progressive Web Applications as an Accessibility and Integration Framework

While centralized systems improve operational coordination, effective implementation also depends on
accessibility across devices and varying infrastructure conditions. Progressive Web Applications
(PWAs) provide a technological framework for addressing these challenges in resource-constrained
environments (Biørn-Hansen et al., 2017; Muawwal, 2024).

Muawwal (2024) shows that a PWA, built from a web app manifest and a service worker, gives a website
the features of an installed application without a separate native application for each platform:
it could be installed on mobile and desktop devices and remained accessible offline or on an unstable
connection. Biørn-Hansen et al. (2017) likewise explain that PWAs reduce development complexity by
letting a single application operate across multiple platforms without separate native
implementations. Because a PWA is used like an installed application but delivered as a website, its
usability has also been given heuristics of its own (Anuar & Othman, 2024).

These characteristics matter in small-scale apartment operations, where limited infrastructure,
inconsistent connectivity, and varied devices can keep conventional enterprise systems out of reach.
Mia et al. (2024) find that small and medium-sized enterprises in the Philippines meet barriers of
infrastructure, technical capacity, and resources when they adopt digital technology, which makes
accessibility and simplicity of deployment critical considerations. A PWA is therefore the delivery
layer that keeps the centralized functions of an MIS accessible across devices and conditions.

### 2.1.6 Synthesis of Literature

The reviewed literature collectively demonstrates that operational inefficiencies in apartment
management environments primarily emerge from fragmented administrative structures rather than the
complete absence of digital technologies. Property management studies identify persistent issues
involving disconnected workflows, inconsistent record management, delayed communication, and
operational redundancy (Burke, 2026; Magno et al., 2024). Information systems and software
engineering literature explains these inefficiencies as consequences of fragmented information
processing and lack of centralized operational visibility (Ghasemaghaei et al., 2018; Pressman & Maxim, 2020).

Financial analytics studies further establish that structured and centralized financial data improves administrative oversight and operational transparency
(Encarnacion et al., 2025; Setty, 2022). Similarly, communication and maintenance coordination studies
emphasize that operational accountability improves when issue resolution processes are formalized
through structured digital workflows rather than informal communication channels (Jing & Lim, 2021;
Saputra et al., 2025).

Meanwhile, PWA literature provides the technological framework that enables these integrated
operational components to remain accessible within environments characterized by limited infrastructure (Mia et al., 2024) and
varying device conditions (Biørn-Hansen et al., 2017; Muawwal, 2024). Recent housing systems have also
been evaluated with ISO/IEC 25010 (Canlas et al., 2026; Pernate et al., 2025), the quality model
this study uses.

Despite their complementarity, these studies are commonly implemented in isolation. Existing systems
frequently focus on specific operational functions such as financial management, communication, or
tenant tracking independently, resulting in partial solutions that fail to address the
interconnected nature of apartment management workflows. Consequently, the literature reveals a need
for an integrated operational framework that centralizes administrative processes, formalizes
communication, supports financial monitoring, and remains accessible within resource-constrained
residential environments.

## 2.2 Gap Bridged by the Study

Based on the synthesis of literature, a significant research gap emerges regarding the absence of an
integrated apartment management system specifically designed for small-scale and resource-constrained
residential operations. Existing systems are commonly developed either as enterprise-oriented
platforms or as isolated functional solutions focusing on individual administrative tasks such as
payment monitoring, room booking, tenant management, or maintenance coordination (Magno et al., 2024; Mangca, 2023b; Pernate et al., 2025; Saputra et al., 2025; Setty, 2022). Puspasari et al. (2025), for example,
developed a web-based boarding house information system that monitors room status and sends billing
notifications through WhatsApp, but its only user is the boarding house manager, so tenants cannot
see their own bills or report a concern through it.

While these systems demonstrate improvements in specific operational areas, small-scale apartment
and boarding house operations face conditions they were not built around: administrative work that
grows with every unit (Burke, 2026), and limited infrastructure, technical capacity, and resources
(Mia et al., 2024). As a result, many administrators continue to rely on fragmented workflows
involving manual documentation, spreadsheet-based records, informal communication channels, and
disconnected transaction monitoring processes.

Furthermore, although studies support the importance of centralized information systems, financial
analytics, structured communication, and accessible deployment architectures, few implementations
integrate these components into a single operational framework tailored for localized,
resource-constrained residential settings.

This study addresses this gap through the development of Hivelet, a Progressive Web
Application-based apartment management system designed specifically for small-scale apartment
operations. The system integrates centralized MIS principles, financial tracking mechanisms,
structured issue ticketing, tenant management, booking coordination, and accessible cross-device
deployment within a unified operational environment.

By consolidating these interconnected administrative functions into a single platform, the study
transforms fragmented workflows into cohesive, traceable, and structured system processes, thereby
aligning theoretical principles with practical implementation within real-world residential
management contexts.

## 2.3 Concept of the Study

This study is grounded on the concept of improving apartment management by integrating its core
processes into a centralized digital platform. Apartment operations involve interconnected activities
such as tenant management, payment tracking, booking coordination, and maintenance handling. In
traditional setups, these processes are often managed manually and separately, resulting in delays,
inconsistencies, and increased administrative workload.

Figure 2-2 illustrates the study's conceptual framework using the Input-Process-Output (IPO) model, a
standard software engineering approach that maps how system components interact to transform inputs
into outputs.

*Figure 2-2. Conceptual Framework.*

![Conceptual framework](<../docs/FINAL MANUSCRIPT/figures/figure-2-2-conceptual-framework.png>)

In this study, the Input phase consists of the study objectives, review of related literature, client
interviews, needfinding observations, and analysis of existing administrative and payment workflows.
These inputs provide both theoretical and contextual foundations, allowing the researchers to identify
operational gaps, user requirements, and system constraints within the apartment management
environment. The Process phase applies the Agile Software Development Life Cycle, integrating
iterative stages of planning, design, development, testing, deployment, and review. Within this phase,
the system modules are implemented, including financial tracking (analytics and reports), booking
management (reservation logic), tenant management (profiles and records), maintenance ticketing
(requests and notifications), and an optional online payment integration using the Adyen API with
GCash. These processes transform identified requirements into a
functional and structured system aligned with real-world operational needs. The Output phase includes
the developed Hivelet system, its functional modules, and generated outputs such as financial reports
exportable as Excel files, inquiry and tenancy records, and payment records. It also includes the
completed research manuscript, system evaluation results based on ISO/IEC 25010 standards, and the
user manual. These outputs reflect the system's effectiveness in improving administrative efficiency,
data organization, and communication within the apartment management process. Feedback is
incorporated across all phases, allowing continuous system refinement based on user evaluation and
operational performance, ensuring that the system remains adaptive and responsive to real-world
conditions.

## 2.4 Definition of Terms

**Hivelet** – A web-based apartment management system developed as a Progressive Web Application
(PWA) for the Fe Galang Da Silva Boarding House, designed to centralize and integrate tenant
management, financial tracking, booking inquiries, and maintenance issue reporting into a unified
operational platform that supports small-scale, resource-constrained administrative environments.

**Progressive Web Application (PWA)** – A web-based application architecture that enables app-like
functionality through browsers, providing responsive design, offline capability, and cross-device
accessibility without requiring installation from an app store, making it suitable for low-resource
and hybrid operational environments.

**Resource-Constrained Environment** – Refers to small-scale residential or boarding house operations
characterized by limited financial resources, minimal technical infrastructure, and constrained
administrative manpower, where management processes are typically dependent on hybrid manual and
basic digital tools rather than fully integrated systems.

**Fragmented Workflow** – A condition in which administrative processes such as tenant management,
financial recording, and maintenance reporting are handled using disconnected tools (e.g.,
spreadsheets, paper records, and messaging applications), resulting in inconsistent data, delayed
coordination, and reduced operational efficiency.

**Centralized System** – A system architecture in which all operational data and processes are
managed within a single integrated platform, enabling consistent data storage, real-time access, and
unified control over administrative functions.

**Small-Scale Apartment Management** – Refers to the administrative operation of residential boarding
houses or apartments with limited units, minimal staff, and constrained digital infrastructure, where
management processes are often hybrid, combining manual and basic digital tools.

**Management Information System (MIS)** – An information system framework that processes raw
operational data into structured and meaningful information to support decision-making,
coordination, and control within an organization or operational environment.

**Booking Inquiry** – A system feature that allows prospective tenants to submit room availability
requests through the platform, which are reviewed and processed by administrators for approval or
scheduling purposes.

**Financial Tracking** – A system function that records and monitors tenant payments and operational
expenses in a structured digital format, ensuring accurate financial records and supporting
administrative monitoring of income and expenditures.

**Cash Flow Monitoring** – The process of generating summarized financial reports based on recorded
transactions, providing insights into income, expenses, and overall financial movement within the
apartment system.

**Issue Ticketing System** – A structured digital mechanism that allows tenants to submit maintenance
or facility-related concerns, which are then tracked, assigned, and resolved by administrators through
a centralized workflow system.

**User Authentication** – A security process that verifies the identity of users accessing the system
to ensure authorized entry and protect sensitive operational data.

**Role-Based Access Control (RBAC)** – A security model that restricts system access based on user
roles (e.g., admin, tenant), ensuring that users can only access functions relevant to their
responsibilities.

**Optional Online Payment Feature** – A supplementary system function that allows tenants to settle a
bill through GCash using the Adyen payment gateway, without serving as the primary financial
processing mechanism of the system. A payment made this way enters a pending state and is settled
only after the administrator verifies it.

**ISO/IEC 25010:2011** – An international software quality standard (International Organization for Standardization &
International Electrotechnical Commission [ISO/IEC], 2011a) that defines
eight characteristics of product quality: functional suitability, performance efficiency,
compatibility, usability, reliability, security, maintainability and portability, divided into
thirty-one sub-characteristics. It also defines a model of quality in use, with five
characteristics: effectiveness, efficiency, satisfaction, freedom from risk and context coverage. The
2023 revision renamed usability as interaction capability and portability as flexibility, added
safety as a ninth characteristic, and moved quality in use into a separate standard (ISO/IEC, 2023).

**Adyen** – The payment gateway through which a tenant may pay a bill online with GCash. In this study
it runs on Adyen's test account, and each payment it reports is recorded as pending until the owner
verifies it.

**GCash** – A Philippine mobile wallet, offered in Hivelet as the optional online way to pay a bill.

**Landlady** – The person who runs the Fe Galang Da Silva Boarding House day to day on behalf of its
owner, and the system's only administrator.

**Owner** – In Chapter 4, the landlady in her role as the system's administrator (Section 3.3).

**Tenant** – A person renting a unit, who uses the system through their own account to view their
bills, receipts and repair requests and to pay online.

**Prospective Tenant** – A person looking for a room who uses only the public website, without an
account, to view the units and their rates and to send an inquiry.

**Technical Evaluator** – An information technology professional from outside the research team who
rated the system against ISO/IEC 25010:2011.

**User Acceptance Testing (UAT)** – Testing in which the intended users perform their own tasks on the
live system, to decide whether it meets their needs (Section 4.3.7).

**Weighted Mean** – The average rating of a survey item: the sum of each rating multiplied by the
number of respondents who chose it, divided by the number of respondents (Section 3.3).

**50% Share** – A system-computed figure equal to half that row's Rent Amount, kept for ledger parity
with the owner's historical spreadsheet.
