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
>
> **Updated 2026-10-01** from the testing day's results (`docs/TESTING_DAY/results/`): Table 10
> (§4.3.4), Table 11 (§4.3.5), Tables 11C and 11D (§4.3.7) and §4.4.8's supporting evidence filled;
> testing-day rows added to Table 23. Parts A, T and C were checked against the system's activity
> record first and corrected where it disagreed; each results file says what changed. **Still
> pending:** the survey (Tables 12 and 14 to 22, the technical evaluators on Saturday 3 October),
> Table 5's owner question, Table 25 stages 4 and 5. (The figures were added on 5 October; see
> `figures/README.md`.)
>
> **Updated 2026-10-05:** Table 23 gained the technical evaluators' fourteen comments from their
> 3 October review (relayed by Eljohn) and the change made for each, all on the live site by
> 5 October (commits 055c6ff to 47b37fa). The survey export is still the missing input for
> Tables 12 and 14 to 22.

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
invoice book. Rent was collected in cash on site. Tenant concerns and maintenance
requests arrived by messaging application or in person. Table 5 compares each practice with the
problem it caused.

**Table 5.** Existing Practices and Identified Problems

| Area | Existing practice | Problem identified |
| :--- | :--- | :--- |
| Tenant management | Tenant details kept in the income sheet and in the owner's memory | No single record of who lives in which unit, since when, or how many occupants |
| Financial tracking | Income and expense sheets typed by hand; invoices written in a paper book | Totals depend on manual arithmetic; nothing checks an invoice number against the book; one file on removable storage is the only copy |
| Communication | Requests sent by messaging application or said in person | Requests are not recorded, so there is no way to follow a request to completion |
| Booking | [CONFIRM WITH THE OWNER: how enquiries arrived before the system, for example walk-in, referral or phone] | No record of enquiries or which unit an enquiry was about |

The strongest evidence for these problems came from the owner's own records. When her workbook was
transferred into the system (937 income rows and 1,327 expense allocations), the transfer exposed
problems that had gone unnoticed in the spreadsheet:

- **402 of the 937 income rows (43%)** had no anniversary date and no deposit recorded.
- **Five invoice numbers** were each used for two different payments. In one case, a
  single invoice number was used for two different tenants on the same day. Each case is recorded
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
| Manual arithmetic and unchecked receipts | Compute charges, record payments against the owner's own invoice numbers, reproduce the owner's reports | Financial Tracking (4.2.4) |
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

Figures 4 to 8 show the system as it stood on 5 October 2026. The units, their rates and their
status in Figures 4 and 5 are the property's own, as the public site shows them. To protect the
tenants' privacy, the names, payments, expenses and repair requests in Figures 4, 6, 7 and 8 are
sample records, and no real tenant's name or payment appears in any figure.

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

![Room and Rate Directory](figures/figure-4-rooms-and-rates.png)

*Figure 4. Room and Rate Directory.*

### 4.2.3 Booking and Reservation Management Module

The public site lists the units with their rates, read live from the database. A visitor sends an
enquiry about a specific unit without needing an account. The enquiry appears in the owner's inbox,
and when accepted it becomes a tenancy that stays linked to the enquiry it came from. The owner
answers inside the system, and the visitor reads the answer there too: on sending, they are given a
private link and a short reference code, and either one (the code together with the phone number
they gave) opens their conversation, where they can write back. No account is created and nothing
is sent by text or email; the link's secret is stored only in hashed form, like a password. A reserved
unit stays visible but accepts no new enquiries. The public site never shows a tenant's name; this
is checked on every verification run against all 33 published units.

![Public unit catalogue](figures/figure-5a-public-unit-catalogue.png)

![Enquiry form](figures/figure-5b-inquiry-form.png)

*Figure 5. Public Unit Catalogue (top) and Enquiry Form (bottom).*

### 4.2.4 Financial Tracking and Payment Recording Module

A bill carries rent and water as separate amounts. Water is the number of occupants multiplied by
a rate the owner can change in the settings, currently ₱200 per occupant. The two Linda units are
charged a fixed water amount instead and are kept out of the property's grand totals, as in the
owner's own workbook. A bill is overdue from the day after its due date, as the owner confirmed.

Cash payments are recorded by the owner with the number of the invoice she issued, written INV#,
or with none, since not every payment has an invoice. The system never makes up an invoice number. Online payments go through Adyen with GCash: a payment
made this way enters a **Pending Verification** state and changes nothing on the tenant's bill
until the owner verifies it. Before the owner records a payment, the system warns her if the same
tenant already has a payment for that month, including one still waiting for verification.

Income and expenses are shown on two pages named after the owner's two workbook sheets, **Monthly
Income** and **Monthly Expenses**, in the same layout as those sheets, and can be exported as Excel
files in that layout. Income is filed under the month the rent is for, not the
day it was paid, so a late payment still counts toward the right month.

![The Monthly Income Ledger](figures/figure-6-monthly-income.png)

*Figure 6. The Monthly Income Ledger.*

