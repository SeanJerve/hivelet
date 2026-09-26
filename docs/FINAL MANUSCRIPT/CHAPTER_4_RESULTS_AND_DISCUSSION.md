# 4 RESULTS AND DISCUSSION

> **TEAM NOTE (delete every TEAM NOTE block before pasting into the manuscript).**
> Written 2026-09-26 to replace the template text in the manuscript's Chapter 4, which is still
> Lorem Ipsum. Every number here was read from the live system or from a check run on
> 2026-09-26, and the source is named beside it. Anything marked **[DATA PENDING]** needs data only
> the team can collect (see `TEAM_TASKS_WE_DO_OURSELVES.md`). Do not fill a pending cell from
> expectation. Table and figure numbers continue from Chapter 3 (the last table there is Table 4,
> the Likert scale, and the last figure is Figure 3), because the manuscript numbers them across
> the whole document.

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
  in the system and reported on every verification run, and none has been changed, because only
  the owner's receipt book can say which entry is correct.

These are not errors by the owner. They are what happens when records are kept by hand with
nothing to check them against, and they are the kind of problem the system was built to catch.
The finding that matters most is that the problems did not sit in one area. **Each area kept its
own informal record, and nothing connected one record to another.** This matches the fragmentation
described in Chapter 2 (Ullah et al., 2021; Burke, 2026; Magno et al., 2024).

### 4.1.2 System Requirements

The analysis produced **44 functional requirements** and **49 business rules**. Every requirement
is traced to the part of the system that implements it in a traceability matrix, and every rule
is recorded with its status and evidence in a business rule register. Both documents are checked
automatically for internal consistency on every verification run (Section 4.3.1). Table 6 shows how
each identified gap became a requirement and a module.

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
example, the owner confirmed that there is no grace period on rent, that she sets room rates by
hand (so the system keeps a history of every rate change instead of applying any automatic
increase), and that a tenant does not need an email address to be recorded. **Five questions are
still waiting for her answer** and are listed in Chapter 5 as recommendations.

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
occupants, the move-in date and emergency contacts. When the owner changes a room rate, a database
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
owner's own workbook. There is no grace period, as the owner confirmed.

Cash payments are recorded by the owner with the official receipt number from her receipt book.
The system never makes up a receipt number. Online payments go through Adyen with GCash: a payment
made this way enters a **Pending Verification** state and changes nothing on the tenant's bill
until the owner verifies it. Before the owner records a payment, the system warns her if the same
tenant already has a payment for that month, including one still waiting for verification.

Income and expenses are shown in the same layout as the owner's two workbook sheets and can be
exported as Excel files in that layout. Income is filed under the month the rent is for, not the
day it was paid, so a late payment still counts toward the right month. *Figure 6. Income and
Collections Ledger.* [SCREENSHOT PENDING]

The system does not handle electricity. Every unit has its own meter and the tenant pays the
electric company directly, as the owner confirmed on 18 September 2026.

### 4.2.5 Maintenance Ticketing and Notification Module

A tenant submits a request with a title, description and priority, and follows its status through
to completion. Only the owner can close a request. The system sends in-app notifications to the
tenant when a payment is verified or declined, and to the owner when a payment, enquiry or request
comment arrives. *Figure 7. Maintenance Requests Board.* [SCREENSHOT PENDING]

### 4.2.6 Role-Based Access Control

The system defines four roles (guest, prospect, tenant and administrator) over a named permission
matrix, which is more than the two roles described in Section 2.4. Each of the 55 administrator and
tenant routes declares the permission it requires, and this is checked on every verification run.
Access is also enforced by the database itself: row-level security is enabled on all 22 operational
tables (checked on the live database on 26 September 2026). The two remaining tables are backups
made during data corrections, and no client role has any access to them.

Other security measures in the system:

- Passwords are stored as bcrypt hashes, never as plain text.
- An account locks after repeated failed sign-ins. The lock is checked before the password is
  compared, and it is kept per account so that an attacker cannot avoid it by changing address.
- A new account must change its password at first sign-in, and changing a password ends every
  other session of that account.
- Every administrator action is written to an audit trail that cannot be edited or deleted.
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
The full set was run on 26 September 2026 and **all 20 passed**. Table 8 shows the principal
results.

**Table 8.** Results of Automated Verification (26 September 2026)

| Suite | What it checks | Result |
| :--- | :--- | :--- |
| Endpoint and access control | Every endpoint the client calls, the separation of roles, and the rejection of bad input | 78 of 78 passed |
| Ledger integrity | All 937 income rows against the business rules; room, tenant and occupancy agreement | Passed; 5 receipt anomalies reported for the owner |
| Report reconciliation | The exported Excel reports against the database, month by month | 490 of 490 passed |
| Payment gateway | Signature checking on gateway messages and how each kind of message is recorded | 73 of 73 passed |
| Record relations | That separate records agree with each other (payments with bills, tickets with units) | 26 of 26 passed |
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
- **23 September 2026.** A cash receipt was recorded during testing and voided four minutes later.
  The ledger returned to exactly 937 rows and its previous total, which shows the void path works.
