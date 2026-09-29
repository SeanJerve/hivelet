# 4 RESULTS AND DISCUSSION

> **TEAM NOTE (delete every TEAM NOTE block before pasting into the manuscript).**
> Written 2026-09-26 to replace the template text in the manuscript's Chapter 4, which is still
> Lorem Ipsum. Every number here was read from the live system or from a check run on
> 2026-09-26, and the source is named beside it. Anything marked **[DATA PENDING]** needs data only
> the team can collect (see `TEAM_TASKS_WE_DO_OURSELVES.md`). Do not fill a pending cell from
> expectation. Table and figure numbers continue from Chapter 3 (the last table there is Table 4,
> the Likert scale, and the last figure is Figure 3), because the manuscript numbers them across
> the whole document.
>
> **Updated 2026-09-28** against the system as it stands after the 26 September fixes and
> clean-up: Table 8 re-run, Table 9 and the defect list brought up to date (all six defects now
> fixed), the ledger pages' new names, the maintenance features added on 26 September, the removal
> of test data, and the decision about historical receipts.
>
> **Updated 2026-09-29**, the evening before the testing day: Table 8 re-run; §4.3.6 added with
> measured offline, installation, weak-connection and simultaneous-use results (Tables 11A, 11B);
> §4.3.7 added for the owner and tenant acceptance test (Tables 11C, 11D, pending); two rows added
> to Table 23; the tenant account reset in §4.2.6 and Table 25.

This chapter presents the results of the study and discusses what they mean. It is organized by
the four specific objectives in Section 1.2: the analysis of existing practices (4.1), the
development of the system (4.2), pilot testing (4.3), and evaluation and optimization based on
ISO/IEC 25010 (4.4). It closes with the deployment plan (4.5).

---

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

*Answers Objective 1.*

The Fe Galang Da Silva Boarding House has 33 rentable units in five clusters: the Boarding House
(22 units), the Back Apartment (5), the Front Apartment (3), the Penthouse (1) and Linda (2). The
units sit on three residential floors and a rooftop penthouse level, with 11, 11, 10 and 1 units
per floor. At the time of writing, 32 of the 33 units are occupied. These figures were confirmed by
the owner on 13 September 2026 and are checked against the live records on every verification run.

### 4.1.1 Existing Practices and Identified Problems

Before Hivelet, the owner ran the business from a spreadsheet workbook with two sheets, a Monthly
Income Report and a Monthly Expenses Report, kept on removable storage, together with a physical
official receipt book. Rent was collected in cash on site. Tenant concerns and maintenance
requests arrived by messaging application or in person. Table 5 compares each practice with the
problem it caused.

**Table 5.** Existing Practices and Identified Problems

| Area | Existing practice | Problem identified |
| :--- | :--- | :--- |
| Tenant management | Tenant details kept in the income sheet and in the owner's memory | No single record of who lives in which unit, since when, or how many occupants |
| Financial tracking | Income and expense sheets typed by hand; official receipts written in a paper book | Totals depend on manual arithmetic; nothing checks a receipt number against the book; one file on removable storage is the only copy |
| Communication | Requests sent by messaging application or said in person | Requests are not recorded, so there is no way to follow a request to completion |
| Booking | [CONFIRM WITH THE OWNER: how enquiries arrived before the system, for example walk-in, referral or phone] | No record of enquiries or which unit an enquiry was about |

The strongest evidence for these problems came from the owner's own records. When her workbook was
transferred into the system (937 income rows and 1,327 expense allocations), the transfer exposed
problems that had gone unnoticed in the spreadsheet:

- **402 of the 937 income rows (43%)** had no anniversary date and no deposit recorded.
- **Five official receipt numbers** were each used for two different payments. In one case, a
  single receipt number was used for two different tenants on the same day. Each case is recorded
  in the system and reported on every verification run. None has been changed: the team decided
  on 26 September 2026 that historical records stay exactly as the owner wrote them, as the record
  of what happened. The standard the system is held to is that every record it produces itself is
  correct.

These are not errors by the owner. They are what happens when records are kept by hand with
nothing to check them against, and they are the kind of problem the system was built to catch.
The finding that matters most is that the problems did not sit in one area. **Each area kept its
own informal record, and nothing connected one record to another.** This matches the fragmentation
described in Chapter 2 (Ullah et al., 2021; Burke, 2026; Magno et al., 2024).

### 4.1.2 System Requirements

The analysis produced **44 functional requirements** and **49 business rules**. Every requirement
is traced to the part of the system that implements it in a traceability matrix, and every rule
is recorded with its status and evidence in a business rule register. Both documents are checked
automatically for internal consistency on every verification run (Section 4.3.1).

The matrix grades each requirement against the code, not against the plan. At its last full
grading (16 September 2026), 25 of the 44 were implemented as worded, 15 in part, 1 in the
interface only, and 3 not as worded. None of the three is absent from what the owner sees. Cash
flow (FR-019) and profitability (FR-020) appear on her overview as operating cash flow, net
operating income and collections by month, but they are computed in the browser from the two
ledgers rather than produced by a server report, which is what the requirements specify. The
number of occupants (FR-033) carries forward from the tenancy, which the owner edits, rather than
from the previous month's row as the requirement words it. Table 6 shows how each identified gap
became a requirement and a module.

**Table 6.** Identified Gaps, System Requirements and Implementing Modules

| Identified gap | System requirement | Module (Section) |
| :--- | :--- | :--- |
| No single tenant and unit record | Keep one record per unit and per tenant, with occupancy and move-in dates | Tenant and Room Management (4.2.2) |
| Enquiries not recorded | Let the public view units and send an enquiry about a specific unit | Booking and Reservation (4.2.3) |
| Manual arithmetic and unchecked receipts | Compute charges, record payments against real receipt numbers, reproduce the owner's reports | Financial Tracking (4.2.4) |
| Cash only, no digital option | Offer an optional online payment that the owner verifies before it counts | Financial Tracking (4.2.4) |
| Requests not followed to completion | Record each request and its status until the owner closes it | Maintenance Ticketing and Notification (4.2.5) |
| Anyone with the file sees everything | Give the owner and each tenant access to only what their role needs | Role-Based Access Control (4.2.6) |
| One file on one device | Make the system reachable from any phone or computer | Progressive Web Application (4.2.7) |