Tenants follow the same record from their side. The tenant's payments page shows **"Your rent,
month by month"**: one sentence stating how far their payments reach ("Paid up to …") and what is
due, a bar for each of the last twelve months marked Paid, Due, Not entered or Not due yet,
and the months paid, the amount paid and the amount due now. Only receipts the owner has verified
count as paid, the same rule behind the "paid up to" date; a voided receipt never counts, and a GCash payment
still awaiting verification is listed separately as waiting. A month with no payment entered, whether
between two payments or after the last one, is shown as "Not entered", never as owed or overdue,
because the records alone cannot tell an unpaid month from one the owner has not entered yet; only
a bill actually raised is shown as due.

The system does not handle electricity. Every unit has its own meter and the tenant pays the
electric company directly, as the owner confirmed on 18 September 2026.

Every figure the owner reads is worked out by the system from the rules in Table 7A rather than
typed, so the same inputs always give the same amount.

**Table 7A.** Business Rules for Computed Figures, with a Worked Example

| Rule | What the system computes | Worked example |
| :--- | :--- | :--- |
| BR-014 Water fee | Water = number of occupants × ₱200 | Unit 2C with two occupants: 2 × ₱200 = ₱400 |
| BR-038 Remitted amount | Remitted = Rent Amount + Water Payment | ₱8,500 + ₱400 = ₱8,900 |
| BR-035 50% Share | A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet | ₱8,500 ÷ 2 = ₱4,250 |
| BR-033 Rent period | The period a payment covers, from the tenancy's anniversary date | Anniversary on the 13th: rent for 13 August to 12 September |
| BR-010, BR-011, BR-012 Due date and overdue | Due on the date the billing cycle sets; overdue from the next day, with no grace period | Due 13 September: overdue from 14 September |
| BR-039 Deposit | Equal to the rent in effect at move-in, set once | Moved in at ₱8,500: deposit ₱8,500 |
| BR-040 Linda's units | Water at the same ₱200 per occupant, recorded separately and kept out of the remitted amount | Unit LF with two occupants: ₱400 recorded as Linda's water; remitted = rent only |
| BR-045 Expense total | An expense entry's total = the sum of its allocations to property areas | ₱6,000 to the Boarding House + ₱2,000 to the Main House = ₱8,000 |

### 4.2.5 Maintenance Ticketing and Notification Module

A tenant submits a request with a title, description and priority, and follows its status through
to completion. The owner can also log a repair herself when she is told about it in person,
including a repair to an empty unit, which has no tenant to report it. Only the owner can close a
request, and when she marks a tenant's repair as done the tenant is notified. The system also sends
in-app notifications to the tenant when a payment is verified or declined, and to the owner when a
payment, enquiry or request comment arrives. Opening a notification opens the record it is about,
for example the payment waiting to be verified, rather than only the page it is on.

![Maintenance Requests Board](figures/figure-7-repairs-board.png)

*Figure 7. Maintenance Requests Board.*

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
  kept. On the capstone adviser's advice the trail is kept in the database for the developers and
  is not shown in the application: its Activity screen was removed on 1 October 2026.
- Messages from the payment gateway are accepted only with a valid HMAC signature.
- A check for committed passwords and keys runs before every commit.

Table 7B sets out which role may use which function. It is read from the permission table in the
server's code, which every request is checked against before it reaches the data.

**Table 7B.** Role and Privilege Matrix

| Function | Visitor | Tenant | Administrator |
| :--- | :---: | :---: | :---: |
| View the public site, units and rates | Yes | Yes | Yes |
| Send an inquiry and read the reply (private link or reference code) | Yes | Yes | Yes |
| View and update their own details and password | No | Own | Own |
| View a unit, its bills, payments and receipts | No | Own | All |
| Pay a bill online with GCash | No | Own | No |
| Send, follow and cancel a repair request | No | Own | All, and dispatch or close |
| Receive notifications | No | Own | Own |
| Manage units and rates | No | No | Yes |
| Manage tenants: move in, move out, reset a password | No | No | Yes |
| Record, verify, correct and void payments | No | No | Yes |
| Income and expense ledgers, overview figures and workbook downloads | No | No | Yes |
| Answer, close and delete inquiries | No | No | Yes |

A prospect, someone recorded from an inquiry who has not moved in, holds a visitor's permissions.
"Own" means the server reads the person from their sign-in token and returns only their own
records; anyone else's answers "not found".

### 4.2.7 Progressive Web Application Implementation

The client is a Progressive Web Application with a service worker and a web app manifest, so it
can be installed on a phone or computer and opens without the browser's address bar. The service
worker keeps the application's own files for faster loading, but it does not store tenant or
financial data. A separate, read-only copy was added on 1 and 2 October 2026: the essential
figures, names and notifications the signed-in person's screens last loaded are kept in the
browser on that person's own device, so the installed application can still show them with no
connection under one notice giving the time they were saved. For a tenant these are their rent,
balance, payments, repair requests and details; for the owner, the units, tenants, income and
expense records, repairs and inquiries. Paying, recording and every other action still need the
connection and are not offered without it, and the copy is removed when the person signs out or
someone else signs in on the device. This stays within the delimitation in Section 1.4:
current data and every change to it need an internet connection. Screens adapt to the device: tables on a computer become cards
on a phone.

![The Tenant Portal on a Mobile Phone](figures/figure-8-tenant-portal-phone.png)

*Figure 8. The Tenant Portal on a Mobile Phone.*

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
on every run instead of being quietly corrected, because only the owner's invoice book can say
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

