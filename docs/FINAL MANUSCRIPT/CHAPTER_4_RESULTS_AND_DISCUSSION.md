# 4 RESULTS AND DISCUSSION

> **TEAM NOTE (delete every TEAM NOTE block before pasting into the manuscript).**
> **Cut to the course guide on 12 October 2026** (*Capstone Project 2 Student Guide, Chapter 4*, v03:
> 25 to 45 pages, "padding is penalized"; indicator-level tables, full test cases and raw data in the
> Appendices). The full text of 11 October is commit `a7ce1e9`; nothing in it was deleted that is not
> either condensed here or moved word for word to `APPENDIX_M_CHAPTER_4_EVIDENCE.md`: the walkthrough
> rows (old Table 10), the survey items (old Tables 14 to 21), the measured evidence per
> characteristic (old Tables 14A to 21A) and every optimization (old Table 23, 51 rows). Table and
> figure numbers are the drafts' own; `TABLE_AND_FIGURE_NUMBERS.md` maps them to the chapter scheme
> (Table 4-1). Captions are in the guide's sentence case and sit above every exhibit (guide Part 8.1).
> Headings stay by objective: the guide calls the 4.1 to 4.4 headings strong advice, the template's
> own Chapter 4 is titled by objective, and the adviser decides (GUIDE_ALIGNMENT D1).

This chapter presents the results of the study in the order of the four specific objectives in
Section 1.2: the analysis of existing practices (4.1), the development of the system (4.2), pilot
testing (4.3), and evaluation and optimization against ISO/IEC 25010 (4.4), followed by the
deployment plan (4.5). As described in Section 3.3, every quality characteristic is judged on two
kinds of evidence: what was measured in testing and how the system's users rated it.

---

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

*Answers Objective 1.*

The Fe Galang Da Silva Boarding House has 33 rentable units in five clusters: the Boarding House
(22 units), the Back Apartment (5), the Front Apartment (3), the Penthouse (1) and Linda (2), on three
residential floors and a rooftop penthouse level (12, 11, 9 and 1 units). Thirty-two of the 33 units
are let to the boarding house's tenants.

### 4.1.1 Existing Practices and Identified Problems

Before the system, the landlady kept a spreadsheet workbook with two sheets, a Monthly Income Report and
a Monthly Expenses Report, on a USB flash drive, together with a paper invoice book. Rent was
collected in cash on site, and repair requests arrived by messaging application or in person. Table 5
compares each practice with the problem it caused. Inquiries arrived much as Pernate et al. (2025)
found for boarding houses in Ormoc City, through social media and word of mouth, and left no record.

**Table 5.** Existing practices and identified problems

| Area | Existing practice | Problem identified |
| :--- | :--- | :--- |
| Tenant management | Tenant details kept in the income sheet and in the landlady's memory | No single record of who lives in which unit, since when, or how many occupants |
| Financial tracking | Income and expense sheets typed by hand; invoices written in a paper book | Totals depend on manual arithmetic; nothing checks an invoice number against the book; one file on a USB flash drive is the only copy |
| Communication | Requests sent by messaging application or said in person | Requests are not recorded, so there is no way to follow a request to completion |
| Booking | Inquiries arrived through Facebook, referrals from other people, contact and text messages, or walk-ins in person | No record of inquiries or which unit an inquiry was about |

Figure 4 follows each area through the hands that touched it. Every path ends in a record kept apart
from the others, or in no record at all, which is where each problem in Table 5 begins.

*Figure 4. The landlady's process before the system.*