Where the owner's answer was needed to settle a requirement, it was asked rather than assumed. For
example, the owner confirmed that a bill is overdue from the day after its due date (she allows
about a week before following up a late payment, but that week does not change when rent is due),
that she sets room rates by hand (so the system keeps a history of every rate change instead of
applying any automatic increase), and that a tenant does not need an email address to be recorded.
On 20 September 2026 she gave the current rate of every unit, and every one agreed with her own
receipts. **The questions still waiting for her answer** are collected in one list for a single
meeting and are named in Chapter 5 as recommendations.

---

## 4.2 Development of the Hivelet System

*Answers Objective 2. Each feature named in the objective has its own subsection.*

### 4.2.1 System Architecture and Technology Stack

The system was built in three Agile iterations (Section 3.2). The first, from 24 July to 28 August
2026, built a working system and transferred the owner's records into it. The second, from 12 to
14 September 2026, checked that the system and its documents said the same thing, corrected 22
recorded errors, and added automated checks. The third, still in progress, closes the questions
that need the owner's answer and refines the system from client feedback and testing. Table 7
lists the technology used.

**Table 7.** Technology Stack of the Developed System

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Presentation | Vue 3.5 with TypeScript 5.7, built with Vite 5.4, styled with Tailwind CSS 4.0 | The screens used by the public, tenants and the owner |
| Application | Node.js with Express 4.19 in TypeScript | Business rules, calculations and access checks |
| Data | PostgreSQL 17.6, hosted on Supabase | Storage of all records, with row-level security |
| Payment gateway | Adyen (Web Drop-in 6.44, API Library 32.0) with GCash | The optional online payment |
| Client delivery | Progressive Web Application (vite-plugin-pwa) | Installation on a phone or computer without an app store |
| Hosting | Vercel | Serves the application at a public web address |

Every change to the database structure or to stored records is written as a numbered migration
file (more than fifty so far), so the history of the data can be reviewed and repeated.

### 4.2.2 Tenant and Room Management Module

Each unit carries its cluster, floor, current rate and status. Each tenancy carries the number of
occupants, the move-in date and emergency contacts. The owner's workbook did not record move-in
dates, so for the transferred tenancies the screen says the date is not recorded rather than
showing a guessed one. When the owner changes a room rate, a database
trigger records the old rate, the new rate, the date and who made the change. Because the trigger
runs inside the database, a rate cannot be changed through any path without being recorded.
*Figure 4. Room and Rate Directory.* [SCREENSHOT PENDING]

### 4.2.3 Booking and Reservation Management Module

The public site lists the units with their rates, read live from the database. A visitor sends an
enquiry about a specific unit without needing an account. The enquiry appears in the owner's inbox,
and when accepted it becomes a tenancy that stays linked to the enquiry it came from. A reserved
unit stays visible but accepts no new enquiries. The public site never shows a tenant's name; this
is checked on every verification run against all 33 published units. *Figure 5. Public Unit
Catalogue and Enquiry Form.* [SCREENSHOT PENDING]

### 4.2.4 Financial Tracking and Payment Recording Module

A bill carries rent and water as separate amounts. Water is the number of occupants multiplied by
a rate the owner can change in the settings, currently ₱200 per occupant. The two Linda units are
charged a fixed water amount instead and are kept out of the property's grand totals, as in the
owner's own workbook. A bill is overdue from the day after its due date, as the owner confirmed.

Cash payments are recorded by the owner with the official receipt number from her receipt book.
The system never makes up a receipt number. Online payments go through Adyen with GCash: a payment
made this way enters a **Pending Verification** state and changes nothing on the tenant's bill
until the owner verifies it. Before the owner records a payment, the system warns her if the same
tenant already has a payment for that month, including one still waiting for verification.

Income and expenses are shown on two pages named after the owner's two workbook sheets, **Monthly
Income** and **Monthly Expenses**, in the same layout as those sheets, and can be exported as Excel
files in that layout. Income is filed under the month the rent is for, not the
day it was paid, so a late payment still counts toward the right month. *Figure 6. The Monthly
Income Ledger.* [SCREENSHOT PENDING]

The system does not handle electricity. Every unit has its own meter and the tenant pays the
electric company directly, as the owner confirmed on 18 September 2026.

### 4.2.5 Maintenance Ticketing and Notification Module

A tenant submits a request with a title, description and priority, and follows its status through
to completion. The owner can also log a repair herself when she is told about it in person,
including a repair to an empty unit, which has no tenant to report it. Only the owner can close a
request, and when she marks a tenant's repair as done the tenant is notified. The system also sends
in-app notifications to the tenant when a payment is verified or declined, and to the owner when a
payment, enquiry or request comment arrives. Opening a notification opens the record it is about,
for example the payment waiting to be verified, rather than only the page it is on. *Figure 7.
Maintenance Requests Board.* [SCREENSHOT PENDING]

### 4.2.6 Role-Based Access Control

The system has the three kinds of user designed in Section 3.2.2: the public, tenants and the
administrator. It also keeps a record of each visitor who sends an enquiry (a *prospect*), with
the same rights as the public, so that their details carry over if they become a tenant. Every
role's rights come from one named permission matrix. Each of the 55 administrator and
tenant routes declares the permission it requires, and this is checked on every verification run.
Access is also enforced by the database itself: row-level security is enabled on all 22 operational
tables (checked on the live database on 26 September 2026). The two remaining tables are backups
made during data corrections, and no client role has any access to them.

Other security measures in the system:

- Passwords are stored as bcrypt hashes, never as plain text.
- An account locks after repeated failed sign-ins. The lock is checked before the password is
  compared, and it is kept per account so that an attacker cannot avoid it by changing address.
- A new account must change its password at first sign-in, and changing a password ends every
  other session of that account. Before the tenants first used the system, on 29 September 2026,
  every tenant account was given its own starting password, handed to the tenant in person, and
  set to require a new password at first sign-in; every earlier session was ended. Until then the
  tenant accounts had shared one password used by the development team. The owner can also reset a
  tenant's forgotten password from the tenant list: the tenant receives a new one-time password,
  must choose their own at next sign-in, and every earlier session ends (added 29 September 2026,
  Table 23).