Asked afterwards what had gone wrong, Adyen Technical Support explained that GCash needs a
specific acquirer account configuration in the test environment, and that some of its fields had
probably been changed during Adyen's automatic setup flow, which broke the default configuration
the payment method depends on (Adyen Technical Support, personal communication, September 27,
2026). The test environment runs on predefined configurations and does not carry out every step
end to end, so a fault that live onboarding would catch appeared here as an immediate refusal. In
the live environment the setup is more controlled: some steps are handled by Adyen Support, and
the merchant may be asked for further details. Going live is therefore treated as a separate step
(Chapter 5, Recommendation 5).

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
| Monthly Income | Totals for rent and water (and a garbage fee, removed on 30 September); collections by cluster | Matched after one defect was fixed |
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
right about the records; the records were behind the owner's invoice book. A system that tenants
can see makes the owner's entry of receipts part of what they experience, and the testing day was
prepared accordingly (the owner enters the receipts she holds first, or tenants are told).

The lesson is the same one Section 4.3.1 draws, from the other side: **passing checks show that
what was tested is correct, not that everything is.** Comparing each screen with the records it
claims to show is now part of how the team verifies the system.

### 4.3.4 Functional Walkthrough Testing

A 26-step walkthrough (30 rows in Table 10, counting the sub-steps 15b, 19b, 22b and 23b) exercises every function that writes data exactly once. It runs against the
one unoccupied unit so that no real tenancy, receipt or expense is touched. The owner performed it
herself on 30 September 2026 on the administrator's laptop in Google Chrome, signed in to her own
account, with a team member reading each step and recording the outcome. Where the observer's notes
and the system's own activity record disagreed, the activity record was taken as the account of
what was done.

> **TEAM NOTE.** Source: `docs/TESTING_DAY/results/A_ADMIN_Lloyd.md` (Part A, A-05 to A-32), turned
> into this table by `scripts/survey/a-md-to-csv.mjs` and `fill-walkthrough.mjs`. Steps 7, 22, 22b
> and 26 were corrected to "Not done" on 1 October after the activity record showed they had not
> happened as written. Step 18 was first recorded as Fail (no water warning) and reclassified: since
> 30 September the water amount cannot be typed. The two test expenses of step 22 were voided by
> migration 070 on 1 October (BLOCKED_FOR_SEAN.md, B-91), so September's books no longer count them.

**Table 10.** Results of the Functional Walkthrough

| Step | Function tested | Expected result | Actual result | Pass or fail |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Public unit catalogue browsing | 33 units listed without resident names or sensitive details | As expected. | Pass |
| 2 | Public unit detail inspection | Correct rate, floor, and cluster; resident names omitted (LB and LF verified) | As expected. | Pass |
| 3 | Public booking enquiry submission | Confirmation message displayed; rate limiter guards abuse | As expected. | Pass |
| 4 | Authentication negative test | Wrong current password rejected with inline message; session stays active | As expected. | Pass |
| 5 | Administrator password rotation | Password updated successfully; active session maintained | As expected. | Pass |
| 6 | Re-authentication with new credential | Successful sign-in using updated administrator password | As expected. | Pass |
| 7 | Unit rate update and audit trigger | Rate updated; database trigger writes immutable price history row | Not performed: the system's activity record shows no rate change that day, and the unit kept its ₱30,000 rate. | Not done |
| 8 | Tenant onboarding to vacant unit (PH) | Tenancy created; unit status transitions to Occupied | As expected. | Pass |
| 9 | Duplicate credential guard | Duplicate phone number registration rejected with validation message | As expected. | Pass |
| 10 | Tenancy details modification | Occupant count updated and persisted in database | As expected. | Pass |
| 11 | Tenant portal authentication | Tenant dashboard displays correct unit details, rate, and occupancy | Signed in after one mistyped password; the system required a new password, then showed the unit, rate and occupants. | Pass |
| 12 | Maintenance ticket creation with attachment | Ticket submitted with photo; size guard informs user if file is too large | As expected. | Pass |
| 13 | Ticket communication thread | Follow-up message posted and displayed within ticket conversation | As expected. | Pass |
| 14 | Tenant emergency contact update | Updated emergency contact saved and reflected in profile | As expected. | Pass |
| 15 | Online payment checkout initialization | Adyen Web Drop-in mounts inside modal and displays GCash button | The payment window opened with the GCash button; the attempt was not paid and was rejected, so nothing reached the ledger. | Pass |
| 15b | On-demand billing generation | Bill generated on demand matching unit rate plus ₱200/occupant water | A bill of ₱30,200 was raised (₱30,000 rent and ₱200 water for one occupant); removed after the test. | Pass |
| 16 | Notification state management | Notification marked as read; unread badge counter decrements | As expected. | Pass |
| 17 | Cross-tenant authorization perimeter | Accessing foreign ticket ID returns HTTP 404 (Not Found), not 403 | As expected. | Pass |
| 18 | On-site cash collection recording | Collection recorded against invoice REHEARSAL-001; bill marked settled | The collection of ₱30,200 was recorded and the bill settled. Water is worked out from the number of occupants and cannot be typed, so a wrong water amount could not be entered. | Pass |
| 19 | Duplicate invoice prevention | Re-submitting an identical invoice number is blocked with an explicit alert | As expected. | Pass |
| 19b | Receipt voiding and double-void guard | First void reverses ledger entry; second void attempt is rejected | The first void worked. The second window refreshed itself and no longer showed the receipt, so a second void could not be attempted; the refusal message was therefore not seen. | Pass |
| 20 | Enquiry processing and resolution | Administrator reply sent; enquiry status marked Closed | As expected. | Pass |
| 21 | Maintenance resolution and notification | Ticket advanced to Resolved; tenant receives resolution notification | Moved to In Progress, then Resolved; the tenant was notified that the repair was done. | Pass |
| 22 | Expense recording and allocation | ₱100 expense logged with property allocation; edits/deletion verified | Not performed as written: two separate expenses (₱60 and ₱40) were recorded instead of one ₱100 expense split 60/40, and neither was edited or deleted. | Not done |
| 22b | Expense allocation split derivation | Expense split across areas; total derived automatically via trigger | Not performed as written: two separate expenses (₱60 and ₱40) were recorded instead of one ₱100 expense split 60/40, and neither was edited or deleted. | Not done |
| 23 | Financial workbook export | income.xlsx and expenses.xlsx downloaded matching owner layout | As expected. | Pass |
| 23b | Fail-safe presentation on API interruption | Backend stopped; money tiles display "—" instead of misleading ₱0.00 | With the connection cut, the money tiles showed ₱0 and "Try again" instead of "—". | Fail |
| 24 | Tenant vacating and tenancy termination | Tenancy ended; unit returns to Available; end_date recorded | The test tenant was moved out and the unit showed Available. | Pass |
| 25 | Ledger baseline verification | Rehearsal records removed; ledger restored to exact 937 baseline rows | Done by the team after the session rather than on screen: the test tenant's bill, payments, voided receipt and repair were removed; the two test expenses of step 22 were voided on 1 October. | Not done |
| 26 | Unit rate restoration | PH rate restored to confirmed ₱30,000 rate card baseline | Not needed, because step 7 was not performed; the rate reads ₱30,000. | Not done |

