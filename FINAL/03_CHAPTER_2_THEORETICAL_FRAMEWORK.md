# 2 THEORETICAL FRAMEWORK

This chapter sets out the theoretical and empirical basis of the Hivelet system from the literature
on property management systems, Management Information Systems (MIS), financial analytics, digital
communication systems, and Progressive Web Applications (PWA). The chapter looks at these fields as
parts of one operation, the running of an apartment. Its argument is that small residential
operations lose efficiency mainly because their administration is fragmented: the records, the
tracking of money, the communication and the coordination each sit in a different tool or process.
The literature reviewed here supports building one integrated and accessible management system for
apartment operations with limited resources.

## 2.1 Review of Related Literature

### 2.1.1 Fragmentation and Operational Inefficiencies in Property Management

Fragmented administrative work comes up in the reviewed studies as one of the main operational
problems in residential property management (Burke, 2026; Magno et al., 2024). The more tenants,
transactions and repairs a property has, the harder it is to keep handwritten records, spreadsheets
and informal messages consistent and accurate.

Burke (2026) studied apartment complexes of 50 to 500 units and found operational, tenant,
regulatory, labor and technology challenges unlike those of commercial properties. Residential
tenants, for instance, often ask for minor repairs, and the software in use often does not connect
with the other financial and operational tools, so information stays in separate silos. Thevaraju et
al. (2019) describe the same condition at an apartment of eight blocks and more than 1,000 units
whose maintenance transactions were recorded by hand. They built a web system, developed with the
Agile methodology, through which management handles apartment and tenant data, maintenance requests,
notices, and complaints. Across the sector, Ullah et al. (2018), reviewing 213 studies of smart real
estate technology, find that real estate still needs to improve its adoption of digital technologies
and online platforms to move from traditional to smart practice.

Local studies show the same condition. Magno et al. (2024) observed that apartment rental management
suffers from tracking pending and paid bills across units, missed payment deadlines, and informal,
paper-based records, and that their system improved data management and reduced the errors of manual
processes. Pavia et al. (2022) built a property management system for the mock hotel where
hospitality students take their practical examinations, and its users rated its design,
functionality and ease of use positively. A school setting like that has fixed workflows and
technical support on hand, which is very different from an apartment operation running on limited
resources.

What these studies have in common is that the problem is rarely a lack of digital tools. What is
missing is a structure that pulls the administrative work into one place.

### 2.1.2 Management Information Systems as the Foundation of Centralization

MIS is the theory this study rests on. Laudon et al. (2026) define an MIS as an organized system
that collects, processes, stores and distributes information so that an organization can control its
operations, coordinate its work and make administrative decisions. Applied to apartment management,
the framework explains why manual and half-digital operations fall behind: the information is
scattered across separate records, tools that do not connect and communication channels used
inconsistently. Figure 2-1, adapted from Laudon et al. (2026), shows how operational inputs are
processed into outputs that support decisions.

*Figure 2-1. Management Information System (MIS) framework, adapted from Laudon et al. (2026).*

![Management Information System framework](<../docs/FINAL MANUSCRIPT/figures/figure-2-1-mis-framework.png>)

According to Ghasemaghaei et al. (2018), a firm's competence in data analytics, which includes the
quality of its data, improves how well it makes decisions. Pressman and Maxim (2020) add that
integrated software systems are more consistent, easier to maintain and more reliable, because they
cut redundancy and let data move smoothly between the parts of a system.

For apartment management, these ideas favor a centralized design, with tenant information,
maintenance records, communication and payments kept in one system. Studies of property management
lead to the same place: operations become inefficient where information systems cannot work together
and records cannot be reached from one point (Burke, 2026; Magno et al., 2024).

### 2.1.3 Financial Analytics and Administrative Decision Support

Money sits at the center of apartment administration, because what a manager decides depends on
knowing who has paid, what was spent and how cash is moving. The reviewed studies find that
financial problems begin when payment records are kept by hand or scattered across separate
processes (Encarnacion et al., 2025; Magno et al., 2024).

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

Among residents of high-rise apartments in China, Jing and Lim (2021) found that the quality of
management service affects how satisfied residents are and whether they would recommend the place,
with the quality of the management process mattering most. Altinay et al. (2024) interviewed 150
dormitory residents and found that dormitory management had to improve its handling of information,
its communication and its service. They proposed digital communication platforms, regular
maintenance schedules and more transparent financial management.

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