- Every administrator action is written to an audit trail. The database refuses to let the
  application edit or delete its entries. The only change ever made to it was deliberate and
  reviewed: when test accounts were deleted, the name on their entries was removed and every entry
  kept.
- Messages from the payment gateway are accepted only with a valid HMAC signature.
- A check for committed passwords and keys runs before every commit.

### 4.2.7 Progressive Web Application Implementation

The client is a Progressive Web Application with a service worker and a web app manifest, so it
can be installed on a phone or computer and opens without the browser's address bar. The service
worker keeps the application's own files for faster loading, but it does not store tenant or
financial data on the device. This matches the delimitation in Section 1.4: viewing and recording
data needs an internet connection. Screens adapt to the device: tables on a computer become cards
on a phone. *Figure 8. The Tenant Portal on a Mobile Phone.* [SCREENSHOT PENDING]

---

## 4.3 Pilot Testing of the Developed System

*Answers Objective 3: functionality, responsiveness and operational performance.*

### 4.3.1 Automated Verification

Twenty automated check suites were written during development. They run against the live system
and **perform no writes**, which is what makes them safe to run against the owner's real records.
The full set was run again on 29 September 2026, the evening before the first test with real
users, and **all 20 passed**, with the same counts as the run of 28 September. Table 8 shows the
principal results.

**Table 8.** Results of Automated Verification (29 September 2026)

| Suite | What it checks | Result |
| :--- | :--- | :--- |
| Endpoint and access control | Every endpoint the client calls, the separation of roles, and the rejection of bad input | 78 of 78 passed |
| Ledger integrity | All 937 income rows against the business rules; room, tenant and occupancy agreement | Passed; 5 receipt anomalies reported for the owner |
| Report reconciliation | The exported Excel reports against the database, month by month | 490 of 490 passed |
| Payment gateway | Signature checking on gateway messages and how each kind of message is recorded | 73 of 73 passed |
| Record relations | That separate records agree with each other (payments with bills, tickets with units) | 30 of 30 passed |
| Billing arithmetic | Water, billing period and how a payment is split across bills | Passed |
| Data presentation | That no screen shows stored, sample or empty data as a live figure | 6 of 6 passed |
| Interface integrity | That every screen component exists, every input has a label, and every source file is used | Passed |
| Document consistency | That the requirements matrix and business rule register agree with themselves | Passed (44 requirements, 49 rules) |

Two results are worth discussing.

First, the checks found problems that no one had written a check for. The five receipt anomalies
in Section 4.1.1 came from the owner's historical records, not from the system. They are reported
on every run instead of being quietly corrected, because only the owner's receipt book can say
what each entry should read.

Second, several serious defects found during development gave no error on screen at all. In one,
a cash payment could be confirmed on screen while nothing was written to the ledger. In another, a
partial payment was recorded but the remaining debt was lost. Each was fixed, and each now has a
check that fails if it returns. This is the main argument for automated verification in a system
that holds real money: the most dangerous defects are the silent ones.

### 4.3.2 Use in the Live Environment

The system has run at a public address since September 2026 with the owner's real records. The
following real events are part of the pilot:

- **22 September 2026.** A checkout in the tenant portal, made during a live payment test, raised
  the first bill the system ever created for real use: ₱8,200.00 for unit 1a, made of the ₱8,000 rate and ₱200 water for one occupant. The amount
  was computed by the system and matches the rules exactly.
- **22 September 2026.** A cash receipt was recorded during testing and voided four minutes later.
  The ledger returned to exactly 937 rows and its previous total, which shows the void path works.
- **23 September 2026.** The client opened the system on a phone and found it hard to use. The
  team measured the problems instead of guessing: a table 518 pixels wide inside a 301-pixel
  screen, edit buttons that did not appear on touch screens, a payment form whose buttons were
  hidden below the screen, and toolbars that overlapped. All were fixed the same day (Section
  4.4.11).

At first, Adyen's test account refused every GCash payment. The team traced the fault using
Adyen's own API logs:
- the payment session was created (HTTP 201);
- GCash was offered as a payment method;
- but the payment request came back "Refused", with no redirect and no reason;
- and no transaction ever appeared in the account's payment list.

A bank decline or a fraud-risk rule acts on a transaction that exists. A refusal with no
transaction therefore pointed to how the account was set up, not to the system. Adyen support
(Case 08657379) confirmed this. The GCash acquirer account, which actually processes the payment,
was misconfigured, and Adyen set up a new one.

On 26 September 2026 a test payment passed end to end:
- Adyen authorised it;
- its signed notification reached the system;
- it appeared as Pending Verification in the administrator's verification queue;
- it was rejected there, and the tenant's bill stayed owed.

That retest found one defect in the system itself. A tenant returning from a successful GCash
payment was told the payment could not be confirmed. It was fixed and confirmed on a second test
payment the same day. The system's own handling of gateway messages is covered by the passing
checks in Table 8.

When the pilot tests were finished, every record they had created was removed the same day, 26
September 2026, by a single reviewed migration run after a backup: all 20 payment records, every
one of them a test (the GCash payments, which could not be real money because the gateway account
is still Adyen's test account; the voided test receipt and its cash entries; and the demo accounts'
payments), together with 16 notifications and the demo accounts' bills and tenancies. The bill raised on 22 September stayed, because
it is a correct bill for a real tenancy, and went back to owed. The owner's 937 income rows were not
touched. The audit trail was not edited either: it keeps the record of the testing and gained one
entry saying what was removed and why.

### 4.3.3 Screen-versus-Database Audit

The automated suites prove that each part of the system is correct on its own. They do not prove
that a screen shows a person what the database holds for that person. On 26 September 2026 a team
member noticed that a tenant's payment history read "Nothing recorded" although the tenant had
seven receipts that year. Every suite had passed, because the screen was correct code reading the
wrong list.

The team therefore audited every owner screen, and the tenant payment screen, directly; the
remaining tenant screens followed on 29 September 2026, read with a tenant session on a local copy
of the application connected to the live records. Each figure a screen displayed was compared with
a read-only query of the live database for the same records. The owner's screens were read with
the owner's own session on the live site; where a screen could only be tested locally, it was given
the live figures with every personal detail removed. Nothing was written to the database during the
audit. Table 9 shows the result.

**Table 9.** Results of the Screen-versus-Database Audit (26 and 29 September 2026)