Of the 30 rows of the walkthrough, 24 passed the first time, 1 failed and 5 were not performed as
written. Every function a tenant uses passed, as did the owner's onboarding, the duplicate guards
for phone numbers and invoice numbers, voiding, enquiry replies, repair handling, the workbook export and
moving a tenant out. In step 18 the collection was recorded and the bill settled; the test also
asked for a wrong water amount to be typed first, but since 30 September water is worked out from the
number of occupants and cannot be typed, so no wrong amount could be entered. The one failure was
step 23b: with the connection cut, the Overview showed ₱0 where the design (Section 4.2.7) requires
"—", so that a missing figure is never read as a zero balance. It is recorded as a defect (Table 23).
Of the steps not
performed, step 7 (a rate change) and step 26 (restoring it) were skipped together, and steps 22 and
22b were carried out as two separate expenses instead of one expense split between two areas, so
splitting, editing and deleting an expense were not exercised by the owner. Step 19b passed with an unexpected result: the second window refreshed itself before the
repeated void could be attempted, a consequence of the live updating added on 30 September, so the
guard against a double void was not reached from the screen.

### 4.3.5 Responsiveness and Operational Performance

Performance was measured on 30 September 2026 on the live system, on a laptop in Google Chrome 154
over the boarding house's Wi-Fi and on a phone. First loads were taken with the browser's cache
cleared. Page loads on the laptop were read from the browser's developer tools (the time until the
page had finished loading); the other times were taken with a stopwatch, from the tap until the
figures the user came for were on screen, or until the file was saved.

> **TEAM NOTE.** Source: `docs/TESTING_DAY/results/PF_TIMINGS_Eljohn.md`. Three runs were timed per
> screen but only one value was written down, so each figure is a single run, not the median of
> three that Chapter 3 describes: say so in Chapter 3's procedure, or re-time. **Before pasting:**
> make the column headings name the actual laptop and phone, and make sure Chapter 3's Tables 2 and 3
> list the same devices (the sheet names a Dell XPS 15; the phones used that day were an Infinix
> GT20 on Wi-Fi and an iPhone 15 on mobile data, and the sheet does not say which phone each time
> came from - ask Eljohn).

**Table 11.** Page Load and Response Times (30 September 2026, seconds)

| Screen | Laptop | Mobile phone |
| :--- | --: | --: |
| Public home page, first load | 1.85 | 2.42 |
| Public home page, second load | 0.62 | 0.95 |
| Sign-in to dashboard | 2.10 | 2.88 |
| Income ledger, one full year | 1.45 | not measured |
| Excel export of one year | 2.30 | not measured |
| Tenant portal, first load | 2.15 | 3.05 |
| Tenant payments page | 1.20 | 1.78 |
| Sending a repair request | 1.65 | 2.10 |

Every screen was usable within about three seconds on the phone and a little over two on the
laptop. The slowest was the tenant portal on first load (3.05 seconds on the phone). A second visit
is faster because the browser already holds the application's files: the public page took 0.95
seconds on the phone instead of 2.42. The owner's heaviest
operations, a full year of the income ledger and the export of that year to Excel, took 1.45 and
2.30 seconds.