For these reasons, the studies treat structured communication and maintenance ticketing as core
parts of an apartment management system, not as extras. Once a concern is recorded in one system, it
can be traced, coordinated and followed until it is resolved.

### 2.1.5 Progressive Web Applications as an Accessibility and Integration Framework

Bringing the records into one system helps only if the people who need them can open it. At a small
boarding house, that means a landlady on an ordinary laptop or phone and tenants on their own
handsets, often on a connection that is not stable. The literature points to Progressive Web
Applications (PWAs) as one way to meet that need where resources are limited (Biørn-Hansen et al.,
2017; Muawwal, 2024).

A PWA is still a website. Muawwal (2024) explains that two additions, a web app manifest and a
service worker, are what let it be installed on a phone or a computer and stay usable offline or on
an unstable connection, with no separate native app to build for each platform. Biørn-Hansen et al.
(2017) make a similar point from the developer's side: a single application runs across several
platforms, which spares the work of writing and maintaining separate native versions. Because people
use a PWA as they would an installed app while it is still delivered through the browser, Anuar and
Othman (2024) set out usability heuristics written for PWAs in particular.

This matters for a property like the one in this study. Small operations rarely have the
infrastructure, the steady connection or the matching devices that conventional enterprise systems
take for granted. Mia et al. (2024) saw the same pattern among small Philippine enterprises: owners
stayed with tools they already knew and could use without paying upfront, social media among them,
and what slowed adoption was less a lack of money or skill than the owners' hesitation and
readiness, including doubt that a new tool would suit the way the business already ran. A system for
such a setting has to be easy to reach, easy to set up and close to existing practice. In this
study, the PWA is the layer that carries the centralized functions of the MIS to whatever device the
landlady or a tenant has at hand.

### 2.1.6 Synthesis of Literature

Taken together, the studies reviewed lead to one conclusion: apartment management is inefficient
mostly because its administration is split into separate pieces, not because no digital tools exist.
Studies of property management describe systems that do not connect with one another and records
that are disorganized and inaccurate (Burke, 2026; Magno et al., 2024). In information systems,
better decisions are tied to the quality of the data an organization keeps and analyzes
(Ghasemaghaei et al., 2018), and in software engineering, integrated systems are credited with
cutting redundant work and smoothing the flow of data (Pressman & Maxim, 2020).

The same holds for money and for repairs. Payment records kept in a structured form give the person
in charge better oversight and make the accounts more transparent (Encarnacion et al., 2025; Magno
et al., 2024). Requests handled through a structured digital workflow, instead of through chat or
word of mouth, make it clearer who is responsible for each one (Jing & Lim, 2021; Saputra et al.,
2025).

Two further strands complete the picture. The PWA studies show how these functions can remain within
reach across different devices and connections (Biørn-Hansen et al., 2017; Muawwal, 2024), which is
important because small enterprises are wary of tools that do not fit the way they already work (Mia
et al., 2024). Recent housing systems were also judged against ISO/IEC 25010 (Canlas et al., 2026;
Pernate et al., 2025), the same quality model used in this study.

What is still missing is a system that brings these parts together. Most of the systems described
were built on their own and cover a single function, whether finances, communication or the tracking
of tenants, so each solves part of the problem and leaves out how the steps of apartment management
depend on one another. The need that follows is for one system that centralizes the administrative
work, gives communication a formal channel, supports financial monitoring and stays usable where
resources are limited. Appendix R maps the studies by theme, from the problem to the gap this study
fills.

## 2.2 Gap Bridged by the Study

The synthesis leaves one gap open: no integrated apartment management system has been designed for
small residential operations with limited resources. Existing systems are commonly developed either
as enterprise-oriented platforms or around one part of the work. Some center on how a prospective
tenant finds and books a room (Mangca, 2023b; Pernate et al., 2025; Setty, 2022). Others digitize
the owner's records, such as rental records and payments (Magno et al., 2024), or room data, tenant
registration, invoices and complaints (Saputra et al., 2025). Puspasari et al. (2025), for example,
developed a web-based boarding house information system that monitors room status and sends billing
notifications through WhatsApp, but its only user is the boarding house manager, so tenants cannot
see their own bills or report a concern through it.

These systems do improve particular areas of the work. Small apartments and boarding houses,
however, face conditions the systems were not designed for. Small portfolios find it hardest to pay
for better software, so they hold on to systems that do not integrate (Burke, 2026), and owners
hesitate over any tool that does not fit how the business already works (Mia et al., 2024). Many
small operations therefore keep relying on handwritten records, spreadsheets, informal messages and
payment records that are not linked to anything else.