![The landlady's process before the system](figures/figure-4-current-process.png)

The strongest evidence came from the landlady's own records. Transferring her workbook into the system
(937 income rows and 1,327 expense allocations, from January 2024 to July 2026) exposed problems the
spreadsheet had hidden. **402 of
the 937 income rows (43%)** had no anniversary date and no deposit, and **five invoice numbers** were
each used for two different payments, once for two tenants on the same day (Section 4.3.1). The main
finding is that the problems did not sit in one area. **Each area kept its own informal record, and
nothing connected one to another**, the fragmentation described in Chapter 2 (Burke, 2026; Magno et
al., 2024).

### 4.1.2 System Requirements

The analysis produced **44 functional requirements** and **49 business rules**, each traced in a
traceability matrix to the part of the system that implements it. Graded against the code early in the second iteration, 25 of the 44 were implemented as worded.
Graded again by the same criteria against the final system, on 13 November 2026, 33 are implemented
as worded, 9 in part and 2 not as worded (Appendix M, Table M-32). What those two describe, the
income, expenses and net income and their trend by month, is shown on the landlady's Overview,
worked out on the screen rather than by the server. Table 6 traces each gap to
the requirement and the module that meets it.

**Table 6.** Identified gaps, system requirements and implementing modules

| Identified gap | System requirement | Module (Section) |
| :--- | :--- | :--- |
| No single tenant and unit record | Keep one record per unit and per tenant, with occupancy and move-in dates | Tenant and Room Management (4.2.2) |
| Inquiries not recorded | Let the public view units and send an inquiry about a specific unit | Booking and Reservation (4.2.3) |
| Manual arithmetic and unchecked receipts | Compute charges, record payments against the landlady's own invoice numbers, reproduce the landlady's reports | Financial Tracking (4.2.4) |
| Cash only, no digital option | Offer an optional online payment that the landlady verifies before it counts | Financial Tracking (4.2.4) |
| Requests not followed to completion | Record each request and its status until the landlady closes it | Maintenance Ticketing and Notification (4.2.5) |
| Anyone with the file sees everything | Give the landlady and each tenant access to only what their role needs | Role-Based Access Control (4.2.6) |
| One file on one device | Make the system reachable from any phone or computer | Progressive Web Application (4.2.7) |

The analysis also set ten non-functional requirements, one for each ISO/IEC 25010 characteristic
and two for auditability and exportability. Table 6B lists them with the section that reports how
each was met.

**Table 6B.** Non-functional requirements and where each is measured

| Code | Requirement | Measured in |
| :--- | :--- | :--- |
| NFR-001 | The system shall provide the required business functions accurately | Sections 4.3.1 to 4.3.4; Section 4.4.3 |
| NFR-002 | The system shall be understandable to a non-technical administrator | Section 4.3.7; Section 4.4.3 (Usability) |
| NFR-003 | The system shall protect personal and financial information | Section 4.2.6; Section 4.4.4 |
| NFR-004 | Common operations should respond efficiently under the expected workload | Table 11; Appendix M, Tables M-25 and M-31 |
| NFR-005 | The system shall function on modern desktop and mobile browsers | Table 24; Section 4.4.3 (Compatibility) |
| NFR-006 | The system shall preserve data consistency and avoid silent data loss | Sections 4.3.1, 4.3.3 and 4.3.6 (Appendix M, Table M-26) |
| NFR-007 | The codebase shall use a modular, documented, maintainable architecture | Section 4.4.3 (Maintainability): partly met |
| NFR-008 | The system shall be deployable to a hosting environment the researchers can maintain | Section 4.2.1; Table 24 |
| NFR-009 | Important financial and administrative changes shall be traceable | Section 4.2.6 (audit trail) |
| NFR-010 | Relevant business data shall be usable outside the application | Section 4.2.4 (Excel downloads) |

NFR-008 originally named the university's server. On the adviser's advice the researchers deployed the
system on its own hosting instead (Section 3.2.5), and the requirement was reworded to match.

Where a requirement needed the landlady's answer, it was asked rather than assumed. She confirmed that
a bill is overdue from the day after its due date, and that rates are set by hand, so no increase is
applied automatically. She also confirmed the rate of every unit, each of which agreed with her receipts, and that tenants
do not report cash payments, because the landlady records every payment.

---

## 4.2 Development of the Hivelet System

*Answers Objective 2. Each feature the objective names has its own subsection.*

Figures 5 to 9 model the system as built, and Figures 10 to 14 show its screens after the redesign
of the third iteration. The names, payments, expenses and repair requests in the screen figures are
sample records, so that no real tenant's name or payment appears in any figure.

### 4.2.1 System Architecture and Technology Stack

The system was developed in three Agile iterations (Section 3.2; Appendix M, Table M-19). The first
checked the system and its documents against each other, corrected 22 recorded errors and added
automated checks. The second put the system in the hands of the landlady and her tenants and refined
it from their feedback, the testing and the evaluation. The third redesigned the screens, added no
module, and added two rules: a record dated in a closed year can no longer be changed, and a tenant
can no longer cancel a repair once someone is sent. After the redesign, 77 of the 114 test cases
were run again and passed, the other 37 needing a person, and none failed, so the results of the
second iteration stand.

The evaluation against ISO/IEC 25010 was carried out twice, each time in actual use as Section 3.3
requires: in the second iteration, and again in the third on the redesigned system, with a second
round of users and of technical evaluators (Sections 4.3.7 and 4.4). Section 4.4 reports the second
and gives the first for comparison. Table 7 lists the technology used.

**Table 7.** Technology stack of the developed system

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Presentation | Vue 3.5 with TypeScript 5.7, built with Vite 5.4, styled with Tailwind CSS 4.3 | The screens used by the public, tenants and the landlady |
| Application | Node.js with Express 4.22 in TypeScript | Business rules, calculations and access checks |
| Data | PostgreSQL 17.6, hosted on Supabase | Storage of all records, with row-level security |
| Payment gateway | Adyen (Web Drop-in 6.44, API Library 32.0) with GCash | The optional online payment, in Adyen's test environment, which takes no real money |
| Client delivery | Progressive Web Application (vite-plugin-pwa) | Installation on a phone or computer without an app store |
| Hosting | Vercel | Serves the application at a public web address |

Figure 5 shows where each part runs. The application reaches the browser as a Progressive Web
Application and talks to one server program, an Express API on Vercel. Only that API reads or writes
the database. Row-level security is on for every table, so a request that does not pass the API's
sign-in and role checks reaches no data. Payment details go from Adyen's own form to Adyen directly,
and every change to the database is a numbered, reviewable migration. The system is hosted rather
than run on a server at the property or the university (Section 3.2.5), so the boarding house needs
no equipment beyond the landlady's own laptop and phone.

*Figure 5. System architecture.*

![System architecture](figures/figure-5-system-architecture.png)

Figure 6 is the context diagram: the system as one process, with the three parties outside it and the
data that passes between them. Figure 7 opens it into eight processes and the stores each reads and
writes, in the Gane and Sarson notation. A rounded rectangle is a process, a rectangle open on the
right is a data store, and a shaded square is a party outside the system. To trace one path, the
landlady records a cash receipt through process 4.0, Bill and record payments, which writes it to store
D3, Bills and receipts. Process 7.0, Produce reports, reads it from there for the Overview and the
Excel workbooks. The notifications and the audit record are written by nearly every process and are
left out of Figure 7 for readability. The units store, D1, is drawn twice, the second time under
processes 5.0 and 4.0, so that its lines cross no others. Adyen, the payment gateway, is drawn as part of
the payment process rather than as a party outside the system, as in the data flow diagrams the
researchers' Systems Analysis and Design professor approved. Taking a GCash payment through Adyen is step 4.3 of process
4.0 (Appendix F), and Figure 5 shows where the gateway sits.

*Figure 6. Context diagram.*

![Context diagram](figures/figure-6-context-diagram.png)

*Figure 7. Level 1 data flow diagram.*

![Level 1 data flow diagram](figures/figure-7-data-flow-level-1.png)

Figure 8 shows the same functions from the side of the people who use them. Each use case is a
function the server grants to that role and refuses to every other (Table 7C).

*Figure 8. Use case diagram.*

![Use case diagram](figures/figure-8-use-case-diagram.png)

Figure 9, in Crow's Foot notation, is the entity-relationship diagram drawn from the database's own
catalogue: 21 tables, each with a primary key, and 37 foreign keys. Its two
centers are the rooms table, which holds the units, and the profiles table, which holds the people.
Every bill, payment, receipt, tenancy, repair request and inquiry belongs to one unit, and every
tenancy, bill and payment to one person. The two ledgers are kept as the landlady kept them. The tables follow the third normal form, each
column describing only its own table's key, with deliberate exceptions so that a record stays as it
was made. A receipt keeps the name, occupants and amounts written on it, and a bill the amounts it was raised
with. Receipts name their unit and tenant directly, since the 937 transferred from the workbook have no tenancy to point
to, payments name theirs beside their bill, and a few totals are stored beside the figures they add
up. Several
rules live in the database itself, so no screen or script can bypass them. One unit cannot have two
active tenancies, one invoice number cannot be used twice for the same unit and month, a gateway
reference cannot be recorded twice, and the 50% Share and the remitted amount are computed columns.
Table 7A is an extract of the data dictionary for the table the landlady reads most. The complete
dictionary, every column of all 24 tables, is in Appendix N. It holds the 21 tables drawn in Figure 9
and three that keep backups made before corrections to the data.

*Figure 9. Entity-relationship diagram.*

![Entity-relationship diagram](figures/figure-9-entity-relationship.png)

**Table 7A.** Data dictionary extract: monthly income records

| Column | Type | Null | Key | Description |
| :--- | :--- | :---: | :---: | :--- |
| id | uuid | No | PK | Identifies the receipt |
| room_id | uuid | No | FK | The unit the payment is for (rooms) |
| tenant_profile_id | uuid | Yes | FK | The tenant who paid, where one is recorded (profiles) |
| assignment_id | uuid | Yes | FK | The tenancy the payment belongs to, where known (room_assignments) |
| year, month | integer | No | | The ledger month the receipt is filed under |
| date_paid | date | No | | The day the money was received |
| contact_name | varchar(255) | No | | The name as written on the receipt |
| invoice_number | varchar(100) | Yes | | The landlady's own invoice number; not repeated for the same unit and month among receipts that are not voided |
| rent_period_start, rent_period_end | date | No | | The period the rent covers (BR-033) |
| rent_amount | numeric(10,2) | No | | The rent received |
| occupants | integer | No | | The number of occupants that month |
| water_payment | numeric(10,2) | No | | The water fee, ₱200 per occupant (BR-014) |
| fifty_percent_share | numeric(10,2) | | Computed | A system-computed figure equal to half the row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet (BR-035) |
| remitted_amount | numeric(10,2) | | Computed | Rent Amount plus Water Payment (BR-038) |
| payment_method | enumeration | No | | Cash, GCash, Bank Transfer or Adyen Online |
| verification_status | enumeration | No | | Verified, Pending Verification or Rejected |
| transaction_reference | varchar(120) | Yes | | The gateway's reference for an online payment; never recorded twice |
| is_linda_billing, linda_water_charge, linda_electricity_charge | boolean, numeric(10,2) | Yes | | The two Linda units' charges, recorded separately (BR-040) |
| voided_at, voided_by, void_reason | timestamp, uuid, text | Yes | voided_by: FK | When, by whom and why a receipt was voided; a voided receipt is kept, never deleted |
| created_at, updated_at | timestamp | Yes | | When the row was written and last changed |

### 4.2.2 Tenant and Room Management Module

Figure 10 presents the Rooms and rates screen. Each unit carries its cluster, floor, current rate and
status, and each tenancy the number of occupants, the move-in date and emergency contacts. When the
landlady changes a rate, a database trigger records the old rate, the new rate, the date and who made the
change, so no path can change a rate without leaving that record. The landlady's workbook did not record
move-in dates, so for the transferred tenancies the screen says the date is not recorded rather than
showing a guessed one. A tenant can also see the deposit held for their tenancy on their Overview,
as one tenant asked in the survey (Table 23).

*Figure 10. Room and rate directory.*

![Room and Rate Directory](figures/figure-10-rooms-and-rates.png)

### 4.2.3 Booking and Reservation Management Module

Booking and reservation management takes the form the landlady's practice needs. She arranges every
viewing herself, so nothing is booked or paid for online. A visitor sends an inquiry about a unit,
the landlady answers it, may mark the unit Reserved, and moves the person in from the inquiry (Section
1.4). Figure 11 presents the public unit catalogue and the inquiry form. A visitor sees each unit
with its rate, read live from the database, and sends an inquiry about a specific unit without an
account. On sending, the visitor receives a private link and a short reference code. Either one
(the code with the phone number given) opens the conversation, where the landlady's answer appears and
the visitor can write back. The link's
secret is stored only in hashed form. An accepted inquiry becomes a tenancy linked to it, and a
reserved unit accepts no new inquiries. The public site never shows a tenant's name, which is
checked on every verification run against all 33 units.

*Figure 11. Public unit catalogue (top) and inquiry form (bottom).*

![Public unit catalogue](figures/figure-11a-public-unit-catalogue.png)

![Inquiry form](figures/figure-11b-inquiry-form.png)

### 4.2.4 Financial Tracking and Payment Recording Module

Figure 12 presents Monthly Income. The landlady records a cash payment with the number of the
invoice she issued, or with none, since not every payment has one. The system never makes up an
invoice number, and it warns her if the unit already has a payment recorded for that period. The
receipt is filed under the month the rent is for, not the day it was paid. Both the income and the
expense records keep her workbook's layout and download as Excel files in it. The optional online
payment goes through Adyen with GCash, in Adyen's test environment, where it takes no real money. A
payment made this way enters **Pending Verification** and changes nothing on the tenant's bill until
the landlady verifies it. Such payments wait on the **To verify** tab beside **Records**, and while any
are waiting the page opens on that tab. Tenants see the same record from their side, month by month.
Only receipts the landlady has verified count as paid, and a month with no receipt is shown as "Not
recorded", never as owed, because the records alone cannot tell an unpaid month from one not yet
entered. Electricity is outside the system. Each unit has its own meter, and the tenant pays the
electric company directly.

*Figure 12. Monthly Income, with a GCash payment waiting to be verified.*

![Monthly Income](figures/figure-12-monthly-income.png)

These results agree with Magno et al. (2024), who found that digitizing billing and payment
tracking improved data management and reduced the errors of manual processes, and with Encarnacion
et al. (2025), whose system let landlords track payments and see balances. They add one observation:
the consolidation also exposed errors already in the landlady's records (Section 4.1.1). Every figure the
landlady reads is computed from the rules in Table 7B rather than typed, so the same inputs always give
the same amount.

**Table 7B.** Business rules for computed figures, with a worked example

| Rule | What the system computes | Worked example |
| :--- | :--- | :--- |
| BR-014 Water fee | Water = number of occupants × ₱200 | A unit with two occupants: 2 × ₱200 = ₱400 |
| BR-038 Remitted amount | Remitted = Rent Amount + Water Payment | ₱8,500 + ₱400 = ₱8,900 |
| BR-035 50% Share | A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet | ₱8,500 ÷ 2 = ₱4,250 |
| BR-033 Rent period | The period a payment covers, from the tenancy's anniversary date | Anniversary on the 13th: rent for 13 August to 12 September |
| BR-010, BR-011, BR-012 Due date and overdue | Due on the date the billing cycle sets; overdue from the next day, with no grace period | Due 13 September: overdue from 14 September |
| BR-039 Deposit | Equal to the rent in effect at move-in, set once | Moved in at ₱8,500: deposit ₱8,500 |
| BR-040 Linda's units | Water at the same ₱200 per occupant, recorded separately and kept out of the remitted amount | A Linda unit with two occupants: ₱400 recorded as Linda's water; remitted = rent only |
| BR-045 Expense total | An expense entry's total = the sum of its allocations to property areas | ₱6,000 to the Boarding House + ₱2,000 to the Main House = ₱8,000 |

### 4.2.5 Maintenance Ticketing and Notification Module

Figure 13 presents the repairs board. A tenant submits a repair request with a title, description
and priority, follows it through to completion, and may cancel it until someone is sent to do the
work. The landlady can also log a repair she is told about in person, including one for an empty unit.
Only the landlady closes a request, and the tenant is notified when it is done. In-app notifications
also tell a tenant when a payment is verified or declined, and the landlady when a payment, inquiry or
comment arrives. Opening one opens the record it is about. Saputra et al. (2025) likewise brought a
boarding house's complaints into the system that holds its rooms and payments, and reported less
administrative work. The change also bears on the quality of the management process, which Jing and
Lim (2021) found matters most to residential satisfaction. A request now carries its status from
submission to closing, where before it left no record (Figure 4).

*Figure 13. Maintenance requests board.*

![Maintenance Requests Board](figures/figure-13-repairs-board.png)

### 4.2.6 Role-Based Access Control

The system has the three kinds of user designed in Section 3.2.2: the public, tenants and the
administrator. It also keeps a record of each visitor who sends an inquiry, a prospective tenant, who
holds the public's rights. Every role's rights come from one permission matrix. Each of the 60
administrator and tenant routes is checked against it on every verification run.
Table 7C sets out which role may use which function.

**Table 7C.** Role and privilege matrix

| Function | Visitor | Tenant | Administrator |
| :--- | :---: | :---: | :---: |
| View the public site, units and rates | Yes | Yes | Yes |
| Send an inquiry and read the reply (private link or reference code) | Yes | No | No |
| View and update their own details and password | No | Own | Own |
| View a unit, its bills, payments and receipts | No | Own | All |
| Pay a bill online with GCash | No | Own | No |
| Send, follow and cancel a repair request | No | Own | All, and dispatch or close |
| Receive notifications | No | Own | Own |
| Manage units and rates | No | No | Yes |
| Manage tenants: move in, move out, reset a password | No | No | Yes |
| Record, verify, correct and void payments | No | No | Yes |
| Income and expense records, overview figures and workbook downloads | No | No | Yes |
| Answer, close and delete inquiries | No | No | Yes |

Passwords are stored as bcrypt hashes with a per-password salt. A new one needs ten characters, a
letter and a number, and is refused if it appears in a public list of breached passwords. An account
locks after five failed sign-ins, a new account must change its password at first sign-in, and every
administrator action is written to an audit trail the application cannot edit, delete or empty. The
trail is kept in the database and is read there. A screen that showed it was removed on the adviser's
advice that it is a developer's record, and each person's side menu lists their own last three
actions. The testing of these protections is reported in Section 4.4.4.

### 4.2.7 Progressive Web Application Implementation

Figure 14 presents the tenant portal on a phone. The client is a Progressive Web Application with a
service worker and a manifest, so it installs on a phone or computer without an app store. It is
installed from the browser (**Add to Home Screen** in Safari, **Install app** or **Add to Home
screen** in Chrome) and opens in its own window like an application. The application files it keeps
on the device come to about 1.2 MB. It keeps a read-only copy of the figures, names and
notifications the signed-in person last loaded on that person's device, so the installed
application can show them without a connection, under the notice "No connection · Transactions
unavailable". Paying and recording still need the connection, and the copy is removed at sign-out,
which stays within the delimitation in Section 1.4. Screens adapt to the device, and a table on a computer becomes a list on a phone, one
row to a record. As Biørn-Hansen et al. (2017) describe, one code base served every device: the
landlady's laptop, an Android phone in Chrome and an iPhone in Safari (Section 4.3.7).

*Figure 14. The tenant portal on a mobile phone.*

![The Tenant Portal on a Mobile Phone](figures/figure-14-tenant-portal-phone.png)

---

## 4.3 Pilot Testing of the Developed System

*Answers Objective 3: functionality, responsiveness and operational performance.*

The three qualities Objective 3 names are characteristics of ISO/IEC 25010:2011: functionality is
**Functional Suitability**, responsiveness the time behavior of **Performance Efficiency**, and
operational performance its capacity and **Reliability**. A test written for one quality often
measures others, so each test was assigned in advance to the sub-characteristics it measures
(Chapter 3, Table 4B). Appendix M, Table M-23, lists them by test activity. The measures are brought
together by characteristic in Section 4.4.

### 4.3.1 Automated Verification

Twenty automated check suites were written during development, and a twenty-first was added later
(Section 4.3.6). They run against the live system and perform no writes, which is what makes them
safe to run against the boarding house's real records. The evening before the first test with real
users, all 20 passed. Table 8 shows the principal results.

**Table 8.** Results of automated verification

| Suite | What it checks | Result |
| :--- | :--- | :--- |
| Endpoint and access control | Every endpoint the client calls, the separation of roles, and the rejection of bad input | 78 of 78 passed |
| Ledger integrity | All 937 income rows against the business rules; unit, tenant and occupancy agreement | Passed; 5 receipt anomalies reported for the landlady |
| Report reconciliation | The exported Excel reports against the database, month by month | 490 of 490 passed |
| Payment gateway | Signature checking on gateway messages and how each kind of message is recorded | 73 of 73 passed |
| Record relations | That separate records agree with each other (payments with bills, tickets with units) | 30 of 30 passed |
| Billing arithmetic | Water, billing period and how a payment is split across bills | Passed |
| Data presentation | That no screen shows stored, sample or empty data as a live figure | 6 of 6 passed |
| Interface integrity | That every screen component exists, every input has a label, and every source file is used | Passed |
| Document consistency | That the requirements matrix and business rule register agree with themselves | Passed (44 requirements, 49 rules) |

The five receipt anomalies in Table 8 are those of Section 4.1.1. They came from
the landlady's records and are reported on every run rather than corrected, because only her invoice
book can say what each should read. More important, the most serious defects found in development
gave no error on screen. A cash payment could be confirmed while nothing was written to the ledger,
and a partial payment could be recorded while the remaining debt was lost. Each was fixed and now has
a check that fails if it returns. This is the case for automated verification in a system that holds
real money: the most dangerous defects are the silent ones.

### 4.3.2 Use in the Live Environment

The system has run at a public address with the boarding house's real records throughout the pilot.
Its first real bill was computed exactly as the rules require, and a test receipt voided after it
was recorded returned the ledger to its 937 rows. When the landlady found the system hard to use on
her phone, the causes were measured and fixed the same day. A GCash test payment passed end to end,
from Adyen's authorization to the landlady's verification queue, once Adyen corrected an account
setting on its side. Every record the pilot tests created was then removed by one reviewed migration
after a backup, leaving the 937 income rows transferred from her workbook untouched.

### 4.3.3 Screen-versus-Database Audit

The suites prove each part correct on its own, not that a screen shows a person what the database
holds for them. A tenant's payment history once read "Nothing recorded" although the tenant had
seven receipts that year, while every suite passed. The researchers therefore compared every figure on every
administrator and tenant screen with a read-only query of the live database for the same records. Table 9 shows the result.

**Table 9.** Results of the screen-versus-database audit

| Screen | What was compared | Result |
| :--- | :--- | :--- |
| Administrator overview | Collections for each month of 2026, the year's total, occupancy, rent per cluster, expected monthly income, operating and personal costs | Matched to the peso |
| Monthly Income | Totals for rent and water; collections by cluster | Matched after one defect was fixed |
| Monthly Expenses | Total spent, split by kind and by area | Matched; one layout defect fixed |
| Rooms and rates | Rent and number of occupants for each unit | Matched |
| Tenants | Number of tenants per cluster; move-in dates | Counts matched; one defect fixed |
| Activity (audit trail), a screen later removed (Section 4.2.6) | Each recent entry against the recorded action | One defect fixed |
| Repairs, inquiries | Number of open items | Matched |
| Tenant payments | A tenant's receipts for 2026 | Two defects fixed |
| Tenant overview, repairs and details | Unit, rate, occupants, monthly charge (rent plus ₱200 per occupant), the period the receipts reach, amount due, requests, contact details | Matched |

The audit found six defects no automated check had caught, all fixed the same day. They were a
tenant's payment history that read only online payments, rental and personal expenses in one column,
a placeholder move-in date shown for every tenant, an opened checkout listed as a recorded payment, a
voided receipt in a tenant's receipt list, and the Boarding House's remitted amount halved on the
income screen. The lesson is the reverse side of Section 4.3.1: **passing checks show that what was
tested is correct, not that everything is.** It qualifies Magno et al. (2024), who found that
digitizing transaction tracking improves data accuracy. Here every record was already digital and in
one database, yet six screens disagreed with it, so digitizing alone did not make the records agree.

### 4.3.4 Functional Walkthrough Testing

A 26-step walkthrough, 30 rows counting its sub-steps, exercised every function that writes data
once, on the one unit then unoccupied, so that no real record was touched. The landlady performed it
herself on her laptop, signed in to her own account, with one of the researchers reading
each step. The full results are in Appendix M, Table M-1. Of the 30 rows, 24 passed the first time,
1 failed and 5 were not performed as written. Every function a tenant uses passed, as did
onboarding, the duplicate guards, voiding, inquiry replies, repairs, the Excel export and moving a
tenant out. The one failure was step 23b. With the connection cut, the Overview showed ₱0 where the
design requires "—", so that a missing figure is never read as a zero balance. Once corrected, it passed
when re-tested on the landlady's laptop (Table 23A). A rate change and its reversal were skipped, and an expense split across two areas was entered as two
expenses, so splitting, editing and deleting an expense were not exercised by the landlady.

### 4.3.5 Responsiveness and Operational Performance

Response times were measured on the live system, on the laptop and phone named in Section 3.1.2,
from the tap until the figures the user came for were on screen (Table 11).

**Table 11.** Page load and response times (seconds)

| Screen | Laptop (Dell XPS 15, Chrome 154, Wi-Fi) | Phone (iPhone 15, Safari, mobile data) |
| :--- | --: | --: |
| Public home page, first load | 1.85 | 2.42 |
| Public home page, second load | 0.62 | 0.95 |
| Sign-in to dashboard | 2.10 | 2.88 |
| Income ledger, one full year | 1.45 | not measured |
| Excel export of one year | 2.30 | not measured |
| Tenant portal, first load | 2.15 | 3.05 |
| Tenant payments page | 1.20 | 1.78 |
| Sending a repair request | 1.65 | 2.10 |

Every screen was usable within about three seconds on the phone and a little over two on the laptop,
the slowest being the tenant portal's first load (3.05 seconds on the phone). Google's PageSpeed
Insights, emulating a mid-range phone on slow 4G, scored the public page 85 to 88, with its largest
element at 3.4 to 3.6 seconds, and 100 for accessibility. On the administrator's Overview, Lighthouse found
the page moving as its figures arrived (a layout shift of 0.22) and 0.7 seconds of script work on the
phone (Chapter 5, recommendation 5).

After the redesign of the third iteration, the screens were timed again on another laptop and
network (Appendix M, Table M-31). Every screen timed was ready sooner than before except sign-in to the Overview, at 2.63 seconds against 2.10. The two days used different laptops, networks and timing
methods, so the comparison shows the direction of the change and not an exact difference. The administrator's Overview now
moves by 0.08 as its figures arrive, down from 0.22 and below the 0.1 counted as good.
PageSpeed Insights scored the public page 85 on a phone, as before, with its largest element at 4.2
to 4.4 seconds, and 99 on a desktop.

### 4.3.6 Offline Use, Installation, Weak Connections and Simultaneous Users

The live system was measured with no connection, on a weak one, once installed,
and with many requests at once, using an automated browser in phone emulation with every save blocked
so that nothing was written to the boarding house's records. Without a connection, the installed application
opened on all ten addresses tried, in about 1.5 seconds. It showed no personal or financial data
until sign-in and said at once what could not be done offline. On a slow connection a returning
visitor saw the units after 0.3 seconds instead of 4.6. In a load test a script played 12
simultaneous users on the public pages and 6 on the administrator's screens, each pausing between requests
as a person reading does. None of the 1,085 and 285 requests failed, and nineteen in twenty were
answered in under a second, under loads several times the property's own. These were simulated
users, not people (the landlady and tenants together are reported in Section 4.3.7). Every result is in
Appendix M, Tables M-24 and M-25.

The tests found one weakness: on a weak signal a page could wait for minutes with no message. A
limit was added the same day. A page now stops after 25 seconds and says it could not reach the
server, and a save stops after 45 seconds and says it **cannot tell whether the save arrived, so the
reader should check before sending it again**. An accessibility scan of the public pages (axe-core 4,
WCAG 2 A and AA) at phone and computer widths found no violation, nor did the same scan of the
administrator's eight screens.

**Simultaneous saves.** Reading at the same time tests capacity. Saving at the same time tests
correctness, because two requests that arrive together can each pass a check before either has been
saved. This was tested by sending the same request several times in the same instant. That
reproduces a double click, a retry after a timeout, or two people pressing Save together, with closer
timing than people can produce by hand. Before the fix, the same receipt sent twice or five times at
once was saved every time, and two GCash checkouts could open on one bill. After it, one was saved
and every other refused, and a checkout abandoned for more than 15 minutes no longer held the bill
(Appendix M, Table M-26).

Neither fault showed an error, and neither could be fixed in the program alone, since a check
followed by a save can always be outrun. Each fix is a rule in the database, which refuses the second
save whatever order the requests arrive in, so ten requests arriving together meet the same refusal
as two. A twenty-first suite now repeats these tests on every run against the
system's own request handlers. It passes 15 checks, and each of four deliberate faults made it fail.
Two limits remain. First, the rule covers receipts with an invoice number. Two identical receipts
without one, or two acknowledgement receipts, arriving at the same instant would both be saved,
which the payment form's confirmation step makes unlikely without ruling out. Second, two people
changing the same record in different ways at once was not tried.

### 4.3.7 User Acceptance Testing with the Landlady and Tenants



The landlady and three tenants used the live system for their own tasks, each on their own device
and account, after giving written consent (Section 3.4), by the procedure in Section 3.3. Where an
observer's sheet and the system's activity record disagreed, the activity record was used. Table 11C
gives each task's result. The landlady accepted the system and signed the acceptance form (Appendix O).

**Table 11C.** Tenant task results

| Task | Tenants attempting | Completed without help | Completed with help | Not completed | Median time (s) | Mean wrong turns | Completion without help |
| :--- | --: | --: | --: | --: | --: | --: | --: |
| First sign-in and choosing a password (T-01, T-02) | 3 | 4 | 2 | 0 | 120 | 0.5 | 67% |
| Finding their unit, rent and balance (T-03, T-04) | 2 | 3 | 1 | 0 | 90 | 0.5 | 75% |
| Finding their payments (T-05, T-06) | 2 | 4 | 0 | 0 | 60 | 0.0 | 100% |
| Sending a repair request with a photo (T-07 to T-09) | 3 | 7 | 0 | 0 | 90 | 0.0 | 100% |
| Following up a request (T-10, T-11) | 2 | 3 | 0 | 0 | 120 | 0.0 | 100% |
| Checking their details and notifications (T-12, T-13) | 3 | 5 | 0 | 0 | 60 | 0.2 | 100% |
| Opening the GCash payment (T-14) | 2 | 2 | 0 | 0 | 120 | 0.0 | 100% |
| Staying out of the administrator's pages; signing out (T-15, T-16) | 2 | 3 | 0 | 0 | 60 | 0.0 | 100% |
| **All tasks** | 3 | 31 | 3 | 0 | 60 | 0.2 | 91% |

Every task the tenants attempted was completed, 31 of 34 attempts without help (91 percent). Help
was needed only at the start. Two of the three tenants were helped through their first sign-in, and
one to find their unit and rent. Everything else, from finding payments to sending a repair request
and opening the GCash payment, was done alone in one to two minutes. The repair requests they sent
reached the landlady at once, and she acted on them the same evening. Mia et al. (2024) found that a
lack of digital skills was not necessarily a barrier for small Philippine enterprises, which relied
on tools they already knew. The tenants' results are consistent with this at the scale of one
boarding house: the help they needed was confined to the first two things a new user does.

The tests that needed several tenants saving at once were not performed, because only two attended
together. In the session in which the landlady and two tenants used the system at the same time, every
screen loaded, each tenant saw only their own unit, the landlady's full year of Monthly Income opened in
about three seconds, and no session affected another (Appendix M, Table M-22). On two phones the
offline behavior matched Appendix M, Table M-24, except that the Android phone showed the "cannot
tell whether it was saved" message after 60 to 80 seconds instead of 45. Once corrected, it was on
time when re-tested on that phone (Table 23A).

**Second round.** On the redesigned system of the third iteration, ten tenants and four prospective tenants did the tasks set for them, the tenants the same tasks as
in Table 11C (Appendix M, Table M-30). Every task was completed. The tenants did 151 of their 160 attempts without help (94 percent), and
the prospective tenants 31 of 32 (97 percent). As in the first round, help was needed mostly at the
first sign-in, where five of twenty attempts needed help, most often after a character on the
starting-password slip was misread, and in finding the browser's address bar when asked to type in
an administrator's page. Time on task was not recorded reliably in this round, so no times are reported
for it.

Table 11E brings the testing together by the test levels of ISO/IEC/IEEE 29119 (Section 3.2.4).

**Table 11E.** Summary of test execution by level

| Level | Activity (source) | Executed | Passed | Failed | Not performed or not applicable | Pass rate |
| :--- | :--- | --: | --: | --: | --: | --: |
| Unit and integration | Automated check suites (Table 8) | 20 | 20 | 0 | 0 | 100% |
| System | Functional walkthrough by the landlady (Appendix M, Table M-1) | 25 | 24 | 1 | 5 | 96% |
| Acceptance | Tenant tasks (Table 11C) | 34 | 34 | 0 | 0 | 100% (91% without help) |
| Acceptance | Simultaneous use by the landlady and tenants (Appendix M, Table M-22) | 4 | 4 | 0 | 3 | 100% |
| **All levels** | | **83** | **82** | **1** | **8** | **98.8%** |

Every level passed at least 96 percent of the tests executed, against the course standard of 90
percent. The one failure, at the system level, was not critical, and no critical defect was found in
any activity. Table 23A, in Section 4.4.6, lists the defects by activity, severity and disposition.

Table 11E counts the activities that correspond to the three test levels. The other cases of
Appendix L, on the public site, offline use and installation, security, browsers and timings, are
reported as measures in Sections 4.3.5, 4.3.6 and 4.4.4. One of them failed, the late message on the
Android phone, and it was on time when re-tested.

---

## 4.4 Evaluation of the System Based on ISO/IEC 25010

*Answers Objective 4.*

The evaluation followed the five steps of ISO/IEC 25040 (Table 12B), on the quality model of ISO/IEC
25010:2011. That edition was used because the approved proposal (Section 3.3) named its eight
characteristics as the evaluation criteria, and the instrument was built on them. Each
characteristic was judged on **measured quality**, the results of Section 4.3 expressed as measures
of its sub-characteristics in the manner of ISO/IEC 25023, and on **rated quality**, a survey in
which each item belongs to one sub-characteristic (Chapter 3, Table 4B). Each respondent group rated
only what it can judge. Tenants and prospective tenants did not rate Security, and only the
technical evaluators, the group with the background to judge it, rated Maintainability.

**Table 12B.** The evaluation process, following ISO/IEC 25040

| Step | What it required | How it was carried out |
| :--- | :--- | :--- |
| 1. Establish the evaluation requirements | The purpose, the product, the quality model and who judges it | Objective 4; the live system at its public address, and for four of the first round's technical evaluators a demonstration copy of it with sample data; ISO/IEC 25010:2011, eight characteristics; the landlady, tenants, prospective tenants and technical evaluators (Section 3.3) |
| 2. Specify the evaluation | The measures for each sub-characteristic, and the criteria for judging them | Measures from the tests of Section 4.3 (Appendix M, Table M-23); survey items assigned to sub-characteristics (Chapter 3, Table 4B); criteria: Chapter 3's Table 4A for every mean, and for tests the course standard of at least 90 percent passed with no critical defect open |
| 3. Design the evaluation | The activities, their order and schedule | The measurements, then the walkthrough and acceptance test, the technical evaluators' reviews, and the survey after each group's use of the system; a second round, of users with their tasks and of technical evaluators, with the same survey, after the redesign |
| 4. Execute the evaluation | Take the measures and apply the criteria | Section 4.3 (measured) and the survey (rated; Appendix M, Tables M-2 to M-17 for the redesigned system, and Tables M-28 and M-29 for the first round) |
| 5. Conclude the evaluation | Review the results, report them, and act on them | Tables 22 and 22A, and the changes made in response (Table 23) |

ISO/IEC 25010 was revised in 2023, renaming Usability as *Interaction Capability* and Portability as
*Flexibility* and adding *Safety*. The survey was built and answered on the 2011 characteristics, so
its results are reported on them. Appendix M, Table M-21, shows where each falls in the revised
model.

### 4.4.1 Respondents

Table 12 shows the respondents who rated the redesigned system of the third iteration, whose ratings
are reported in this section, and Table 12A how many forms were given out and returned.

**Table 12.** Distribution of respondents

| Group | Number | Percent | Basis for inclusion |
| :--- | ---: | ---: | :--- |
| Landlady | 1 | 5.88% | The system's only administrator |
| Tenants | 10 | 58.82% | Users of the tenant portal on their own accounts |
| Technical evaluators | 3 | 17.65% | Able to judge the technical characteristics |
| Prospective tenants | 3 | 17.65% | Users of the public website |
| **Total** | **17** | 100% | |

**Table 12A.** Instrument administration and response rate

| Group | Distributed | Retrieved | Valid | Response rate |
| :--- | ---: | ---: | ---: | ---: |
| Landlady | Not recorded | 1 | 1 | — |
| Tenants | Not recorded | 10 | 10 | — |
| Technical evaluators | 3 | 3 | 3 | 100% |
| Prospective tenants | Not recorded | 5 | 3 | — |
| **Total** | | **19** | **17** | |

The number of forms given to the users was not recorded, so their response rate cannot be given.
Two of the five forms returned by prospective tenants were answered in another group's section, the
landlady's and the tenants', and are left out by the rule of Section 3.3 (Appendix M, Table M-28).
Every other form returned was complete and valid. One further answer, which the researchers made
while testing the form, is not a respondent's and is not counted.

The landlady, ten tenants and three prospective tenants answered after using the redesigned system
of the third iteration, and three technical evaluators after reviewing the live system, each
after giving consent as described in Section 3.4. No member of the research team was among them.
The landlady is one respondent, so her group's mean is one person's rating, and three technical
evaluators are a small group. A member of the research team was with those three throughout
(Section 3.4), which may have favored higher ratings. The results describe how these respondents
rated the system, not a sample from which a wider population can be inferred. The first round, on
the system of the second iteration, had ten respondents: the landlady, three tenants, a prospective
tenant and five technical evaluators (Appendix M, Tables M-28 and M-29).

### 4.4.2 Interpretation of Scores

Each item was rated on the five-point scale in Table 4, and means are read using Chapter 3's Table
4A. The composite of each characteristic is the mean of its group means, so that the one landlady is
not outweighed by ten tenants on functions only she uses. The users' composites, from the landlady,
the tenants and the prospective tenants, are reported beside the technical evaluators', whose
questionnaire asks about the system from a developer's side. Each overall mean is the mean of the
characteristics its respondents rated: seven for the users, since only the technical evaluators rated
Maintainability, and eight for the technical evaluators. Averaging every user's response together
instead gives 4.80 rather than 4.84, with the same interpretation, Very High Quality, and the same
highest and lowest characteristics. Table 13A works one weighted mean in full, WM = Σ(f × w) / N.

**Table 13A.** Worked computation of a weighted mean

| Rating (w) | Meaning | Frequency (f) | f × w |
| ---: | :--- | ---: | ---: |
| 5 | Strongly Agree | 8 | 40 |
| 4 | Agree | 2 | 8 |
| 3 | Neutral | 0 | 0 |
| 2 | Disagree | 0 | 0 |
| 1 | Strongly Disagree | 0 | 0 |
| **Total** | | **N = 10** | **Σ(f × w) = 48** |

Indicator: "I can see my own unit details, my bill, and what I still owe." (Functional Suitability,
rated by tenants). WM = 48 / 10 = **4.80**, which Table 4A reads as **Very High Quality**.

### 4.4.3 Results by Characteristic

Table 22 summarizes the result for each characteristic. The rating of every item by every group is
in Appendix M (Tables M-2 to M-17, ratings and measured evidence for each characteristic).

**Table 22.** Summary of evaluation results

| Characteristic | Users' mean | Interpretation | Technical evaluators' mean | Interpretation |
| :--- | ---: | :--- | ---: | :--- |
| Functional Suitability | 4.80 | Very High Quality | 4.93 | Very High Quality |
| Performance Efficiency | 4.86 | Very High Quality | 4.89 | Very High Quality |
| Compatibility | 4.79 | Very High Quality | 5.00 | Very High Quality |
| Usability | 4.80 | Very High Quality | 4.87 | Very High Quality |
| Reliability | 4.78 | Very High Quality | 4.83 | Very High Quality |
| Security | 5.00 | Very High Quality | 4.93 | Very High Quality |
| Maintainability | not rated | | 4.73 | Very High Quality |
| Portability | 4.83 | Very High Quality | 5.00 | Very High Quality |
| **Overall** | **4.84** | **Very High Quality** | **4.90** | **Very High Quality** |

Users: the landlady, ten tenants and three prospective tenants (n = 14). Security is the landlady's
rating, since tenants and prospective tenants did not rate it. Technical evaluators: n = 3.

The users rated the system **Very High Quality overall (4.84)**, and the technical evaluators **Very
High Quality overall (4.90)**. Every composite of both is Very High Quality. This is the range Canlas
et al. (2026) report for a Philippine dormitory system rated by the same kinds of respondents,
tenants, administrators and IT professionals. In the first round, on the system before the redesign,
the users had given 4.75 and the five technical evaluators 4.34, with Usability and Reliability at
4.20, the top of High Quality (Appendix M, Table M-29). Two of the users' composites were lower than
in that round, Functional Suitability (4.94 before) and Portability (4.96 before), from a group nearly
three times as large. The differences between the characteristics are small: eleven of the fourteen
users gave every item the same rating, nine of them 5 and two of them 4. Each rating is therefore
also read beside the measured evidence for its characteristic (Section 4.4.5).

**Performance Efficiency** was the users' highest of the characteristics all three user groups rated
(4.86, technical evaluators 4.89). It matches the measurements: no failed request, and after the
redesign every screen timed again was ready sooner than before except sign-in, though screens still
took two to three seconds on a phone (Section 4.3.5). **Portability** followed (4.83 and 5.00), as one
code base installed on an Android phone and an iPhone without an app store. **Compatibility** (4.79 and 5.00) agrees with the browser matrix, on which every combination tried worked. **Security** (5.00 and 4.93) is discussed in Section 4.4.4.

**Usability** (4.80 and 4.87) was higher for both groups after the redesign. The landlady gave every item 5, the
tenants 4.74 and the prospective tenants 4.67.
Before the redesign the users had given it 4.49, and the landlady had given 3 to telling what each
screen is for and to learning the system without help (Appendix M, Table M-29). The first
round's technical evaluators gave it 4.20. The first of them gave 3 to all five items before the
fourteen changes made for that group, eleven of them about usability, and the four who reviewed
afterwards gave 4.80, 4.60, 3.60 and 5.00. The three who reviewed the redesigned system gave 4.80,
4.80 and 5.00. Here the rating and the measurement agree.
At least nine tasks in ten were done without help in each round, and 76 accessibility scans of 19 screens
found no violation once one defect on three screens was corrected.

**Functional Suitability** (4.80 and 4.93): every feature the objective names is present, and 96 to
100 percent of the executed checks of correctness gave the right result. The landlady gave every item
5. The users' lowest items, at 4.67, were the prospective tenants' three, and the technical evaluators'
lowest was payment recording, also at 4.67.

**Reliability** (4.78 and 4.83) is the users' lowest. The tenants' lowest item was whether the
information shown is correct and up to date (4.50), to which one tenant gave 2. The probable cause is
that not every receipt in the landlady's receipt book has been entered yet, so a month a tenant has
paid can still read "Not recorded" on that tenant's screen (Section 4.2.4 and Table 25). The technical
evaluators gave 4.67 to keeping recorded data and to telling "no data" from "could not be loaded",
and 5.00 to the other two. In the first round their lowest item, 3.80 for handling a failed request
without presenting incorrect data, named the one test that failed, the ₱0 of step 23b, since
resolved. The testing agrees: no critical defect
was found, and the two offline defects found on real devices passed on re-test.

**Maintainability** (4.73), rated by the technical evaluators only, is Very High Quality and their
lowest. Its three respondents gave 4.40, 5.00 and 4.80, and its lowest items, at 4.33, were
changing configurable values without changing code and automated checks that would catch a
regression. In the first round five evaluators had given it 4.32, each after reviewing the running
system without inspecting its source code. Here the measurement, read from the code itself, carries
more weight than the rating, and it points the same way. The system can be checked as a whole on every
change, but three database calls in four are written inside the request handlers, so the rules for
one record are spread across the handlers that touch it. Both are taken up in Chapter 5,
recommendation 6.

### 4.4.4 Security

The landlady gave every Security item 5. The three technical evaluators, whose mean was 4.93, gave 5
to every item but the audit trail, which they gave 4.67. They gave 5 to authentication and session
handling although the two low-risk session weaknesses the code review accepted remain, so on that
item the rating is higher than the measurement. In the first round the five technical evaluators'
mean was 4.36. They gave 4.20 to authentication and session handling, which agrees with those
weaknesses, and 4.00 to the handling of credentials, for which the measured evidence gives no cause
and the forms gave no reason.

Three passive external scans graded the site **A+**: Qualys SSL Labs, Mozilla HTTP Observatory (all
12 tests passed once the Content Security Policy was enforced) and securityheaders.com. Twelve checks by hand passed, among them an account locking after five wrong
passwords, no personal data behind the Back button after signing out, and another tenant's repair
request answering "not found". A review of all 71 request handlers found no
high-severity problem, and Supabase's security advisor raised no warning. Two
weaknesses remain by design. The sign-in token is kept in the browser's storage, where an injected
script could read it. The enforced Content Security Policy and the absence of any raw HTML on the
screens stand against that. Sign-in also takes a password only, with no second factor even for the
administrator. Both are left to Chapter 5, recommendation 3.

### 4.4.5 Measured and Rated Evidence Together

Table 22A sets the two kinds of evidence side by side. Of the thirty-one sub-characteristics of
ISO/IEC 25010:2011, twenty-seven have a measured result and twenty-five are rated by at least one
survey item. Two, user interface aesthetics and reusability, have neither, and no conclusion is
drawn about them.

**Table 22A.** Measured and rated evidence by characteristic

| Characteristic | Sub-characteristics | Measured | Rated | Measured result (Appendix M) | Users' mean (Table 22) | Technical evaluators' mean (Table 22) |
| :--- | ---: | ---: | ---: | :--- | ---: | ---: |
| Functional Suitability | 3 | 3 | 3 | All six features present; 96 to 100 percent of correctness checks passed | 4.80 | 4.93 |
| Performance Efficiency | 3 | 3 | 3 | No request failed under load; every screen usable within 3.05 s on a phone | 4.86 | 4.89 |
| Compatibility | 2 | 1 | 2 | 5 of 5 device and browser combinations; gateway and spreadsheet exchange correct | 4.79 | 5.00 |
| Usability | 6 | 5 | 4 | 91 and 94 percent of the tenants' tasks without help in the two rounds; 0 accessibility violations in 76 scans | 4.80 | 4.87 |
| Reliability | 4 | 3 | 4 | No critical defect; the two offline defects found on real devices, a ₱0 shown for a figure that could not load and a late message, both passed on re-test | 4.78 | 4.83 |
| Security | 5 | 5 | 3 | Every protection tried held; A+ from all three outside scanners | 5.00 | 4.93 |
| Maintainability | 5 | 4 | 4 | 20 of 20 suites passed without writing to the records; every change a numbered migration; but 154 of 204 database calls inside the request handlers | not rated | 4.73 |
| Portability | 3 | 3 | 2 | No screen wider than its window at four widths; installed on two phones without an app store | 4.83 | 5.00 |
| **All** | **31** | **27** | **25** | | **4.84** | **4.90** |

The measured results are those of the second iteration, except the tenants' tasks of the second
round. The 77 of the 114 test cases that need no person were run again on the redesigned system and
none failed (Section 4.2.1).

For six of the eight characteristics the two kinds of evidence agree. For Security and
Maintainability the measurements are less favorable than the ratings. Two session weaknesses remain
although the technical evaluators gave session handling 5 (Section 4.4.4), and three database calls
in four sit inside the request handlers although they gave the organization of the code 5 (Section
4.4.3; Appendix M, Tables M-14 and M-15). Taken together, the ratings and the measurements indicate
that the system is acceptable for use at the boarding house. Both groups rated every characteristic
Very High Quality, no critical defect is open, and the weaknesses the measurements show are carried
into the recommendations of Chapter 5.

Quality in use, which ISO/IEC 25010:2011 defines as the quality experienced by users in their own
context, was measured by the acceptance test of Section 4.3.7 in the manner of ISO/IEC 25022
(Appendix M, Table M-20). For effectiveness, all 34 attempted tasks were completed, 31 of them
without help. For efficiency, the median was 60 seconds a task with 0.2 wrong turns. For context
coverage, the system was used on the landlady's laptop, an Android phone and an iPhone. In the second
round every task was again completed (Appendix M, Table M-30), and efficiency was not measured
(Section 4.3.7).

### 4.4.6 Optimization in Response to the Evaluation

Objective 4 asks for the system to be evaluated **and optimized**. Table 23 groups the 51 changes
made in response to feedback and testing by where each finding came from. Every change, with its
finding and the characteristic it serves, is in Appendix M, Table M-18. Most were made the day the
finding arrived.

**Table 23.** Optimizations made in response to evaluation, by source

| Source | Changes | Characteristics served | Examples of what was found |
| :--- | --: | :--- | :--- |
| The landlady's review on a phone | 4 | Usability, Portability | Edit buttons that touch screens never showed; a tenant register wider than the phone |
| Screen-versus-database audit | 7 | Functional Suitability, Reliability, Usability, Security | A payment history showing no payments; a placeholder move-in date for every tenant |
| Development reviews (performance, requirements, client, mobile, final review) | 11 | Usability, Functional Suitability, Reliability, Performance Efficiency, Portability | Repairs for an empty unit; page names that differed between menu, tab and heading |
| Pre-testing audit and Lighthouse | 5 | Usability, Security, Performance Efficiency, Reliability | One shared starting password for every tenant; no way back for a forgotten password |
| Testing day (landlady's use, walkthrough, Android phone) | 3 | Reliability, Usability | Changes not reaching the other person until a refresh; ₱0 shown with no connection |
| Evaluation account and security reviews | 3 | Security, Functional Suitability, Reliability | A request from another website answered with a server error; breached passwords accepted |
| Technical evaluators' review | 14 | Usability, Functional Suitability, Security, Reliability | Filters in a pop-up with an Apply button; no way for a tenant to withdraw a request |
| The survey | 4 | Usability, Reliability, Functional Suitability | Usability items rated 3 before the evaluators' changes; a tenant asking to see the deposit |
| **All** | **51** | | |

The four technical evaluators who reviewed the demonstration copy wrote their
comments on the questionnaire after the period Table 23 counts. One asked for three things: figures
kept rather than loaded again on Monthly Income and the dashboards, which the third iteration did (Appendix
M, Table M-31), finished repair requests listed by their dates so they can be looked back on, and a
record archived rather than deleted. The last two were not done in this study (Chapter 5, recommendation 4). The three technical
evaluators of the second round named nothing that needed improving. Their comments praised how
quickly the screens change, the billing arithmetic, the confirmation asked before a deletion, and
how steady the pages hold on a phone.

Table 23A counts the defects found by each activity in Sections 4.3 and 4.4, by their highest
severity and what became of them. **Critical** means a wrong amount in the records or lost data.
**High** means a wrong amount shown, a core task blocked, or an exploitable weakness. **Medium**
means a misleading display or a weakness with a workaround. **Low** covers usability, appearance or
hardening.

**Table 23A.** Defects found, by activity, severity and disposition

| Activity | Found | Highest severity | Resolved | Open or accepted |
| :--- | --: | :--- | --: | :--- |
| Screen-versus-database audit (Table 9) | 6 | High: a tenant's payments not shown; a voided receipt shown as paid | 6 | None |
| Functional walkthrough (Appendix M, Table M-1) | 1 | Medium: ₱0 instead of "—" with the connection cut | 1 | None: passed when re-tested on the landlady's laptop |
| Testing day on phones | 1 | Medium: the "cannot tell whether it was saved" message late on Android | 1 | None: on time when re-tested on the same phone |
| Check of the evaluation account | 1 | High: online payment refused for an amount owed | 1 | None |
| Security review and outside probe | 12 | High, operational: the hosting provider's visitor challenge could block payment notifications | 9 | 3 accepted as low risk: sign-in attempt limits counted per server instance, signing out not revoking a token, a wide connection policy |
| Technical evaluators | 14 | Medium: phone, email and photo validation | 14 | None |
| **All activities** | **35** | | **32** | **3 accepted** |

No defect found was critical. The two defects of Section 4.3.1 that lost a record are not among
these: they were found and corrected in the first iteration, before pilot testing. The security audit
records the reason each of the three accepted items was accepted.

One further defect, of high severity, was found after these activities, in an audit of the live
records, and corrected the same day: two tenants were shown as owing a month they
had already paid. It is outside the counts above, which are the testing activities' own. Appendix
M, Table M-27, describes it, its cause and its correction.

---

## 4.5 Deployment Plan and Strategies

The system is hosted on Vercel at a public web address, with the database on Supabase. The optional
GCash payment through Adyen works end to end in Adyen's test environment, which takes no real money.
It is not live, because going live needs the owner's merchant onboarding documents, and this study did
not do that onboarding. Every approved change is deployed
automatically from the project's main code branch. The researchers give the system to the boarding
house free, with no subscription to pay. Under the memorandum of agreement signed with the owner, they
provide the system, its user manual and training and maintain and support it for an agreed period
after turnover, and the boarding house's records remain its own. Table 24 lists what is needed to use the system, and Table 25 the deployment
plan.

**Table 24.** Software and hardware requirements for deployment

| Side | Requirement | Used in testing |
| :--- | :--- | :--- |
| Landlady | A current web browser on a computer, and an internet connection | The landlady's laptop with Chrome; the researchers' laptop, a Dell XPS 15 on Windows 11 with Chrome, Edge and Firefox (Table 11) |
| Tenants and visitors | A current web browser (Chrome, Edge, Firefox or Safari) on a phone or computer, and an internet connection | Infinix GT20 with Android and Chrome; iPhone 15 and iPhone 13 with Safari; the three tenants' own phones, models not recorded |
| Hosting | Vercel (application), Supabase (PostgreSQL database), Adyen test account with GCash (optional online payment; not live, takes no real money) | Vercel; PostgreSQL 17.6 on Supabase; Adyen Web Drop-in 6.44 and API Library 32.0 (Table 7) |
| Administration | A computer that can run Node.js, used only for backups and verification runs | Node.js 22 on the researchers' Windows 11 computer |

**Table 25.** Deployment plan and strategies

| Stage | Activity | Status |
| :--- | :--- | :--- |
| 1. Environment preparation | Hosting, database and gateway set up; security settings applied | Done |
| 2. Record transfer | The landlady's workbook transferred: 937 income rows and 1,327 expense allocations | Done |
| 3. Pilot use | The system used alongside the landlady's existing records; differences investigated | In progress |
| 4. Training and hand-over | The landlady and tenants shown how to use the system; user manual (Appendix K) handed over; accounts issued | Done: every tenant account issued with its own starting password; the landlady guided through the system, and the landlady and tenants using it on their own accounts (Section 4.3.7) |
| 5. Full transition | The system becomes the landlady's main record once both records agree | Not yet: the system runs beside the landlady's own records |

The plan manages three risks:

- **The records are the boarding house's real financial records.** A backup is taken before any change to
  the data, and every change is a numbered migration that can be reviewed before it runs.
- **Gateway and database credentials** are kept outside the code, passed between the researchers
  separately, and never written in any document. A check for committed credentials runs before
  every commit.
- **The five historical receipt anomalies** are kept exactly as the landlady wrote them and reported
  on every verification run, so they are never mistaken for errors made by the system.