Google's measurements agree with these. PageSpeed Insights, which runs Lighthouse on Google's
servers against an emulated mid-range phone on a slow 4G connection, scored the public page 85 to 88
for performance in four runs on 30 September and 1 October, with its largest element drawn at 3.4
to 3.6 seconds, and 95 and 98 as a computer page (largest element at 0.9 and 1.1 seconds);
accessibility, best practices and search optimization scored 100 in every run. Lighthouse run on
the owner's signed-in Overview on 1 October, in a clean browser profile, scored 85 for performance
as a computer page and 81 as a phone page, and 100 for accessibility and best practices. Its search
score of 66 is intended: the owner's pages tell search engines not to list them, so that her books
never appear in search results. What held the signed-in page back was movement as the figures
arrived on the computer (a layout shift of 0.22) and 0.7 seconds of script work on the emulated
phone (Chapter 5, recommendation 11).

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
| Tenant and administrator pages with no connection, signed out | The application opened and asked for sign-in; no personal or financial data was shown |
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
tenants' records need the connection. Since 1 and 2 October the essential figures, names and
notifications a person last loaded stay readable offline on that person's device (Section 4.2.7),
and they are removed at sign-out, so none are left on a shared phone.
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

Google Lighthouse (version 12.8, run on the same laptop against the live public page, three runs
each, median reported) scored accessibility, best practices and search optimization 100 on both a
simulated phone and a computer. It also found the page jumping as it loaded: the footer appeared on
an empty page and was pushed down when the page's content arrived, a layout shift of 0.50 where
0.1 is the limit for "good", which held the computer performance score at 76. The space the page
needs is now held until it loads; after the change the live page measured a layout shift of 0 and
a computer performance score of 95. On the simulated slow phone the score stayed about 70, because
the page's main text appears only after its code has arrived and run, about five seconds on that
connection. Later that morning phones were sent only the part of each photograph they show: the
middle of the building photograph at full sharpness, half the file, and a smaller copy of the gate,
a third of it. Google's PageSpeed Insights, which runs Lighthouse on Google's own servers, then
scored the phone page 86 for performance with its largest element drawn at 3.5 seconds, against 76
and 5.3 seconds in its run before the change (Chapter 5, recommendation 11). The real-device timings in Table 11 are the measurement
that decides how fast the system is for the owner and tenants.

### 4.3.7 User Acceptance Testing with the Owner and Tenants

> **TEAM NOTE.** Filled on 1 October 2026 from `docs/TESTING_DAY/results/` (Parts A, T, C, O). Part T
> and Part C were corrected against the system's activity record before use; each file says what
> was changed and why. Table 11C is computed by `scripts/survey/compute-uat.mjs` from
> `T_observations.csv`. **Before pasting:** confirm that signed consent forms exist for the owner and
> all three tenants (the sentence on consent below depends on it).

The owner and three tenants used the live system for their own tasks on 30 September 2026, each on
their own device and signed in to their own account, after giving written consent. A facilitator
read each task aloud without showing where to tap; an observer recorded whether the task was
completed without help, with help, or not at all, how long it took, and the number of wrong turns.
Following the quality-in-use model of ISO/IEC 25010, completion measures effectiveness, time
measures efficiency, and the survey in Section 4.4 measures satisfaction. The owner's session
followed the walkthrough (Table 10) and her real work of the day. The tenants came at different
times in the evening: the first from 7:28 PM, the other two together from 8:08 PM, which is when
the simultaneous session took place. The team repeated the offline and installation tests of Table
11A on two phones, an Android phone in Chrome and an iPhone in Safari.

Where an observer's sheet and the system's activity record disagreed, the activity record was used,
since it records every sign-in, sign-out, request, note and saved change with its time. A task the
record shows was never done is counted as not attempted. On this rule the third tenant's session
counts only the tasks the record confirms, because the times on that tenant's sheet fall before the
account's first sign-in.

**Table 11C.** Tenant Task Results (30 September 2026)

| Task | Tenants attempting | Completed without help | Completed with help | Not completed | Median time (s) | Mean wrong turns | Completion without help |
| :--- | --: | --: | --: | --: | --: | --: | --: |
| First sign-in and choosing a password (T-01, T-02) | 3 | 4 | 2 | 0 | 120 | 0.5 | 67% |
| Finding their unit, rent and balance (T-03, T-04) | 2 | 3 | 1 | 0 | 90 | 0.5 | 75% |
| Finding their payments (T-05, T-06) | 2 | 4 | 0 | 0 | 60 | 0.0 | 100% |
| Sending a repair request with a photo (T-07 to T-09) | 3 | 7 | 0 | 0 | 90 | 0.0 | 100% |
| Following up a request (T-10, T-11) | 2 | 3 | 0 | 0 | 120 | 0.0 | 100% |
| Checking their details and notifications (T-12, T-13) | 3 | 5 | 0 | 0 | 60 | 0.2 | 100% |
| Opening the GCash payment (T-14) | 2 | 2 | 0 | 0 | 120 | 0.0 | 100% |
| Staying out of the owner's pages; signing out (T-15, T-16) | 2 | 3 | 0 | 0 | 60 | 0.0 | 100% |
| **All tasks** | 3 | 31 | 3 | 0 | 60 | 0.2 | 91% |

**Table 11D.** Simultaneous Use by the Owner and Tenants (30 September 2026, two tenants)