- **23 September 2026.** The client opened the system on a phone and found it hard to use. The
  team measured the problems instead of guessing: a table 518 pixels wide inside a 301-pixel
  screen, edit buttons that did not appear on touch screens, a payment form whose buttons were
  hidden below the screen, and toolbars that overlapped. All were fixed the same day (Section
  4.4.11).

The GCash payment method could not yet be completed end to end. Adyen's test account refuses
GCash payments before a payment is created. The setup has been checked step by step: the payment
session is created, GCash is offered, and the account shows GCash as active. The matter is under
an open support case with Adyen (Case 08657379). The system's own handling of gateway messages is
covered by the 73 passing checks in Table 8.

### 4.3.3 Screen-versus-Database Audit

The automated suites prove that each part of the system is correct on its own. They do not prove
that a screen shows a person what the database holds for that person. On 26 September 2026 a team
member noticed that a tenant's payment history read "Nothing recorded" although the tenant had
seven receipts that year. Every suite had passed, because the screen was correct code reading the
wrong list.

The team therefore audited every owner screen, and the tenant payment screen, directly. [DATA
PENDING: add the remaining tenant screens once audited with a tenant session.] Each figure a screen displayed was compared with
a read-only query of the live database for the same records. The owner's screens were read with
the owner's own session on the live site; where a screen could only be tested locally, it was given
the live figures with every personal detail removed. Nothing was written to the database during the
audit. Table 9 shows the result.

**Table 9.** Results of the Screen-versus-Database Audit (26 September 2026)

| Screen | What was compared | Result |
| :--- | :--- | :--- |
| Owner overview | Collections for each month of 2026, the year's total, occupancy, rent per cluster, expected monthly income, operating and personal costs | Matched to the peso |
| Money coming in | Totals for rent, water and garbage; collections by cluster | Matched, except one figure under review (below) |
| Money going out | Total spent, split by kind and by area | Matched; one layout defect fixed |
| Rooms and rates | Rent and number of occupants for each unit | Matched |
| Tenants | Number of tenants per cluster; move-in dates | Counts matched; one defect fixed |
| Activity (audit trail) | Each recent entry against the recorded action | One defect fixed |
| Repairs, inquiries | Number of open items | Matched |
| Tenant payments | A tenant's receipts for 2026 | One defect fixed |

The audit found five defects that no automated check had caught:

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
5. **A voided receipt still appeared in the tenant's own receipt list.** This one requires a change
   to the server and is scheduled with the development lead.

One figure remains under review. For the Boarding House cluster, the income screen totals the
remitted amount as half the rent plus water, while the database, the Excel export and business rule
BR-038 define it as the full rent plus water. The two sources disagree about the owner's own
workbook, so the figure will be settled against that workbook rather than by choosing one.

The lesson is the same one Section 4.3.1 draws, from the other side: **passing checks show that
what was tested is correct, not that everything is.** Comparing each screen with the records it
claims to show is now part of how the team verifies the system.

### 4.3.4 Functional Walkthrough Testing [DATA PENDING]

A 26-step walkthrough exercises every function that writes data exactly once. It runs against the
one unoccupied unit so that no real tenancy, receipt or expense is touched.

**Table 10.** Results of the Functional Walkthrough [DATA PENDING]

| Step | Function tested | Expected result | Actual result | Pass or fail |
| :--- | :--- | :--- | :--- | :--- |
| 1 | [from TESTING_REHEARSAL.md] | | | |
| ... | | | | |
| 26 | | | | |

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

[DATA PENDING: if the team runs the external security scans in `TEAM_TASKS_WE_DO_OURSELVES.md`,
report their grades here as supporting evidence, with the date and tool name.]

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
| Performance review, 26 Sep 2026 | The payments page loaded the whole payment gateway library for every visitor | The library now loads only when a tenant starts an online payment; the page's own code fell from 209 kB to 17 kB [CONFIRM this change is on the live site before submission] | Performance Efficiency |
| Final review, 26 Sep 2026 | A refused refund could be announced as successful; a receipt could be credited to the wrong tenant | Both corrected, with checks added | Reliability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A tenant's payment history showed no payments | Receipts from the ledger now shown with online payments | Functional Suitability |
| Screen audit, 26 Sep 2026 | Rental and personal expenses shared one column | Separate columns, as in the owner's workbook | Usability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A placeholder date read as every tenant's move-in | Shown as not recorded until the real dates are entered | Reliability |
| Screen audit, 26 Sep 2026 | An opened GCash checkout was listed as a recorded payment | Listed as "GCash payment started" | Security (accountability of the audit trail) |
| Team review, 26 Sep 2026 | The highlighted option in every dropdown was cut off at the sides | Outline drawn inside the option | Usability |
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
| 4. Training and hand-over | The owner and tenants shown how to use the system; user manual (Appendix K) handed over; accounts issued | [DATA PENDING] |
| 5. Full transition | The system becomes the owner's main record once both records agree | [DATA PENDING] |

Three risks are managed deliberately:

- **The records are the owner's real financial records.** A backup is taken before any change to
  the data, and every change is a numbered migration that can be reviewed before it runs.
- **Gateway and database credentials** are kept outside the code, passed between team members
  separately, and never written in any document. A check for committed credentials runs before
  every commit.
- **The five historical receipt anomalies** are reported on every verification run and will be
  corrected only against the owner's receipt book.