| Screen | What was compared | Result |
| :--- | :--- | :--- |
| Owner overview | Collections for each month of 2026, the year's total, occupancy, rent per cluster, expected monthly income, operating and personal costs | Matched to the peso |
| Monthly Income | Totals for rent, water and garbage; collections by cluster | Matched after one defect was fixed |
| Monthly Expenses | Total spent, split by kind and by area | Matched; one layout defect fixed |
| Rooms and rates | Rent and number of occupants for each unit | Matched |
| Tenants | Number of tenants per cluster; move-in dates | Counts matched; one defect fixed |
| Activity (audit trail) | Each recent entry against the recorded action | One defect fixed |
| Repairs, inquiries | Number of open items | Matched |
| Tenant payments | A tenant's receipts for 2026 | Two defects fixed |
| Tenant overview, repairs and details (29 Sep 2026) | Unit, rate, occupants, monthly charge (rent plus ₱200 per occupant), the period the receipts reach, amount due, requests, contact details | Matched |

The audit found six defects that no automated check had caught, and all six were fixed on 26
September 2026:

1. **A tenant's payment history showed no payments.** The page read only payments made through the
   system, while every receipt the owner recorded lives in the ledger. It now reads both.
2. **Rental and personal expenses shared one column.** A repair to the Back Apartment and one of the
   owner's personal costs looked the same on a row, on a page that says personal costs are not
   deducted from rental income. They now have separate columns, as in the owner's workbook.
3. **Every tenant appeared to have moved in on 1 July 2026.** That date was a placeholder written
   when the records were transferred; 29 of the 32 tenants have receipts from before it. The screen
   now says the date is not recorded.
4. **An opened GCash checkout was listed as "Payment recorded".** Six such entries appeared on 25 and
   26 September, and none became a payment. They now read "GCash payment started".
5. **A voided receipt still appeared in the tenant's own receipt list.** The server now leaves
   voided receipts out of what a tenant is shown, as every other screen already did.
6. **The Boarding House's remitted amount was halved on the income screen.** The screen totalled
   it as half the rent plus water, while the database, the Excel export and business rule BR-038
   used the full rent plus water. Rather than choose between the two, the team read the formula in
   the owner's own workbook, which adds the full rent; half the rent appears only in her separate
   50% column. The screen was corrected to match.

The audit also found that the list of payments behind the owner's overview would have stopped
silently at 1,000 records, a limit of the database service, which at the property's pace would
have been reached in about two and a half years. It now reads the list in batches, as the income
list already did.

The tenant screens showed one thing that is not a defect of the system but matters to anyone using
it. On 29 September 2026 the latest receipt in the ledger was dated 8 August 2026, so the portal
told every one of the 32 tenants that they were behind by one or two periods. The screens were
right about the records; the records were behind the owner's receipt book. A system that tenants
can see makes the owner's entry of receipts part of what they experience, and the testing day was
prepared accordingly (the owner enters the receipts she holds first, or tenants are told).

The lesson is the same one Section 4.3.1 draws, from the other side: **passing checks show that
what was tested is correct, not that everything is.** Comparing each screen with the records it
claims to show is now part of how the team verifies the system.

### 4.3.4 Functional Walkthrough Testing [DATA PENDING]

A 26-step walkthrough exercises every function that writes data exactly once. It runs against the
one unoccupied unit so that no real tenancy, receipt or expense is touched.

**Table 10.** Results of the Functional Walkthrough [DATA PENDING]

| Step | Function tested | Expected result | Actual result | Pass or fail |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Public unit catalogue browsing | 33 units listed without resident names or sensitive details | [DATA PENDING] | [DATA PENDING] |
| 2 | Public unit detail inspection | Correct rate, floor, and cluster; resident names omitted (LB and LF verified) | [DATA PENDING] | [DATA PENDING] |
| 3 | Public booking enquiry submission | Confirmation message displayed; rate limiter guards abuse | [DATA PENDING] | [DATA PENDING] |
| 4 | Authentication negative test | Wrong current password rejected with inline message; session stays active | [DATA PENDING] | [DATA PENDING] |
| 5 | Administrator password rotation | Password updated successfully; active session maintained | [DATA PENDING] | [DATA PENDING] |
| 6 | Re-authentication with new credential | Successful sign-in using updated administrator password | [DATA PENDING] | [DATA PENDING] |
| 7 | Unit rate update and audit trigger | Rate updated; database trigger writes immutable price history row | [DATA PENDING] | [DATA PENDING] |
| 8 | Tenant onboarding to vacant unit (PH) | Tenancy created; unit status transitions to Occupied | [DATA PENDING] | [DATA PENDING] |
| 9 | Duplicate credential guard | Duplicate phone number registration rejected with validation message | [DATA PENDING] | [DATA PENDING] |
| 10 | Tenancy details modification | Occupant count updated and persisted in database | [DATA PENDING] | [DATA PENDING] |
| 11 | Tenant portal authentication | Tenant dashboard displays correct unit details, rate, and occupancy | [DATA PENDING] | [DATA PENDING] |
| 12 | Maintenance ticket creation with attachment | Ticket submitted with photo; size guard informs user if file is too large | [DATA PENDING] | [DATA PENDING] |
| 13 | Ticket communication thread | Follow-up message posted and displayed within ticket conversation | [DATA PENDING] | [DATA PENDING] |
| 14 | Tenant emergency contact update | Updated emergency contact saved and reflected in profile | [DATA PENDING] | [DATA PENDING] |
| 15 | Online payment checkout initialization | Adyen Web Drop-in mounts inside modal and displays GCash button | [DATA PENDING] | [DATA PENDING] |
| 15b | On-demand billing generation | Bill generated on demand matching unit rate plus ₱200/occupant water | [DATA PENDING] | [DATA PENDING] |
| 16 | Notification state management | Notification marked as read; unread badge counter decrements | [DATA PENDING] | [DATA PENDING] |
| 17 | Cross-tenant authorization perimeter | Accessing foreign ticket ID returns HTTP 404 (Not Found), not 403 | [DATA PENDING] | [DATA PENDING] |
| 18 | On-site cash collection recording | Collection recorded against receipt REHEARSAL-001; bill marked settled | [DATA PENDING] | [DATA PENDING] |
| 19 | Duplicate receipt prevention | Re-submitting identical receipt number is blocked with explicit alert | [DATA PENDING] | [DATA PENDING] |
| 19b | Receipt voiding and double-void guard | First void reverses ledger entry; second void attempt is rejected | [DATA PENDING] | [DATA PENDING] |
| 20 | Enquiry processing and resolution | Administrator reply sent; enquiry status marked Closed | [DATA PENDING] | [DATA PENDING] |
| 21 | Maintenance resolution and notification | Ticket advanced to Resolved; tenant receives resolution notification | [DATA PENDING] | [DATA PENDING] |
| 22 | Expense recording and allocation | ₱100 expense logged with property allocation; edits/deletion verified | [DATA PENDING] | [DATA PENDING] |
| 22b | Expense allocation split derivation | Expense split across areas; total derived automatically via trigger | [DATA PENDING] | [DATA PENDING] |
| 23 | Financial workbook export | income.xlsx and expenses.xlsx downloaded matching owner layout | [DATA PENDING] | [DATA PENDING] |
| 23b | Fail-safe presentation on API interruption | Backend stopped; money tiles display "—" instead of misleading ₱0.00 | [DATA PENDING] | [DATA PENDING] |
| 24 | Tenant vacating and tenancy termination | Tenancy ended; unit returns to Available; end_date recorded | [DATA PENDING] | [DATA PENDING] |
| 25 | Ledger baseline verification | Rehearsal records removed; ledger restored to exact 937 baseline rows | [DATA PENDING] | [DATA PENDING] |
| 26 | Unit rate restoration | PH rate restored to confirmed ₱30,000 rate card baseline | [DATA PENDING] | [DATA PENDING] |