| Test (at the same moment) | Result |
| :--- | :--- |
| Every tenant opens their overview (C-01) | Pass: both screens loaded; the slowest in about 1 second |
| Each tenant sees only their own unit and records (C-02) | Pass: each saw only their own unit and account |
| Every tenant sends a message on a request (C-03, C-04) | Not performed: one tenant sent a note, and the owner saw and answered it within a minute |
| The owner changes two requests; only those tenants are notified (C-05) | Not applicable: by the owner's decision a tenant is notified when a repair is done, not when it is started, so no notice was expected |
| A double tap on Send saves one message (C-06) | Not performed |
| The owner opens a full year of Monthly Income while tenants are active (C-07) | Pass: loaded in about 3 seconds |
| The owner on the laptop and tenants on phones at once (C-08) | Pass: no session affected another |

Every task the tenants attempted was completed, 31 of 34 attempts without help (91 per cent). Help was needed at the start: two of the three tenants
were helped through their first sign-in, one after two wrong turns, and one needed help to find
their unit and rent. No tenant needed help with anything else. Finding payments, reporting a
repair, following it up, checking their details and notifications, opening the GCash payment and
being kept out of the owner's pages were all done alone, typically in one to two minutes each. The
repairs they sent reached the owner at once and she acted on them the same evening: two were set
to In Progress within minutes and she answered the second tenant's note a minute after it was sent.
Asked whether anything was confusing, the first tenant said "So far, wala naman" (nothing so far)
and the third "Wala naman po" (nothing). The second said "Nakulangan pa ako. And I want more" (it
still felt lacking; I want more), which the team reads as a request for more features rather than a
difficulty, and which Chapter 5 takes up. The owner, asked what she would use first the next
morning, said she would check the repair notifications.

The simultaneous session ran with two tenants, not all three, and the owner; the tests that depend
on several tenants posting at once (C-03, C-04, C-06) were therefore not performed. Table 11B covers
simultaneous reading only, so simultaneous saving by several real users remains untested. On the two
phones the offline behaviour matched Table 11A: both installed the application from the browser
(Chrome offered "Add to Home screen" rather than an installation prompt), opened it without a
connection with the notice shown, kept typed text when a send failed, and showed no personal data after signing out; sending the kept text once the connection returned is confirmed
by the activity record on one of the two phones. One result differed. On a
connection that stops answering, the iPhone showed the "cannot tell whether it was saved" message
within the 45 seconds the design sets, but the Android phone showed it only after 60 to 80 seconds.
The message is correct but late on that phone, and it is recorded as a defect (Table 23).

---

Table 11E brings the testing of Section 4.3 together by level.

**Table 11E.** Summary of Test Execution by Level

| Level | Activity (source) | Executed | Passed | Failed | Not performed or not applicable | Pass rate |
| :--- | :--- | --: | --: | --: | --: | --: |
| Unit and integration | Automated check suites, 29 September 2026 (Table 8) | 20 | 20 | 0 | 0 | 100% |
| System | Functional walkthrough by the owner, 30 September 2026 (Table 10) | 25 | 24 | 1 | 5 | 96% |
| Acceptance | Tenant tasks, 30 September 2026 (Table 11C) | 34 | 34 | 0 | 0 | 100% (91% without help) |
| Acceptance | Simultaneous use by the owner and tenants (Table 11D) | 4 | 4 | 0 | 3 | 100% |
| **All levels** | | **83** | **82** | **1** | **8** | **98.8%** |

Every level passed at least 96 per cent of the tests executed. The one failure, at the system level,
is classified in Table 23A; it was not critical, and no critical defect was found in any activity.

## 4.4 Evaluation of the System Based on ISO/IEC 25010

*Answers Objective 4.*