This study responds to that gap with Hivelet, an apartment management system delivered as a PWA and
built for a small boarding house. Tenant and room management, booking and reservation management,
financial tracking and maintenance ticketing sit in one system, organized on MIS principles and
usable on whatever device is at hand.

## 2.3 Concept of the Study

The idea behind this study is that apartment management works better when its connected tasks,
namely tenant management, payment tracking, inquiries and reservations, and repairs, stop being
handled separately by hand and are brought into one central digital platform.

Figure 2-2 presents the conceptual framework of the study as an Input-Process-Output (IPO) model,
which traces how inputs become outputs.

*Figure 2-2. Conceptual Framework.*

![Conceptual framework](<../docs/FINAL MANUSCRIPT/figures/figure-2-2-conceptual-framework.png>)

The Input phase of this study is made up of the study objectives, the review of related literature,
interviews with the client, needfinding observations, an analysis of the landlady's existing
administrative and payment workflows and records, and the requirement for an optional online payment
through GCash. From these, the researchers worked out the boarding house's operational gaps, what
its users needed and the constraints the system had to respect.

The Process phase follows the Agile Software Development Life Cycle, which repeats the stages of
requirements, design, development, testing, deployment and review in iterations (Section 3.2). It is
in this phase that the six features named in Objective 2 are built: tenant and room management
(tenants, units and rates); booking and reservation management (inquiries and reserved units);
financial tracking (income and expense ledgers and reports), with an optional online payment through
the Adyen API with GCash; maintenance ticketing and notification; role-based access control for the
landlady, tenants and visitors; and Progressive Web Application support.

The Output phase contains the finished Hivelet system and its modules, together with what the system
produces, such as financial reports that export to Excel, inquiry and tenancy records, and payment
records. It also contains the completed research manuscript, the results of the evaluation against
ISO/IEC 25010:2011, and the user manual. What the outputs show, mainly the users' evaluation and how
the system performs in operation, is fed back into the input, so each iteration begins from what the
previous one found.

## 2.4 Definition of Terms

**Hivelet**: The web-based apartment management system this study built for the Fe Galang Da Silva
Boarding House, delivered as a PWA. It keeps tenant and room management, inquiries and reservations,
financial tracking and repair requests together in one system.

**Progressive Web Application (PWA)**: How Hivelet is delivered. It is a website that the landlady
or a tenant can add to a phone's home screen straight from the browser, with no app store, and that
still shows the last figures loaded when the connection drops.

**Resource-Constrained Environment**: In this study, a small residential operation like the Fe
Galang Da Silva Boarding House, which has little money, few staff and limited technical
infrastructure, and is managed with a mix of manual work and basic digital tools instead of an
integrated system.

**Fragmented Workflow**: Handling tenant records, money and repair requests in tools that do not
connect, such as spreadsheets, paper records and messaging applications, so that the data falls out
of step and coordination is slow.

**Centralized System**: In this study, a single database and a single website that hold every record
the landlady used to keep in separate files and channels: tenants, units and rates, payments,
expenses, repair requests and inquiries.

**Small-Scale Apartment Management**: Running a resource-constrained environment as defined above.
In this study, that means the 33 units of the Fe Galang Da Silva Boarding House, with the landlady
as the system's only administrator.

**Management Information System (MIS)**: How Chapter 2 views Hivelet: a system that takes the
landlady's raw records, such as receipts, expenses and repair requests, and turns them into the
summaries she reads on the Overview and in the workbooks she downloads.

**Inquiry**: A message about a unit that a prospective tenant sends through the public website
without an account. The landlady replies in the system, can mark the unit Reserved so that no other
inquiry is taken for it, and moves the person in from the inquiry if they decide to rent. In this
study, this is what booking and reservation management means; nothing is booked or paid for online.

**Financial Tracking**: The part of Hivelet where the landlady records what tenants pay and what the
property spends, which Cash Flow Monitoring then summarizes.

**Cash Flow Monitoring**: In this study, the landlady's view of money in and out: income, operating
expenses and net income by month on the Overview, and the monthly income and expense workbooks she
downloads.

**Maintenance Ticketing**: The Hivelet module through which a tenant sends a repair request, which
the landlady assigns, tracks, and updates until it is resolved.

**User Authentication**: Signing in with a login ID or a phone number and a password. The landlady
sets up each tenant's account with its own starting password, and the tenant changes it on first
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