[DATA PENDING: after the walkthrough, write one paragraph stating how many steps passed the first
time, what failed, and how each failure was fixed.]

### 4.3.5 Responsiveness and Operational Performance [DATA PENDING]

Performance was measured on the hardware listed in Tables 2 and 3.

**Table 11.** Page Load and Response Times [DATA PENDING]

| Screen | Workstation (Table 2) | Mobile phone (Table 3) |
| :--- | :--- | :--- |
| Public home page, first load | | |
| Sign-in to dashboard | | |
| Income ledger, one full year | | |
| Excel export of one year | | |
| Tenant portal, first load | | |

[DATA PENDING: state the device, browser, network and date of the measurement, and how each time
was taken. Report measured numbers only.]

### 4.3.6 Offline Use, Installation, Weak Connections and Simultaneous Users

> **TEAM NOTE.** Tables 11A to 11D are new (29 September 2026). Renumber every table after
> Table 11 when this chapter goes into the Word file. The measurements are in
> `PRE_TESTING_AUDIT_2026-09-29.md`, with the device and time of each.

Before the system was used by its tenants, the behaviour a real day of use would test was measured
on the live system on 29 September 2026: what happens without a connection, on a weak one, when the
application is installed, and when several people use it at once. The measurements were taken with
Google Chrome 154 driven by an automated browser (Playwright) on an Acer Nitro ANV15-52 laptop
(Intel Core i5-13420H, 16 GB) on a home broadband connection, using Chrome's phone emulation
(390 × 844 pixels). Every attempt to save data was blocked inside the browser, so the tests wrote
nothing to the owner's records.

**Table 11A.** Offline and Installation Behaviour (29 September 2026)

| Test | Result |
| :--- | :--- |
| Installation requirements (manifest, service worker, icons) | Met; the service worker keeps 67 application files on the device after the first visit |
| Opening ten addresses with no connection | The application opened on all ten in about 1.5 seconds instead of the browser's "no internet" page |
| Tenant and administrator pages with no connection, signed out | The application opened and asked for sign-in; no personal or financial data is stored on the device |
| Notice when the connection drops | Shown at once: "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." |
| Notice when the connection returns | "Back online" |
| Public unit list with no connection | Shown from the device's memory |
| Public unit list when the server stops answering | Shown from the device's memory after 3.1 seconds |
| Public page on a slow connection (400 kbps, 400 ms), first visit | Units on screen after 4.6 seconds |
| The same page, returning visitor | Units on screen after 0.3 seconds, because the installed application already holds its files |

**Table 11B.** Simultaneous Users, Read Operations (29 September 2026)

| Test | Users at once | Duration | Requests | Errors | Slowest 5% took longer than |
| :--- | --: | --: | --: | --: | --: |
| Public pages and public data, live site | 12 | 60 s | 1,085 | 0 | 0.52 s |
| The owner's ten main data requests, live database | 6 | 45 s | 285 | 0 | 0.80 s |

The results show that the application behaves as Section 1.4 and Section 4.2.7 say it should, and
no more. It opens without a connection and says plainly what it cannot do, but the owner's and
tenants' records need the connection, which is also why no personal data is left on a shared phone.
Under loads several times larger than the property's own (a few tenants and one owner), no request
failed and nineteen in twenty were answered in under a second.

The same tests found one weakness. A weak signal usually stalls instead of failing, and the
application waited for as long as the browser did, which can be minutes, with the button showing
"Sending…" and no advice. A time limit was added the same evening: a page now stops waiting after
25 seconds and says it could not reach the server, and a save stops after 45 seconds and says it
**cannot tell whether the save arrived, so the reader should check before sending it again**. Only
the save message makes no claim, because a save that timed out may still have been recorded. With
the server held open on purpose, the public page showed its notice at 27 seconds and the enquiry
form its message at 46 seconds with the typed text kept; without the change, the same page still
showed nothing after 41 seconds (Table 23).

An accessibility scan of the seven public pages (axe-core 4, WCAG 2 levels A and AA) at phone and
computer widths found no violations, and no page was wider than a 360-pixel phone screen. The same
two measurements were taken on the owner's eight screens, signed in on a local copy of the
application connected to the live records, at 360, 390, 768 and 1366 pixels: no screen was wider
than the window and none had a violation. These were the screens the owner had found hard to use on
her phone on 23 September (Section 4.3.2); the fixes of that day are here measured on the real
screens with real records for the first time.

### 4.3.7 User Acceptance Testing with the Owner and Tenants [DATA PENDING]

> **TEAM NOTE.** Filled from the testing day of 30 September 2026. The procedure is
> `TESTING_DAY_GUIDE.md`, the cases `TESTING_DAY_TEST_CASES.md`, the forms
> `TESTING_DAY_FORMS.md`. Send Claude the observation sheets, the defect log and the survey export.