> **TEAM NOTE.** Everything in this section waits on the survey. The items in each table are
> copied word for word from `docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`. If the
> wording in the Google Form changes, change it here too. Section 3.3 must also name the
> technical evaluators as a third group, or the Maintainability table has no respondents that
> Chapter 3 accounts for (see `FIXES_TO_CHAPTERS_1_TO_3.md`).
>
> **TEAM NOTE (2026-09-30).** If prospective tenants answered the survey (its Section 5), they are a
> fourth group: add them to the paragraph below ("...the owner, the tenants, prospective tenants who
> used only the public website, and technical evaluators... Prospective tenants did not rate
> Security or Maintainability, which a visitor cannot observe.") and keep their row in Table 12.
> `scripts/survey/compute-survey.mjs` prints their rows in Tables 14 to 18 and 21. If none took
> part, delete the row. Chapter 3 text: `FIXES_TO_CHAPTERS_1_TO_3.md` H4.

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
| Prospective tenants | | |
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

An accessibility audit on 2 October 2026 extended the earlier scan (Section 4.3.6) to every kind of
screen: 19 screens, eight public, seven of the owner's and four of the tenant's, each in light and
dark mode at phone (375 pixels) and computer (1,366 pixels) widths, 76 scans in all with axe-core 4
against WCAG 2.2 levels A and AA. None found a violation, nor did scans of the menus and forms in
their open state. By keyboard alone, focus moved into every dialog, stayed inside it, and returned to
the button that opened it when the dialog was closed with Escape; every focused control showed a
visible outline; and with the device set to reduce motion, only fades remained. The audit used a
local copy of the system with invented records, and no screen reader was tried, so these results show
that the screens are built correctly for assistive technology, not that a user of one has tried them
(`docs/AUDIT_2026-10-02_SECURITY_ACCESSIBILITY.md`, Section 2).

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

Three passive external scans, which read the public site the way a browser does, were run as
supporting evidence. **Qualys SSL Labs graded the HTTPS setup A+** on 29 September 2026 (TLS 1.2
and 1.3 only, HSTS present; one of the host's two addresses graded A because HSTS was not seen on
it during the scan). **Mozilla HTTP Observatory first graded the security headers B, 75 of 100,
with 11 of 12 tests passed**, the one failure being deliberate: the Content Security Policy was
declared in report-only mode, which records what it would block without blocking it. A GCash
checkout on the live site then loaded Adyen with no report from the policy, the policy was switched
to enforcing, and on the evening of 30 September the Observatory graded the site **A+, 115 of 100,
with all 12 tests passed**; its remaining notes are recommendations, not failures (inline styles
still allowed, and four optional isolation headers not set). **securityheaders.com graded the
site A+** on 30 September at 10:18 PM, with all six headers it checks present (Chapter 5,
recommendation 9).

The same day the team checked, by hand and without any scanning tool, the protections a user meets.
After five wrong passwords the test tenant's account locked for 15 minutes with a plain message. A
signed-out browser sent to a tenant page was taken to the sign-in page; after a tenant signed out,
the Back button showed no personal data; the starting password on the tenant's slip was refused once
the tenant had chosen their own. Two tenants who typed the owner's address into the address bar were
kept out, and another tenant's repair number typed into the address bar gave "not found". The public
pages showed no tenant names, and the owner's activity record listed the day's password changes and
administrative actions without showing any password. All twelve checks passed.

A security review of the code on 2 October 2026 read every one of the system's 71 request handlers.
Every administrative route requires a signed-in administrator; every tenant route takes the tenant
from the sign-in token, never from the request, and answers "not found" for another tenant's
record; every request that changes data is checked against a schema before it is used; and every
database function is callable by the server only. It found no high-severity problem in the code.
Four low-severity improvements were made the same day: return addresses that a browser could read
as another site are refused, the sign-in token's algorithm is named, a repair photo may no longer
be an SVG document, and the page security policy gained two directives. Row-level security was added
to three old backup tables that had been created without it (migration 076). Probed from outside
without signing in, the live site refused every protected endpoint with 401, served none of its
configuration or source files, and answered a request from a foreign website with a server error;
that request is now refused with 403 before any route runs. The technical evaluators' review the
next day led to two further input checks: phone numbers and photo formats are now checked by the
server as well as the page (Table 23).
On 5 October 2026, Supabase's own security advisor raised no warning on the database. Its only
notes were informational, one for each of the 24 tables: row-level security is on and no policy grants
access. That is the intended design: the public keys can read and write nothing, and every request
goes through the server, which checks the user's role first. The same day, `npm audit` found no
known vulnerability in the production dependencies of the frontend, the backend or the project root.

The conversation a visitor has about an enquiry (Section 4.2.3) is reached without an account, so
its link is itself the credential, what the W3C Technical Architecture Group calls a capability
URL (*Good Practices for Capability URLs*). Its secret is 256 bits, well above the 64 bits OWASP
recommends for session identifiers; only its SHA-256 hash is stored; and it travels in the address's
#fragment, which browsers do not send to a server, so it never reaches a server log. The shorter
reference code opens the conversation only together with the phone number given in the enquiry.
Look-ups are rate-limited (30 per 15 minutes from one address), and each link opens one
conversation only.

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
made in response to feedback and testing. The first rows are changes made during the pilot,
followed by the fourteen comments of the technical evaluators who reviewed the system on
3 October 2026, each addressed by 5 October; the last row will come from the survey results.

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
| Lighthouse audit, 30 Sep 2026 | The public page jumped while it loaded: the footer showed on an empty page and was pushed down when the page arrived (layout shift 0.50; desktop performance score 76) | The page's space is held until it loads; layout shift 0, desktop performance score 95, measured on the live site | Performance Efficiency, Usability |
| Pre-testing audit, 29 Sep 2026 | A tenant who forgot their password had no way back in, and the owner no way to help | The owner can reset a tenant's password from the tenant list; the tenant gets a one-time password and chooses their own at next sign-in | Usability, Security |
| Pre-testing audit, 29 Sep 2026 | The window that makes a tenant set their own password did not say which password it wanted, and had no way out | It asks for the starting password by name and offers Sign out | Usability |
| Pre-testing audit, 29 Sep 2026 | On a weak signal a page or a save could wait for minutes with no message | Pages stop after 25 seconds and saves after 45, each with a message; a save that may have arrived asks the reader to check before sending it again | Reliability, Usability |
| Owner's use, 30 Sep 2026 | A payment the owner recorded, or a repair a tenant sent, did not appear on the other person's open screen until they refreshed it | Every open page checks for changes every 5 seconds while it is on screen and reloads only what changed | Usability, Reliability |
| Walkthrough, 30 Sep 2026 (step 23b) | With the connection cut, the Overview's money tiles showed ₱0 instead of "—" | Not reproduced on 1 Oct 2026: on the current version, reloading the Overview with no connection shows "could not be loaded" on every tile and no ₱0. To be re-tested on the owner's laptop | Reliability |
| Testing day on an Android phone, 30 Sep 2026 | On a connection that stops answering, the "cannot tell whether it was saved" message came after 60 to 80 seconds instead of 45 | Chrome slows the timers of a page that is not on screen, which a phone test takes the user out of; the deadline is now also checked against the clock the moment the page is on screen again, so a late message appears at once. To be re-tested on the Android phone | Reliability |
| Team check of the evaluation account, 2 Oct 2026 | The tenant account prepared for the evaluators showed ₱30,400 owed, but paying online answered that there was nothing to pay: receipts voided on the testing day had left a payment counted against the bill | Online payment now skips a bill that is already covered and says when a receipt is missing; the account's bills were brought into line with its receipts (migration 077), with no other tenant's records changed | Functional Suitability, Reliability |
| Security review, 2 Oct 2026 | A request sent from another website received a server error (500) instead of a refusal | Refused with 403 before any route runs | Security |
| Technical evaluators, 3 Oct 2026 | On a phone, the light and dark mode switch sat at the foot of the footer, below every policy link | Moved to the top bar of every public page | Usability |
| Technical evaluators, 3 Oct 2026 | An email address was checked only when the form was sent | Checked as soon as the visitor leaves the field | Usability |
| Technical evaluators, 3 Oct 2026 | Links were underlined throughout the site | Underlines kept only in the footer; other links are shown in bold | Usability |
| Technical evaluators, 3 Oct 2026 | "Send one", the way to start an inquiry from the inquiry lookup page, did not stand out | Shown in bold | Usability |
| Technical evaluators, 3 Oct 2026 | Phone numbers were typed as one run of digits, and the inquiry form accepted any seven characters | Numbers are spaced as they are typed (0917 123 4567); an inquiry must give a Philippine mobile number, checked on the page and again by the server | Usability, Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Filters opened in a pop-up window and needed an Apply button | Each filter is a dropdown on the page that applies the moment it is chosen; on a phone the dropdowns open under the Filters button instead of in a window | Usability |
| Technical evaluators, 3 Oct 2026 | After a session ran out, signing in again did not return to the page that had been open | Signing in returns each person to the page they last had open | Usability |
| Technical evaluators, 3 Oct 2026 | Photos of any image format could be attached | JPG and PNG only, checked when the file is chosen and again by the server | Security, Functional Suitability |
| Technical evaluators, 3 Oct 2026 | A tenant could not withdraw a repair request | A tenant can cancel a request until work on it starts, at most once an hour, with an optional reason; the owner is notified and the request is kept, marked as cancelled | Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Moving a tenant out recorded no reason | An optional reason, kept in the activity record with the move-out | Functional Suitability |
| Technical evaluators, 3 Oct 2026 | Rows opened with "Show more" or "Show all" on the owner's lists could not be hidden again | "Show fewer" returns the list to its first page | Usability |
| Technical evaluators, 3 Oct 2026 | Action history, and its error handling | Each person's Overview shows their own last three actions in plain words, each linking to where it happened ("Recorded a payment: 2B, October 2026, ₱8,800."); a refresh that fails for a moment keeps the figures already on screen | Usability, Reliability |
| Technical evaluators, 3 Oct 2026 | The footer was tall, with too much empty space | Spacing reduced and its columns placed side by side on a phone | Usability |
| Technical evaluators, 3 Oct 2026 | The privacy policy's list of contents crowded the page on a phone | On a phone the list opens from a side panel; on wider screens it stays beside the text | Usability |
| Survey results | [DATA PENDING] | | |

---

Table 23A counts the defects found by each test activity in Sections 4.3 and 4.4, by their highest
severity and what became of them. Severity follows four levels: **critical**, a wrong amount in the
records or lost data; **high**, a wrong amount shown, a core task blocked, or a weakness that could be
exploited; **medium**, a misleading display or a weakness with a workaround; **low**, usability,
appearance or hardening.

**Table 23A.** Defects Found, by Activity, Severity and Disposition

| Activity | Found | Highest severity | Resolved | Open or accepted |
| :--- | --: | :--- | --: | :--- |
| Screen-versus-database audit, 26 and 29 September (Table 9) | 6 | High: a tenant's payments not shown; a voided receipt shown as paid | 6 | None |
| Functional walkthrough, 30 September (Table 10) | 1 | Medium: ₱0 instead of "—" with the connection cut | 0 | 1 open: not reproduced on 1 October; to be tested again on the owner's laptop |
| Testing day on phones, 30 September | 1 | Medium: the "cannot tell whether it was saved" message late on Android | 1 | Mitigated; to be tested again on the same phone |
| Check of the evaluation account, 2 October | 1 | High: online payment refused for an amount owed | 1 | None |
| Security review and outside probe, 2 October | 12 | High, operational: the hosting provider's visitor challenge could block payment notifications | 9 | 3 accepted as low risk: sign-in attempt limits counted per server instance, signing out not revoking a token, a wide connection policy |
| Technical evaluators, 3 October | 14 | Medium: phone, email and photo validation | 14 | None |
| **All activities** | **35** | | **31** | **1 open, 3 accepted** |

No defect found in these activities was critical. The three accepted items are recorded in the
security audit with the reason each was accepted.

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