The owner and [DATA PENDING: number] tenants used the live system for their own tasks on 30
September 2026, each on their own device and signed in to their own account, after giving written
consent. A facilitator read each task aloud without showing where to tap; an observer recorded
whether the task was completed without help, with help, or not at all, how long it took, and the
number of wrong turns. Following the quality-in-use model of ISO/IEC 25010, completion measures
effectiveness, time measures efficiency, and the survey in Section 4.4 measures satisfaction. The
owner's session followed the 26-step walkthrough (Table 10) and her real work of the day. The
tenants then used the system all at the same time, and two of them repeated the offline and
installation tests of Table 11A on their own phones.

**Table 11C.** Tenant Task Results [DATA PENDING]

| Task | Tenants attempting | Completed without help | Completed with help | Not completed | Median time (s) | Mean wrong turns | Completion without help |
| :--- | --: | --: | --: | --: | --: | --: | --: |
| First sign-in and choosing a password (T-01, T-02) | | | | | | | |
| Finding their unit, rent and balance (T-03, T-04) | | | | | | | |
| Finding their payments (T-05, T-06) | | | | | | | |
| Sending a repair request with a photo (T-07 to T-09) | | | | | | | |
| Following up a request (T-10, T-11) | | | | | | | |
| Checking their details and notifications (T-12, T-13) | | | | | | | |
| Opening the GCash payment (T-14) | | | | | | | |
| Staying out of the owner's pages; signing out (T-15, T-16) | | | | | | | |
| **All tasks** | | | | | | | |

**Table 11D.** Simultaneous Use by the Owner and Tenants [DATA PENDING]

| Test (at the same moment) | Result |
| :--- | :--- |
| Every tenant opens their overview (C-01) | |
| Each tenant sees only their own unit and records (C-02) | |
| Every tenant sends a message on a request (C-03, C-04) | |
| The owner changes two requests; only those tenants are notified (C-05) | |
| A double tap on Send saves one message (C-06) | |

[DATA PENDING: one paragraph on the task results: which tasks every tenant completed alone, which
needed help and why (from the observers' notes), and what the tenants said. Then one paragraph on
the simultaneous session and the offline tests on real phones, compared with Table 11A. Report
failures as they happened.]

---

## 4.4 Evaluation of the System Based on ISO/IEC 25010

*Answers Objective 4.*

> **TEAM NOTE.** Everything in this section waits on the survey. The items in each table are
> copied word for word from `docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`. If the
> wording in the Google Form changes, change it here too. Section 3.3 must also name the
> technical evaluators as a third group, or the Maintainability table has no respondents that
> Chapter 3 accounts for (see `FIXES_TO_CHAPTERS_1_TO_3.md`).

The system was evaluated by three groups using a survey based on the ISO/IEC 25010 software
quality model: the owner, the tenants, and technical evaluators (IT professionals, developers or IT
faculty). Each group rated only what it is in a position to judge. Tenants use only the tenant
portal, so they did not rate Security or Maintainability. Only technical evaluators rated
Maintainability, because judging it requires reading the source code and documentation.

### 4.4.1 Respondents

**Table 12.** Distribution of Respondents [DATA PENDING]

| Group | Number | Percent |
| :--- | ---: | ---: |
| Owner / administrator | | |
| Tenants | | |
| Technical evaluators | | |
| **Total** | | 100% |

### 4.4.2 Interpretation of Scores

Each item was rated on the five-point scale in Table 4. Mean scores are read using Table 13.

**Table 13.** Interpretation of Mean Scores

| Mean score | Verbal interpretation |
| :--- | :--- |
| 4.21 – 5.00 | Very High Quality |
| 3.41 – 4.20 | High Quality |
| 2.61 – 3.40 | Moderate Quality |
| 1.81 – 2.60 | Low Quality |
| 1.00 – 1.80 | Very Low Quality |

[DECISION PENDING: state how the composite mean is computed. We recommend the **mean of the group
means**, so that one owner is not outweighed by many tenants on functions only she uses. Whichever
is chosen, write it here in one sentence.]

### 4.4.3 Functional Suitability

**Table 14.** Evaluation Results for Functional Suitability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system lets me manage tenant records, units, and the number of occupants in each unit. | Owner | | |
| The system computes rent and water charges correctly, without me doing the arithmetic myself. | Owner | | |
| Payments I receive in person are recorded accurately against the correct unit and month. | Owner | | |
| Online payments made by tenants appear correctly for me to verify before they are settled. | Owner | | |
| Maintenance requests can be submitted, followed, and closed within the system. | Owner | | |
| The financial reports the system produces match the records I keep. | Owner | | |
| **Owner mean** | | | |
| I can see my own unit details, my bill, and what I still owe. | Tenants | | |
| I can submit a maintenance request and follow what happens to it. | Tenants | | |
| I can see a record of the payments I have made. | Tenants | | |
| **Tenant mean** | | | |
| The system provides the functions required for tenant, unit, and occupancy management. | Technical | | |
| Rent and water charges are computed correctly and consistently. | Technical | | |
| Payment recording and verification behave correctly for both in-person and online payments. | Technical | | |
| The maintenance ticketing workflow supports submission, tracking, and closure. | Technical | | |
| Generated reports agree with the records held in the database. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

[DATA PENDING: interpretation paragraph. Read the open comments first; they explain low scores.]

### 4.4.4 Performance Efficiency

**Table 15.** Evaluation Results for Performance Efficiency [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system responds quickly when I move between screens. | Owner | | |
| Financial reports are produced without a long wait. | Owner | | |
| The system stays responsive even when many records are shown at once. | Owner | | |
| **Owner mean** | | | |
| The system opens quickly. | Tenants | | |
| The system responds without delay when I move between screens. | Tenants | | |
| **Tenant mean** | | | |
| Response times are acceptable for the expected number of users and records. | Technical | | |
| Report generation completes within a reasonable time. | Technical | | |
| The system uses client and server resources efficiently. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

### 4.4.5 Compatibility

**Table 16.** Evaluation Results for Compatibility [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system works correctly in the browser I normally use. | Owner | | |
| Reports exported from the system open correctly in my spreadsheet program. | Owner | | |
| I can use the system at the same time as the other applications on my device. | Owner | | |
| **Owner mean** | | | |
| The system works correctly in the browser I normally use. | Tenants | | |
| I can use the system at the same time as my other apps. | Tenants | | |
| **Tenant mean** | | | |
| The system operates correctly across current mainstream browsers. | Technical | | |
| Exported files conform to formats that other applications can read. | Technical | | |
| The system coexists with other applications without interference. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

### 4.4.6 Usability

**Table 17.** Evaluation Results for Usability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| I can tell what each screen is for without being taught. | Owner | | |
| The words and labels used match the way I actually talk about my property. | Owner | | |
| Before anything is changed or deleted, the system asks me to confirm and tells me what will happen. | Owner | | |
| When something goes wrong, the message tells me what to do about it. | Owner | | |
| I was able to learn the system without technical help. | Owner | | |
| **Owner mean** | | | |
| I can tell what each screen is for without being taught. | Tenants | | |
| The words used in the system are easy to understand. | Tenants | | |
| It is clear how much I owe and what the amount is made up of. | Tenants | | |
| When something goes wrong, the message tells me what to do about it. | Tenants | | |
| I was able to use the system without anyone explaining it to me. | Tenants | | |
| **Tenant mean** | | | |
| The interface is understandable without prior training. | Technical | | |
| Terminology is consistent across the system and appropriate to the users. | Technical | | |
| Destructive actions require confirmation and state their consequence. | Technical | | |
| Error messages are actionable rather than technical. | Technical | | |
| The interface is operable for users with limited technical background. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

### 4.4.7 Reliability

**Table 18.** Evaluation Results for Reliability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system is available whenever I need it during the day. | Owner | | |
| Records I enter are still there when I come back to them. | Owner | | |
| When information cannot be loaded, the system says so instead of showing a wrong amount. | Owner | | |
| After an interruption, nothing I had already recorded was lost. | Owner | | |
| **Owner mean** | | | |
| The system is available whenever I try to use it. | Tenants | | |
| The information shown to me is correct and up to date. | Tenants | | |
| When something cannot be loaded, the system says so instead of showing a wrong amount. | Tenants | | |
| **Tenant mean** | | | |
| The system handles failure of a request without presenting incorrect data. | Technical | | |
| Recorded data is retained reliably. | Technical | | |
| The system distinguishes clearly between "no data" and "data could not be loaded". | Technical | | |
| The system recovers from interruption without data loss. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

### 4.4.8 Security

Tenants did not rate Security. They see only their own portal and cannot judge how the rest of the
system is protected.

**Table 19.** Evaluation Results for Security [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| Only I can reach the financial records. | Owner | | |
| A tenant can see only their own information. | Owner | | |
| I can see a record of the actions taken in the system and who took them. | Owner | | |
| I can change my password myself when I need to. | Owner | | |
| **Owner mean** | | | |
| Access to functions and records is correctly restricted by role. | Technical | | |
| A tenant account cannot reach administrative data. | Technical | | |
| Administrative actions are recorded in an auditable trail. | Technical | | |
| Credentials are handled and stored appropriately. | Technical | | |
| Authentication and session handling follow accepted practice. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

Two passive external scans, which read the public site the way a browser does, were run on
30 September 2026 as supporting evidence. **Qualys SSL Labs graded the HTTPS setup A+** (TLS 1.2
and 1.3 only, HSTS present; one of the host's two addresses graded A because HSTS was not seen on
it during the scan). **Mozilla HTTP Observatory graded the security headers B, 75 of 100, with 11
of 12 tests passed.** The one failure is deliberate: the Content Security Policy is declared in
report-only mode, which records what it would block without blocking it. Enforcing it as written
would also block the map on the public page and has not yet been tried against a payment, so it
was left for after the pilot (Chapter 5, recommendation 9). [DATA PENDING: securityheaders.com
grade and PageSpeed Insights scores from the team's runs, with dates.]

### 4.4.9 Maintainability

Only technical evaluators rated Maintainability, after being given access to the source code and
documentation.

**Table 20.** Evaluation Results for Maintainability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The codebase is organized so that a change can be located and made confidently. | Technical | | |
| The system is documented sufficiently for another developer to maintain it. | Technical | | |
| Changes to configurable values do not require code changes. | Technical | | |
| Automated checks exist that would catch a regression. | Technical | | |
| A change in one part of the system is unlikely to disturb unrelated parts. | Technical | | |
| **Composite mean** | | | |

### 4.4.10 Portability

**Table 21.** Evaluation Results for Portability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system works on the devices I already own. | Owner | | |
| I can install the system on my phone without going to an app store. | Owner | | |
| I did not need to install any other software to use the system. | Owner | | |
| **Owner mean** | | | |
| The system works on my own phone or computer. | Tenants | | |
| I can open the system on more than one device. | Tenants | | |
| I did not need to install anything extra to use it. | Tenants | | |
| **Tenant mean** | | | |
| The system can be deployed to another environment without modification. | Technical | | |
| The client installs on a mobile device without an application store. | Technical | | |
| The system does not depend on software the target environment is unlikely to have. | Technical | | |
| **Technical evaluator mean** | | | |
| **Composite mean** | | | |

### 4.4.11 Summary of Evaluation Results and Optimization

**Table 22.** Summary of Evaluation Results [DATA PENDING]

| Characteristic | Composite mean | Interpretation |
| :--- | ---: | :--- |
| Functional Suitability | | |
| Performance Efficiency | | |
| Compatibility | | |
| Usability | | |
| Reliability | | |
| Security | | |
| Maintainability | | |
| Portability | | |
| **Overall** | | |

Objective 4 asks for the system to be evaluated **and optimized**. Table 23 records the changes
made in response to feedback and testing. The first rows are changes already made during the
pilot; the rows after them will come from the survey results.

**Table 23.** Optimizations Made in Response to Evaluation

| Source | Finding | Change made | Characteristic |
| :--- | :--- | :--- | :--- |
| Client review on a phone, 23 Sep 2026 | Edit buttons appeared only on mouse hover, so they did not exist on a touch screen | Buttons show on touch screens and stay hover-only on computers | Usability |
| Client review on a phone, 23 Sep 2026 | The tenant register was wider than the phone screen | Tables become cards on small screens | Usability, Portability |
| Client review on a phone, 23 Sep 2026 | The payment form's buttons were hidden below the screen | Form height limited on phones so the buttons stay visible | Usability |
| Client review on a phone, 23 Sep 2026 | Forms with typed input had no close button | Every form can be closed; only the required first password change cannot | Usability |
| Performance review, 26 Sep 2026 | The payments page loaded the whole payment gateway library for every visitor | The library (about 194 kB) now loads only when a tenant starts an online payment; the page's own code is about 20 kB, measured on the live site on 28 Sep 2026 | Performance Efficiency |
| Final review, 26 Sep 2026 | A refused refund could be announced as successful; a receipt could be credited to the wrong tenant | Both corrected, with checks added | Reliability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A tenant's payment history showed no payments | Receipts from the ledger now shown with online payments | Functional Suitability |
| Screen audit, 26 Sep 2026 | Rental and personal expenses shared one column | Separate columns, as in the owner's workbook | Usability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A placeholder date read as every tenant's move-in | Shown as not recorded until the real dates are entered | Reliability |
| Screen audit, 26 Sep 2026 | An opened GCash checkout was listed as a recorded payment | Listed as "GCash payment started" | Security (accountability of the audit trail) |
| Screen audit, 26 Sep 2026 | A voided receipt was listed to the tenant as a real payment | Voided receipts left out of the tenant's list | Reliability |
| Screen audit, 26 Sep 2026 | The Boarding House's remitted amount was halved on the income screen | Corrected to full rent plus water, read from the owner's workbook formula | Functional Suitability |
| Screen audit, 26 Sep 2026 | The payments list would stop silently at 1,000 records | Read in batches, like the income list | Reliability |
| Requirements review, 26 Sep 2026 | The owner could not record a repair she was told about in person, or one for an empty unit; a tenant was never told a repair was done | "Log a repair" added for any unit; the tenant is notified when the repair is marked done | Functional Suitability |
| Team review, 28 Sep 2026 | The two ledger pages were named "Money coming in" and "Money going out", which are not the owner's words | Renamed "Monthly Income" and "Monthly Expenses", the names of the two sheets in her workbook | Usability |
| Team review, 26 Sep 2026 | The highlighted option in every dropdown was cut off at the sides | Outline drawn inside the option | Usability |
| Client review, 26 Sep 2026 | Tenants who had moved out still appeared in the tenant list, and every current tenant carried a "Living here" label | The list opens on current tenants only; moved-out tenants are shown only when chosen, and only unusual states carry a label | Usability |
| Client review, 26 Sep 2026 | The same page had different names in the menu, the browser tab and its own heading | Each page has one name, used in all three places | Usability |
| Client review, 26 Sep 2026 | A year chosen on one page did not carry to the others | One year choice now applies to the overview and both ledgers | Usability |
| Mobile review, 26 Sep 2026 | On phones, every tap flashed a grey box, short pages scrolled slightly, and the notification panel could end under the browser's toolbar | Tap highlight removed; pages and the panel sized to the visible screen height | Usability, Portability |
| Check review, 28 Sep 2026 | Two checks disagreed on how many ended tenancies had no end date (2 and 1): the tenant list never sent end dates, and one real record had none | The list now sends end dates; the record was given its date (migration 059); both checks now fail on any new case | Reliability |
| Team review, 28 Sep 2026 | The public FAQ offered online GCash payment while the gateway is still Adyen's test account | The FAQ now says online payments charge no real money yet and asks tenants to pay in person | Functional Suitability |
| Pre-testing audit, 29 Sep 2026 | Every tenant account shared one password that the development team had used, so a tenant given it could have signed in as a neighbour | Each tenant given their own starting password, handed over in person, with a new password required at first sign-in; every earlier session ended | Security |
| Pre-testing audit, 29 Sep 2026 | A tenant who forgot their password had no way back in, and the owner no way to help | The owner can reset a tenant's password from the tenant list; the tenant gets a one-time password and chooses their own at next sign-in | Usability, Security |
| Pre-testing audit, 29 Sep 2026 | The window that makes a tenant set their own password did not say which password it wanted, and had no way out | It asks for the starting password by name and offers Sign out | Usability |
| Pre-testing audit, 29 Sep 2026 | On a weak signal a page or a save could wait for minutes with no message | Pages stop after 25 seconds and saves after 45, each with a message; a save that may have arrived asks the reader to check before sending it again | Reliability, Usability |
| Survey results | [DATA PENDING] | | |

---

## 4.5 Deployment Plan and Strategies

The system is hosted on Vercel at a public web address, with the database on Supabase and the
payment gateway on Adyen. Every approved change is deployed automatically from the project's main
code branch. Table 24 lists what is needed to use the system, and Table 25 the deployment plan.

**Table 24.** Software and Hardware Requirements for Deployment

| Side | Requirement |
| :--- | :--- |
| Owner and tenants | A current web browser (Chrome, Edge, Firefox or Safari) on a computer or phone, and an internet connection |
| Hosting | Vercel (application), Supabase (PostgreSQL database), Adyen merchant account with GCash (optional online payment) |
| Administration | A computer that can run Node.js, used only for backups and verification runs |

**Table 25.** Deployment Plan and Strategies

| Stage | Activity | Status |
| :--- | :--- | :--- |
| 1. Environment preparation | Hosting, database and gateway set up; security settings applied | Done |
| 2. Record transfer | The owner's workbook transferred: 937 income rows and 1,327 expense allocations | Done |
| 3. Pilot use | The system used alongside the owner's existing records; differences investigated | In progress |
| 4. Training and hand-over | The owner and tenants shown how to use the system; user manual (Appendix K) handed over; accounts issued | In progress: every tenant account prepared with its own starting password on 29 September 2026. [DATA PENDING: training and hand-over dates] |
| 5. Full transition | The system becomes the owner's main record once both records agree | [DATA PENDING] |

Three risks are managed deliberately:

- **The records are the owner's real financial records.** A backup is taken before any change to
  the data, and every change is a numbered migration that can be reviewed before it runs.
- **Gateway and database credentials** are kept outside the code, passed between team members
  separately, and never written in any document. A check for committed credentials runs before
  every commit.
- **The five historical receipt anomalies** are kept exactly as the owner wrote them and reported
  on every verification run, so they are never mistaken for errors made by the system.
