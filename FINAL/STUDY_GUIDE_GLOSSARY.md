# Study guide: the glossary, A to Z

**Every word in the paper, on the screens and in the study guides, explained in plain English.** For
the whole team, before the defense. If a panelist points at a word and you freeze, look it up here.

**How to use it.** Press Ctrl+F and type the word. The glossary has eight sections; within each one
the entries run A to Z. Each entry gives the meaning in one or two sentences, then **Where**: the
chapter, section, table or screen where you will meet it. Ch. means chapter, App. means appendix,
and a name in plain words (for example *Monthly Income screen*) is a screen in the system.

**The paper's own wording wins.** Everything here was read from the final chapters in `FINAL/`, the
appendices, the business rules register, the requirements and the screens as they stood on
24 October 2026. If an entry and a chapter ever disagree, **the chapter is right**: say what the
chapter says, and tell Sean so this page can be fixed. Section 6 of `STUDY_GUIDE_TEAM_REVIEWER.md`
is the short version of this list; the meanings here agree with it.

**Five things to say exactly right, every time.**

- The property has **33 units, 32 of them occupied**.
- The **50% Share** is only ever *a system-computed figure equal to half that row's Rent Amount,
  kept for ledger parity with the owner's historical spreadsheet.* Nothing more.
- **Adyen with GCash** is committed, configured and working, on Adyen's **test account**.
- **Rates are set by the owner by hand.** Only the history of each change is kept; nothing raises a
  rate by itself.
- **Nobody signs in with, or gives, an email** (since 20 October 2026). Sign-in is by **login ID or
  phone number**.

| Section | What is in it |
| :--- | :--- |
| 1 | The property and the business |
| 2 | Words on the screens |
| 3 | Technology |
| 4 | Payments |
| 5 | Method and standards |
| 6 | Statistics |
| 7 | Every BR, FR and NFR code, and the other codes in the paper |
| 8 | Abbreviations, A to Z |

---

## 1. The property and the business

**50% Share.** A system-computed figure equal to half that row's Rent Amount, kept for ledger
parity with the owner's historical spreadsheet. Example: rent ₱8,500, so 50% Share ₱4,250. It is a
computed column, so nobody can type it or change it. On the month card it sits under Rent, labelled
"Half of Boarding House rent", and it is not added to the total received. Say nothing more about it.
**Where:** Ch. 2, Section 2.4; Table 4-5; Table 4-6 (BR-035); Monthly Income and Overview screens.

**Acknowledgement receipt (ACK).** A payment slip the landlady gives that has no invoice number. In
the Record payment form she picks "Acknowledgement receipt" from the invoice list; the ledger and the
Excel workbook show it as ACK. It was added on 1 October 2026, copied from her own practice.
**Where:** Section 4.3.6; Table 4-22, stage 4; App. K, Part 2, §3; Record payment form.

**Administrator.** The role with full rights on the owner's side of the system. Only the landlady
holds it. **Where:** Section 3.3; Table 4-7.

**Advance.** The owner's own word for the deposit. It is the same sum, not extra rent paid ahead.
**Where:** App. M, Table M-19; BR-039.

**Anniversary date.** The day of the month a tenancy's rent runs from. The rent period runs from that
day to the day before it next month. Example: anniversary on the 13th, so rent for 13 August to
12 September. It is recorded once, at move-in. In her old workbook, 402 of 937 income rows (43%) had
none. **Where:** Section 4.1.1; Table 4-6 (BR-033); Tenants screen, Move someone in ("Anniversary
date").

**Available.** A unit status: the unit is free to let. **Where:** App. N (rooms); Rooms and rates
screen; public site.

**Back Apartment.** A cluster of 5 units: B1F, B2F, B2B, B3F and B3B. **Where:** Section 4.1; BR-032.

**Base price.** The rate a unit was first set up with in the system. The rate in use today is the
current price. **Where:** App. N (rooms).

**Bicol University.** The university near the property, and the team's school (BS Information
Technology, College of Science). **Where:** Section 1.4; App. J.

**Bill.** What a tenant owes for one whole month: rent plus water. A bill is raised when it is needed
(for example when a tenant opens the payment screen), not by a timer, and a month's rent is never
cut into parts (prorated). Its status is Pending, Due, Overdue, Paid or Partially Paid. **Where:**
Section 4.2.4; App. N (bills); `STUDY_GUIDE_CODE.md`, §5.

**Billing cycle (billing period).** The month a bill covers, which the anniversary date sets.
**Where:** Table 4-6 (BR-010 to BR-012); App. N (bills).

**Boarding House (BH).** Two meanings. (1) The whole property. (2) Its biggest cluster, the 22 main
rooms 1a to 1h, 2a to 2g and 3a to 3g, called "Boarding House" on every screen and in every workbook.
**Where:** Section 4.1; BR-032; App. K, Part 2.

**Booking inquiry.** The paper's term for a visitor's question about a vacant unit, sent from the
public site and answered by the administrator. On screen it is simply an **inquiry**. **Where:**
Section 2.4; Section 4.2.3.

**Capacity.** The most occupants a unit is meant for. **Where:** App. N (rooms); Ch. 5,
recommendation 4.

**Cash.** The main way tenants pay, in person on site. The landlady records every cash payment;
tenants do not report their own. **Where:** Section 1.4; Section 4.1.2.

**Cash flow monitoring.** Making summaries of income and expenses from the recorded transactions so
the owner can see where money came from and went. **Where:** Section 2.4; Overview screen.

**Centralized system.** One system that holds all the data and processes in one place, instead of
separate files and chats. **Where:** Section 2.4.

**Cluster.** A group of units that the owner's workbook books together. There are five: Boarding
House (22), Back Apartment (5), Front Apartment (3), Penthouse (1) and Linda (2). **Where:**
Section 4.1; BR-032; Monthly Income screen ("Group by: Cluster").

**Collections.** The money received and entered as receipts. The Overview shows "Collections by
month". **Where:** Table 4-9; Overview screen.

**Contact name.** The name as written on a receipt. **Where:** Table 4-5.

**Cumulative total.** An expense category's running total: last month's cumulative plus this month's
total, worked out by the system. **Where:** BR-046; FR-040.

**Deposit.** One month's rent, set once at move-in, equal to the rent in effect then. Example: moved
in at ₱8,500, so deposit ₱8,500. It is held, spent on repairs when the tenant leaves, and the rest
returned; that settling is the owner's own bookkeeping. It is kept out of the remitted amount. Since
13 October 2026 a tenant sees it on their Overview. **Where:** Table 4-6 (BR-039); Section 4.2.2;
Tenants screen; tenant Overview.

**Due date.** The day a bill should be paid, set by the billing cycle. **Where:** Table 4-6
(BR-010).

**Electricity.** Outside the system. Each unit has its own meter and the tenant pays the electric
company directly. Old electricity figures for the Linda units are kept, read-only. **Where:**
Section 4.2.4; BR-015; BR-040.

**Emergency contact.** The person to call if something happens to a tenant. On the tenant's My
details screen it is headed "If something happens to you". **Where:** Section 4.2.2; App. K,
Part 1, §5.

**Expense allocation.** One part of an expense, booked to one property area. Her workbook gave
1,327 of them. **Where:** Section 4.1.1; BR-044.

**Expense category (Kind of expense).** The owner's thirteen built-in kinds of expense: Supplies,
Taxes and Licenses, Janitorial and Messengerial Services, Depreciation, Professional Fees, Salaries
(with three sub-lines), Communication/Light/Water, Repairs and Maintenance, Fuel and Oil, and Others.
She can add her own after them (numbered 11, 12 and so on); none can be renamed or removed.
**Where:** Section 4.1.2; BR-043; Monthly Expenses screen ("Kind of expense").

**Expense entry.** One recorded expense: its date, invoice or supplier, one category, and one or more
allocations. Its total is the sum of its allocations. Example: ₱6,000 to the Boarding House + ₱2,000
to the Main House = ₱8,000. **Where:** Table 4-6 (BR-045); App. N.

**Expected each month.** An Overview figure: the rent plus water of every occupied unit at today's
rates. **Where:** Table 4-9 ("expected monthly income"); Overview screen.

**Fe Galang Da Silva Boarding House.** The client: a 33-unit property at 32 Sampaguita Street,
Barangay 4 Sagpon, Old Albay District, Legazpi City, near Bicol University. **Where:** Section 1.4;
Section 4.1.

**Financial tracking.** Recording and checking tenant payments and expenses in one structured place.
One of the six features. **Where:** Section 2.4; Section 4.2.4.

**Floor.** The building level of a unit: 1 to 3 are residential floors (11, 11 and 10 units) and 4
is the rooftop penthouse (1 unit). **Where:** Section 4.1; App. N (rooms).

**Floor plan.** A drawing of a unit, shown when the unit has no photograph, on the public pages and
on Rooms and rates. **Where:** App. K, Part 2, §6; public site.

**Fragmented workflow.** Work spread over tools that do not talk to each other (spreadsheets, paper,
chat), so data disagrees and follow-up is late. This is the problem the paper names. **Where:**
Section 2.4; Section 4.1.1.

**Front Apartment.** A cluster of 3 units: F1, F2F and F2B. **Where:** Section 4.1; BR-032.

**Full payment.** Tenants are expected to pay the whole bill. A partial payment is the exception,
recorded only when the administrator records an arrangement. **Where:** BR-013; Section 4.3.1.

**Garbage fee (GBG).** A ₱20 fee once kept in the income sheet. **Retired** on 30 September 2026:
removed from the system entirely. It was never part of the remitted amount. **Where:** Table 4-9;
BR-037 (retired).

**Grace period.** There is **none**. A bill is overdue from the day after its due date. The owner
still accepts late payment and follows it up after about a week, but that week does not change when
a bill is overdue. **Where:** Section 4.1.2; Table 4-6; BR-012.

**Income row (income record, receipt).** One recorded payment in the Monthly Income ledger. Her
workbook gave 937. A receipt is filed under the month the rent is for, not the day it was paid.
**Where:** Section 4.1.1; Section 4.2.4; Table 4-5.

**Invoice.** The owner's own numbered paper slip for a payment. Say "invoice", not "OR": the screens
say invoice. **Where:** Section 4.1.1; Section 4.2.4.

**Invoice book.** The paper book in which she writes her invoices. **Where:** Section 4.1.1.

**Invoice number.** The number on her invoice. The system records hers, or none, and never makes one
up. "4726" or "INV 4726" is saved as INV#4726. The same number cannot be used twice for the same unit
and month (among receipts that are not voided). **Where:** Table 4-5; Section 4.2.4; App. K, Part 2,
§3.

**Issue ticketing system.** A structured way for tenants to report a problem, which is then tracked,
assigned and resolved. In the system it is **Repairs**. **Where:** Section 2.4; Section 4.2.5.

**Landlady.** The person who runs the boarding house day to day on behalf of its owner, and the
system's only administrator. **Where:** Section 2.4; Section 3.3.

**Late payment.** Accepted. A late bill is still overdue from the day after its due date. **Where:**
BR-012.

**Ledger.** A record book of money. Hivelet has two, kept in the owner's own layout: **Monthly
Income** and **Monthly Expenses**. **Where:** Section 4.2.4.

**Ledger parity.** Parity means being the same. The system's ledger keeps the same columns as the
owner's historical spreadsheet, so the two can be laid side by side. **Where:** Section 2.4 (50%
Share); Table 4-6.

**Linda (LF and LB).** The cluster of two units, LF and LB. Their water is charged at the same ₱200
per occupant as everyone, but recorded separately as Linda's water and kept out of the remitted
amount; the workbook shows Linda separately. Example: LF with two occupants, ₱400 recorded as Linda's
water; remitted = rent only. **Where:** Table 4-6 (BR-040); Table 4-5; App. K, Part 2, §3.

**Main House.** A property area: the owner's own residence. It is non-rental, so its costs are not
taken from rental income. **Where:** BR-041; App. N (property_areas).

**Monthly Expenses Report.** The second sheet of her workbook, and the screen and Excel workbook that
reproduce it: expenses by date, area and category. **Where:** Section 4.1.1; Section 4.2.4.

**Monthly Income Report.** The first sheet of her workbook, and the screen and Excel workbook that
reproduce it: receipts by month and cluster. **Where:** Section 4.1.1; Section 4.2.4; Figure 4-9.

**Move in (onboarding).** Starting a tenancy: name, unit, move-in date, anniversary date, occupants,
deposit and emergency contact. The system then shows a login ID and a one-time password. **Where:**
Section 4.2.2; App. K, Part 2, §5.

**Move-in date.** The first day of a tenancy. Her workbook never recorded it for the current
tenancies, so the system shows "not recorded" rather than a guess. **Where:** Section 4.1.2;
Section 4.2.2.

**Move out (vacate).** Ending a tenancy. The tenant loses access at once, the unit becomes free, and
every record stays. **Where:** BR-025; App. K, Part 2, §5.

**Net income.** An Overview figure: rent and water collected, less operating costs. Personal spending
is shown beside it and not deducted. **Where:** Overview screen; App. K, Part 2, §2.

**Occupancy.** How many units are occupied: **32 of 33**. **Where:** Section 4.1; Overview screen.

**Occupant.** A person living in a unit. Water is charged per occupant. The count carries forward
from last month until the administrator changes it. **Where:** Table 4-5; BR-034; Record payment
form ("Occupants").

**Occupied.** A unit status: someone lives there under an active tenancy. **Where:** BR-004;
Rooms and rates screen.

**Operating expenses.** Costs of running the rental property, from the four rental areas. **Where:**
Table 4-9; Overview screen ("Operating").

**Other Expenses / Personal.** A property area for the owner's personal costs. Non-rental, so not
deducted from rental income. **Where:** BR-041; App. N.

**Owner.** In Chapter 4, the landlady in her role as the system's administrator. **Where:**
Section 2.4; Section 3.3.

**Partial payment.** Paying part of a bill. Not the normal way; an early defect once lost the rest of
the debt and is now checked on every run. **Where:** BR-013; Section 4.3.1.

**Penthouse (PH).** The one rooftop unit, a cluster and an expense area of its own. In testing it was
the one vacant unit. **Where:** Section 4.1; BR-032; BR-041; Section 4.3.4.

**Personal spending.** Spending booked to the owner's own areas, for example the 2025 renovation of
her house. Shown beside operating costs, never deducted from rental income. **Where:** Section 4.1.2;
Overview screen ("Personal, not deducted").

**Primary contact.** The one person a unit's official messages and payments go through. **Where:**
BR-008; App. N (room_assignments).

**Property area.** One of six parts of the property an expense can be booked to: Boarding House, Main
House, Front Apartment, Back Apartment, Penthouse, and Other Expenses / Personal. **Where:** BR-041;
Table 4-6 (BR-045).

**Prospect.** The record kept of a visitor who sends an inquiry. A prospect has the public's rights
only. **Where:** Section 4.2.6; App. N (profiles).

**Prospective tenant.** A person looking for a room who uses only the public website, with no
account. One took part in the evaluation. **Where:** Section 2.4; Section 3.3.

**Rate (rent rate).** A unit's monthly rent. The owner sets it by hand; a database trigger records
the old rate, the new rate, the date and who changed it. On 20 September 2026 she confirmed every
unit's rate. **Where:** Section 4.1.2; Section 4.2.2; Rooms and rates screen.

**Receipt anomalies.** Five invoice numbers in her historical records that were each used for two
payments. They are kept exactly as she wrote them and listed on every verification run. **Where:**
Section 4.1.1; Table 4-8; Section 4.5.

**Remitted amount.** Rent Amount plus Water Payment, worked out by the system. Example: ₱8,500 +
₱400 = ₱8,900. It leaves out the deposit and Linda's water. **Where:** Table 4-5; Table 4-6
(BR-038); Monthly Income screen ("Remitted, rent + water").

**Rent amount.** The rent received on one income row. **Where:** Table 4-5.

**Rent period ("Rent For").** The dates a payment's rent covers, worked out from the anniversary
date, never typed. **Where:** Table 4-5; Table 4-6 (BR-033).

**Repair request (maintenance ticket).** A tenant's report of something to fix, with a title,
details, how urgent and an optional photo. It is tracked until the owner closes it. **Where:**
Section 4.2.5; Repairs screen.

**Reserved.** A unit status: held for someone. A reserved unit takes no new inquiries. **Where:**
BR-006; Section 4.2.3.

**Resource-constrained environment.** A small operation with little money, little technology and few
staff, which mixes paper and simple digital tools. **Where:** Section 2.4.

**Returning tenant.** A former tenant who comes back; linked to their old record, not made a second
time. **Where:** BR-027.

**Room type.** The kind of unit: Studio, One-bedroom, Two-bedroom or Three-bedroom. The public site
groups units by it. **Where:** App. N (rooms); public site.

**Small-scale apartment management.** Running a boarding house or apartment with few units, little
staff and simple tools. **Where:** Section 2.4.

**Supplier (OR/Supplier column).** The invoice or supplier an expense was paid to, kept beside its
date. **Where:** FR-037; Monthly Expenses screen.

**Tenancy.** One tenant living in one unit, from move-in to move-out. A unit can have only one active
tenancy; the database refuses a second. **Where:** Section 4.2.1; App. N (room_assignments).

**Tenant.** A person renting a unit, who uses their own account to see bills, receipts and repair
requests, and to pay online. **Where:** Section 2.4.

**Tenant history ("Who lived where before").** On the Tenants screen, choosing a past year shows who
paid for each unit then, read from the receipts. It downloads as a workbook. **Where:** App. K,
Part 2, §5.

**Under Maintenance.** A unit status: being repaired, not for letting. **Where:** BR-005; App. N
(rooms).

**Unit.** One rentable room or apartment. The paper says unit; the database table is called rooms.
There are 33. **Where:** Section 4.1; App. N.

**Unit code.** The short name of a unit, as the owner writes it: 1a to 1h, 2a to 2g, 3a to 3g, B1F,
B2F, B2B, B3F, B3B, PH, F1, F2F, F2B, LF and LB. **Where:** BR-032; App. N (rooms).

**USB flash drive.** Where her only copy of the workbook was kept before the system: one file, one
device. **Where:** Section 1.1; Section 4.1.1.

**Visibility (Published, Hidden).** Whether a unit is listed on the public site. It is separate from
the unit's status. **Where:** BR-007; App. N (rooms).

**Water fee (water payment).** ₱200 per occupant per month, for every unit. Example: 2 occupants ×
₱200 = ₱400. It is worked out from the occupants and cannot be typed. **Where:** Table 4-5; Table 4-6
(BR-014); Record payment form.

**Workbook.** Her spreadsheet file with two sheets, Monthly Income and Monthly Expenses. The Excel
downloads from the system are also called workbooks. **Where:** Section 4.1.1; Section 4.2.4.

**Year-to-date total.** The figure at the bottom of her income sheet: everything received so far in
the year. **Where:** Section 4.1.2.

---

## 2. Words on the screens

**"—" (a dash instead of a number).** Shown when a figure could not be loaded, so a missing figure is
never read as ₱0. The one failed test (step 23b) was ₱0 shown here instead. **Where:** Section 4.3.4;
App. K, Part 2, §2; Overview screen.

**Add a new kind… / Add kind.** In Monthly Expenses, how the owner adds her own expense category after
the thirteen. **Where:** App. K, Part 2, §4; BR-043.

**Add a photo.** On a repair request, attach one photo as a JPG or PNG; it is made smaller before
sending. **Where:** App. K, Part 1, §4; Repairs screen.

**Add another expense.** Saves one expense and keeps the form open for the next. **Where:** App. K,
Part 2, §4.

**Add to Home Screen / Install app.** How the app is installed from the browser: Add to Home Screen in
Safari on an iPhone, Install app or Add to Home screen in Chrome on Android. **Where:** Section 4.2.7;
App. K, Part 1, §6.

**All years.** In Monthly Income or Monthly Expenses, the year picker choice that shows everything
since the records began. **Where:** App. K, Part 2, §3.

**Amount due.** On the tenant's Overview, what they owe, counting only payments the landlady has
recorded. **Where:** App. K, Part 1, §2.

**Answered.** An inquiry status: the landlady has replied. **Where:** App. K, Part 2, §8; Inquiries
screen.

**Appearance (System, Light, Dark).** Your initials > Appearance chooses light or dark colours;
System follows the phone or computer. **Where:** App. K, Part 1, §6.

**Bell.** The notifications button at the top; a dot means something is unread. **Where:** App. K,
Part 2, §2.

**By cluster / As a list (Show as).** Two ways to draw a list: grouped by cluster, or as one list.
**Where:** App. K, Part 2.

**Cancel request.** A tenant withdraws a repair request while it is still Submitted. It stays in the
list marked Cancelled; the landlady sees "Cancelled by the tenant". **Where:** Section 4.2.5;
App. K, Part 1, §4.

**Change number / password.** The landlady's window for changing the phone number she signs in with,
or her password. She must type the current number and current password first. **Where:** App. K,
Part 2, §1.

**Clear.** Removes the filters in use. **Where:** App. K, Part 2.

**Close inquiry.** Marks an inquiry settled. **Where:** App. K, Part 2, §8.

**Closed.** A final status for an inquiry, or for a repair the owner has closed. **Where:** App. N;
Inquiries and Repairs screens.

**Covering from / Covering to / Months covered.** In Record payment, the period a payment covers.
Covering from starts the day after the tenant's last recorded period. **Where:** App. K, Part 2, §3.

**Date received.** In Record payment, the day the money was received. **Where:** App. K, Part 2, §3.

**Delete payment.** The button that removes a receipt recorded by mistake. It does not erase it: the
receipt is **voided**, kept with who, when and why, and drops out of the totals. Ch. 5 recommends the
button say Void. **Where:** App. K, Part 2, §3; App. L, A-25; Ch. 5, recommendation 4.

**Delete expense.** Removes an expense from the ledger the same way, by voiding it. **Where:**
App. K, Part 2, §4; Ch. 5, recommendation 4.

**Delete repair / Delete (inquiry).** Removes a repair request or an inquiry for good, after a
confirmation. Ch. 5 recommends keeping them archived instead. **Where:** App. K, Part 2, §7 and §8;
Ch. 5, recommendation 4.

**Done.** On the repairs board and the tenant's Repairs screen, a request that is resolved or closed.
**Where:** Repairs screen.

**Download (Month, Year, All).** Saves a ledger or the tenant history as an Excel workbook in the
owner's layout. The message "Report downloaded" (computer) or "Download started" (phone) confirms
it. **Where:** Section 4.2.4; App. K, Part 2.

**Due / Due soon / Due today / Due now.** On the tenant's rent months, a month that must be paid, soon
or today; Due now is the total due. **Where:** App. K, Part 1, §3.

**Edit / Save changes.** Opens a record to correct it and saves the correction. Every correction is
written to the audit trail. **Where:** App. K, Part 2.

**Filters.** Dropdowns beside the search (cluster, month, year, status, kind). On a phone, tap
Filters to show them. **Where:** App. K, Part 2.

**Green hexagon.** The turning logo shown while the app first loads or reloads. **Where:** App. K,
Part 2.

**Grey outlines.** Placeholder shapes shown while a screen's figures load, so the page never goes
blank. **Where:** App. K, Part 2.

**Group by (Cluster, Unit, Tenant).** In Monthly Income, how the payments are gathered. **Where:**
App. K, Part 2, §3.

**Heads.** A Monthly Income column: the number of occupants. **Where:** Monthly Income screen.

**How they paid.** In Record payment, the payment method. **Where:** App. K, Part 2, §3.

**How urgent.** A repair request's priority: Low, Medium, High or Emergency. **Where:** App. K,
Part 1, §4; BR-021.

**In progress.** A repair the owner has started. **Where:** Section 4.2.5; Repairs screen.

**Inquire now / Send inquiry.** The public site's buttons for asking about a unit. **Where:**
Section 4.2.3; public site.

**Invoice or acknowledgement receipt (if any).** The Record payment field for her invoice number, or
the choice "Acknowledgement receipt", or blank. **Where:** App. K, Part 2, §3.

**Log a repair.** The owner records a repair she was told about in person, even for an empty unit.
**Where:** Section 4.2.5; App. K, Part 2, §7.

**Login ID.** A tenant's short sign-in name, such as HV-48213, shown when they are moved in and on
their record. **Where:** App. K, Part 1, §1; Tenants screen.

**Login ID or phone number.** The label of the sign-in box. An email is refused. **Where:** Sign-in
screen.

**Manage this repair.** Opens a repair to reply, send a technician, move it on or mark it resolved.
**Where:** App. K, Part 2, §7.

**Mark all read.** Marks every notification read. **Where:** App. K, Part 2, §2.

**Mark resolved.** The owner marks a repair done; the tenant is notified. **Where:** App. K, Part 2,
§7.

**Monthly Expenses (screen).** The owner's expense ledger, by property area, in her layout. **Where:**
Section 4.2.4; side menu.

**Monthly Income (screen).** The owner's income ledger, by cluster, in her layout, with Record payment
and To verify. **Where:** Section 4.2.4; Figure 4-9; side menu.

**Months paid / Paid in these months.** On the tenant's rent months, how many months and which months
are paid. **Where:** App. K, Part 1, §3.

**Most urgent first.** The repairs board's default order. **Where:** App. K, Part 2.

**Move someone in/out; Move them in; Move them out.** The Tenants buttons that start and end a
tenancy. Move them in also appears on an inquiry, with the details filled in. **Where:** App. K,
Part 2, §5 and §8.

**Moved in.** An inquiry status: the visitor became a tenant. **Where:** App. K, Part 2, §8.

**My details.** The tenant's screen for their phone number and emergency contact. **Where:** App. K,
Part 1, §5.

**Needs a connection.** Shown on buttons that cannot work offline. **Where:** App. K, Part 2, §10.

**Needs your attention.** The Overview tile counting payments to verify and urgent repairs. **Where:**
App. K, Part 2, §2.

**No connection · Transactions unavailable.** The thin bar shown at the top when the device is
offline. **Where:** App. K, Part 1, §6.

**Not accepted.** What a tenant sees for a GCash payment the landlady rejected. **Where:** tenant
Overview and Payments screens.

**Not due yet.** A month whose rent is not yet due. **Where:** App. K, Part 1, §3.

**Not entered.** A month with no receipt recorded yet. It does **not** mean owed: the records alone
cannot tell an unpaid month from one not yet entered. Say "Not entered", never "unpaid". **Where:**
Section 4.2.4; App. K, Part 1, §3.

**Not recorded.** Shown for a move-in date the owner's workbook never had. **Where:** Section 4.2.2.

**Nothing yet.** A pale, empty month before the tenant moved in. **Where:** App. K, Part 1, §3.

**One-time password (starting password).** The first password the landlady gives a tenant in person.
It is shown once; at first sign-in the tenant must choose their own. **Where:** Section 3.4;
App. K, Part 1, §1, and Part 2, §5.

**Order.** How a list is arranged: by unit, by name, newest or oldest first. **Where:** App. K,
Part 2.

**Overview.** The first screen after sign-in, for the owner and for each tenant. **Where:**
Figure 4-11; App. K.

**Paid / Paid up to / Up to date.** On the tenant's rent months: a paid month; the date their recorded
payments reach; and a tenant with nothing due. **Where:** App. K, Part 1, §3.

**Pay with GCash.** The tenant's button to pay a bill online. It is hidden when offline. **Where:**
Section 4.2.4; App. K, Part 1, §3.

**Payment record.** The tenant's list of every payment recorded for their unit. **Where:** App. K,
Part 1, §3.

**Payments and billing.** The tenant's screen for rent, months and payments. **Where:** side menu
(tenant).

**Pull down to reload.** In the installed app, pulling a page down reloads it. **Where:** App. K,
Part 1, §6.

**Received / Where it came from; Spent / Where it went.** The month card and the year beside it, on
Monthly Income and Monthly Expenses. **Where:** App. K, Part 2, §3.

**Recently (Your recent actions).** The last three things you did, in the side menu or under the
greeting. Only you see your own. **Where:** App. K, Part 1, §2.

**Record expense.** Opens the form for a new expense. **Where:** App. K, Part 2, §4.

**Record it / Record it anyway.** The last button of Record payment. It reads Record it anyway when
the unit already has a payment for that period. **Where:** `STUDY_GUIDE_TEAM_REVIEWER.md`, §5;
Record payment form.

**Record payment.** Opens the form for a cash payment. **Where:** Section 4.2.4; App. K, Part 2, §3.

**Reference code.** A short code a visitor gets after sending an inquiry. With their phone number it
opens their conversation. **Where:** Section 4.2.3; App. K, Part 2, §8.

**Reject.** The owner refuses a GCash payment; it never reaches the ledger. **Where:** Section 4.2.4;
App. K, Part 2, §3.

**Remitted (rent + water).** The Monthly Income column and total for rent plus water. **Where:**
Monthly Income screen; BR-038.

**Repairs (board).** The owner's board of repair requests in three columns: To dispatch, In
progress, Done. **Where:** Figure 4-10; side menu.

**Reset password.** The owner gives a tenant a new one-time password; the old one stops working and
their phone is signed out. **Where:** App. K, Part 2, §5.

**Rooms and rates.** The owner's screen of every unit's rate and status. **Where:** Figure 4-7; side
menu.

**Search.** Narrows a list as you type. **Where:** App. K, Part 2.

**See it in Monthly Income.** After saving a payment, opens that month with the payment marked.
**Where:** App. K, Part 2, §3.

**Send reply.** Sends the owner's answer on an inquiry. **Where:** App. K, Part 2, §8.

**Send request.** Sends a tenant's repair request. **Where:** App. K, Part 1, §4.

**Send technician.** Records who was sent to do a repair. **Where:** App. K, Part 2, §7.

**Sharing the unit (Living alone, With roommates).** In the Tenants form, whether the tenant has
roommates and how many. **Where:** Tenants screen.

**Show 8 more / Show all / Show fewer.** Open or close more of a long list. **Where:** App. K, Part 2.

**Show each month as a list.** Shows the tenant's months as a table with the receipt for each.
**Where:** App. K, Part 1, §3.

**Sign in / Sign out.** Start and end a session. Signing out also removes the offline copy.
**Where:** App. K, Part 1, §1 and §7.

**Split across another area.** Splits one expense across more than one property area; the parts must
add up to the total. **Where:** App. K, Part 2, §4; BR-044.

**Standing (Living here, Moved out).** In the Tenants edit window, whether the tenant still lives
there. **Where:** Tenants screen.

**Still to pay.** On the tenant's Overview, the part still owed. **Where:** tenant Overview screen.

**Submitted.** A repair request just sent, not yet started. **Where:** App. N (maintenance_tickets);
tenant Repairs screen.

**Tenants (screen).** The owner's screen for moving tenants in and out, editing them and resetting
passwords. **Where:** side menu.

**The activity record.** The audit trail. Since 1 October 2026 it is kept in the database and not
shown in the app. **Where:** App. K, Part 2, §9; Table 4-9 ("Activity").

**To dispatch.** A repair waiting for someone to be sent. **Where:** Repairs screen.

**To verify (Payments to verify).** The list of GCash payments waiting for the owner's check.
**Where:** App. K, Part 2, §3; Monthly Income screen.

**Total handed over.** In Record payment, the total the tenant gave: rent plus water for the months
covered. **Where:** Record payment form.

**Units by cluster.** An Overview tile counting units in each cluster. **Where:** App. K, Part 2,
§2.

**Verify.** The owner confirms a GCash payment arrived; only then does it count. **Where:**
Section 4.2.4; Monthly Income screen.

**Waiting for an answer.** An inquiry status: not yet answered. **Where:** App. K, Part 2, §8.

**Waiting for verification ("waiting").** What a tenant sees for a GCash payment the landlady has not
yet verified. **Where:** App. K, Part 1, §3.

**"We cannot tell whether it was saved."** Shown when a save gets no answer within about 45 seconds;
check the list before sending it again. **Where:** Section 4.3.6; App. K, Part 2, §10.

**Year picker (2026 ⌄).** Beside the page name, chooses another year; a past year can be read but not
added to. **Where:** App. K, Part 2, §2 and §3.

**"Your inquiry" page.** The visitor's private page for an inquiry, where the owner's answer appears
and they can write back. **Where:** Section 4.2.3; `STUDY_GUIDE_TEAM_REVIEWER.md`, §5.

---

## 3. Technology

**404 (Not Found) and 403 (Forbidden).** Web answers meaning "no such thing" and "not allowed". A
tenant asking for another tenant's repair gets 404, so they learn nothing about it. **Where:**
Section 4.4.4; App. M, Table M-1, step 17.

**A+ grade.** The top grade given by the three outside security scanners. **Where:** Section 4.4.4.

**Access control.** Deciding who may use which function. **Where:** Section 4.2.6; Table 4-8.

**AI coding assistant.** A program that writes code from instructions. Much of Hivelet's code was
generated this way at the team's direction, then reviewed and verified. **Where:** Section 3.1.1;
`STUDY_GUIDE_CODE.md`, §9.

**API (application programming interface).** The set of addresses the screens call on the server to
read or save data. Hivelet's is one Express program. **Where:** Section 4.2.1; Figure 4-2.

**Audit trail (audit log).** A permanent record of who did what and when, with values before and
after. The application can add to it but cannot edit, delete or empty it. **Where:** Section 4.2.6;
App. N (audit_logs); NFR-009.

**Automated browser.** A program that drives a web browser by itself, used for the offline, load and
accessibility tests. **Where:** Section 3.2.4; Section 4.3.6.

**Backend.** The server program that applies the rules and talks to the database (Express). **Where:**
Section 3.2.3; Table 4-4.

**Backup.** A copy of all records, taken before any change to the data. **Where:** Section 4.5;
Ch. 5, recommendation 2.

**Backup tables.** Three extra tables kept from data corrections; why App. N lists 24 tables and the
ERD 21. **Where:** App. N; Section 4.2.1.

**bcrypt.** A way to store passwords as one-way hashes, slow to guess on purpose (cost 12 in
Hivelet). **Where:** Section 4.2.6; App. N (profiles).

**Breached password check.** A new password is refused if it appears in a public list of leaked
passwords (Have I Been Pwned). Only the first five characters of the password's hash leave the
server (k-anonymity). **Where:** Section 4.2.6; `STUDY_GUIDE_CODE.md`, §4.

**Browser matrix.** The list of devices and browsers tried: 5 of 5 combinations worked. **Where:**
Table 4-18; App. L, Part CO.

**Cache.** Files or data kept on the device so they open without downloading again. **Where:**
Section 1.4; Section 4.2.7.

**Check suite (automated verification).** A script that checks the live system without writing to
it. There were 20 on 29 September 2026; a 21st, for simultaneous saves, was added on 12 October.
**Where:** Section 3.2.4; Section 4.3.1; Table 4-8.

**Client.** The part that runs on the user's device, here the PWA in the browser. **Where:**
Table 4-4.

**Code base.** All of a system's source code. One code base served the laptop, Android and iPhone.
**Where:** Section 4.2.7.

**Column.** One field of a database table, such as rent_amount. **Where:** Table 4-5; App. N.

**Commit.** One saved change in the code's history, with its author, date and reason. **Where:**
App. M, Table M-19; App. Q.

**Content Security Policy (CSP).** A rule the site sends to browsers listing where scripts may come
from, so an injected script is blocked. Hivelet's is enforced. **Where:** Section 4.4.4.

**Context diagram.** A data flow diagram showing the whole system as one process, with the four
outside parties and the data between them. **Where:** Figure 4-3; App. D.

**Cookie.** A small value a website keeps in the browser. Ch. 5 recommends keeping the sign-in token
in a cookie no script can read. **Where:** Ch. 5, recommendation 3.

**Credentials.** Secret keys and passwords for the gateway and database. Kept outside the code and
never written in any document; a check for them runs before every commit. **Where:** Section 4.5.

**Crow's Foot notation.** The way the ERD draws relationships, with a three-pronged end for "many".
**Where:** Figure 4-6.

**Data dictionary.** A list of every table and column with its type, whether it is required, and its
meaning. **Where:** Table 4-5; App. N.

**Data flow diagram (DFD).** A diagram of processes, data stores and outside parties, and the data
moving between them. Level 1 has eight processes; child diagrams open four of them. **Where:**
Figure 4-4; App. E; App. F.

**Data store.** In a DFD, a place data is kept, such as D3, Bills and receipts. **Where:**
Section 4.2.1.

**Database.** Organized, stored data. Hivelet's is PostgreSQL on Supabase. **Where:** Section 3.1.1.

**Database function.** A program stored in the database that does several writes as one, all or
nothing. Example: record_income_for_months saves a three-month receipt as three rows together.
**Where:** `STUDY_GUIDE_CODE.md`, §5 and §7.

**Demonstration copy.** The same software on a separate database with sample data, used by four
technical evaluators so no outsider saw the owner's records. **Where:** Section 3.3; Section 4.4.1.

**Deploy (deployment).** Putting a new version on the live site. Every approved change deploys
automatically from the main code branch. **Where:** Section 3.2.5; Section 4.5.

**Endpoint (route).** One address on the API, such as POST /admin/income-records. 55 administrator
and tenant routes are checked against the permission matrix. **Where:** Section 4.2.6; Table 4-8.

**Entity-relationship diagram (ERD).** A diagram of the database tables and how they link: 21 tables
and 37 foreign keys. **Where:** Figure 4-6; App. H.

**Enumeration (enum).** A column that accepts only a fixed list of values, such as Verified, Pending
Verification or Rejected. **Where:** Table 4-5; App. N.

**Excel export (.xlsx).** A download of a ledger as an Excel file in the owner's layout. **Where:**
Section 4.2.4; NFR-010.

**Express (Express.js).** The framework the backend is written with, on Node.js. Version 4.19.
**Where:** Table 3-1; Table 4-4.

**Foreign key (FK).** A column that points to a row in another table, such as room_id pointing to a
unit. **Where:** Table 4-5; Figure 4-6.

**Frontend.** The screens in the browser (Vue). **Where:** Section 3.2.3.

**Generated (computed) column.** A column the database works out from other columns and that nobody
can write, such as the 50% Share and the remitted amount. **Where:** Section 4.2.1; Table 4-5.

**Hash.** A one-way scrambled form of a secret. It can be checked but not turned back. **Where:**
Section 4.2.3; Section 4.2.6.

**Headless browser.** A browser run by a program with no window, used in automated tests. **Where:**
App. L, Part N.

**Hosting.** Running the system on a provider's computers at a public address. Hivelet uses Vercel
and Supabase. **Where:** Section 3.2.5; Table 4-21.

**HTTPS.** The secure, encrypted form of the web's protocol. The site forces it. **Where:**
Section 4.4.4.

**Install (installed app).** The PWA added to a phone's home screen from the browser; it opens in its
own window. **Where:** Section 4.2.7.

**JSON.** A plain text format for data sent between the screens and the server. **Where:**
`STUDY_GUIDE_CODE.md`, §1.

**JWT (sign-in token).** A signed token the server gives at sign-in and the browser sends with every
request. It is kept in the browser's storage, one of two named weaknesses. **Where:** Section 4.4.4;
`STUDY_GUIDE_CODE.md`, §4.

**Layout shift (CLS).** How much a page jumps while it loads. The owner's Overview measured 0.22.
**Where:** Section 4.3.5; Ch. 5, recommendation 5.

**Largest element drawn (LCP).** How soon the main content of a page appears: 3.4 to 3.6 seconds for
the public page on an emulated phone. **Where:** Section 4.3.5.

**Lighthouse.** Google's tool for scoring a page's speed, accessibility and practices. **Where:**
Section 4.3.5; Table 4-19.

**Live updates.** Each open page asks the server every 2 seconds whether anything changed, and reloads
only what did. **Where:** `STUDY_GUIDE_CODE.md`, §6.

**Load test.** Sending many requests at once to see if the system copes: 12 simulated users on the
public pages and 6 on the owner's records, 0 of 1,085 and 285 requests failed. **Where:**
Section 4.3.6; App. M, Table M-25.

**Lockout.** After five wrong passwords an account locks for 15 minutes. **Where:** Section 4.2.6.

**Manifest.** A small file that names the app and its icons so a browser can install it. **Where:**
Section 2.1.5; Section 4.2.7.

**Middleware.** Code that runs before every route, such as checking who is signed in. **Where:**
`STUDY_GUIDE_CODE.md`, §2.

**Migration.** A numbered file that changes the database, reviewed before it runs; nothing is changed
by hand. There were 81 by October 2026. **Where:** Section 4.2.1; Section 4.5; App. Q.

**Mozilla HTTP Observatory.** An outside scanner of a site's security settings; it graded Hivelet A+
(12 of 12 tests). **Where:** Section 4.4.4.

**Node.js.** The program that runs JavaScript (and so Express) on a server. **Where:** Table 3-1.

**Offline copy.** A read-only copy of the figures, names and notifications a person last loaded, kept
on their own device and removed at sign-out. **Where:** Section 4.2.7.

**Offline use.** The installed app opens with no connection and shows the offline copy; paying and
recording need a connection. **Where:** Section 1.4; Section 4.3.6.

**PageSpeed Insights.** Google's web page speed test; it scored the public page 85 to 88 and 100 for
accessibility. **Where:** Section 4.3.5.

**Permission matrix.** One table in the code that says which role may use which function. **Where:**
Section 4.2.6; Table 4-7.

**Phone emulation.** Making a computer browser act like a phone's screen and speed. **Where:**
Section 4.3.6.

**PostgreSQL.** The database system, version 17.6. **Where:** Table 3-1; Section 3.1.1.

**Primary key (PK).** The column that identifies each row, such as id. **Where:** Table 4-5.

**Progressive Web Application (PWA).** A website that installs from the browser and opens in its own
window, with a service worker and a manifest; no app store. **Where:** Section 2.4; Section 4.2.7.

**Prototype (in code).** A working early version of a screen. Hivelet's screens were prototyped
directly in Vue and Tailwind, not in a drawing tool. **Where:** Section 3.1.1; Section 3.2.2.

**Qualys SSL Labs.** An outside scanner of a site's encrypted connection; it graded Hivelet A+.
**Where:** Section 4.4.4.

**Rate limit.** A cap on how many requests one address may send, so the public form cannot be
flooded. **Where:** `STUDY_GUIDE_CODE.md`, §4; App. K, Part 2, §12.

**Repository.** The folder of code with its full history (Git). **Where:** App. Q.

**Request handler.** The code that answers one route. 71 were reviewed for security; 154 of 204
database calls sit inside them. **Where:** Section 4.4.4; Section 4.4.3.

**Responsive design.** Screens that adapt to the device; tables on a computer become cards on a
phone. **Where:** Section 4.2.7.

**Role-based access control (RBAC).** Each role (visitor, tenant, administrator) may use only its own
functions. **Where:** Section 2.4; Section 4.2.6.

**Row.** One record in a table, such as one receipt. **Where:** App. N.

**Row-level security (RLS).** The database itself refuses to return rows a request may not see. It is
on for every table. **Where:** Section 3.1.1; Section 4.2.1.

**Salt.** Random data mixed into each password before hashing, so two equal passwords look different.
**Where:** Section 4.2.6.

**Screen-versus-database audit.** Comparing every figure on screen with a direct query of the
database for the same records. It found six defects the suites missed. **Where:** Section 4.3.3.

**Second sign-in factor.** A second proof at sign-in, such as a code on a phone. Hivelet has none, a
named weakness. **Where:** Section 4.4.4; Ch. 5, recommendation 3.

**Security advisor (Supabase).** Supabase's built-in check of a database's settings; no warning on
5 October 2026. **Where:** Section 4.4.4.

**Security headers.** Settings sent with every page (force HTTPS, no framing). Graded A+ by
securityheaders.com. **Where:** Section 4.4.4.

**Server.** A computer, or program, that answers requests. **Where:** Figure 4-2.

**Service module.** A file holding the rules for one kind of record. Ch. 5 recommends moving the
database work out of the handlers into these. **Where:** Ch. 5, recommendation 6.

**Service worker.** A small program the browser keeps that stores the app's files on the device, so it
opens fast and offline (about 1.2 MB). **Where:** Section 4.2.7; App. M, Table M-24.

**Session.** The time from sign-in to sign-out, or one checkout with Adyen. **Where:** Section 4.4.4.

**SHA-256.** A standard hash. The secret in an inquiry's private link is stored only as its SHA-256.
**Where:** App. N (inquiries).

**Simultaneous saves.** The same request arriving twice at once (a double click, a retry). The
database keeps one and refuses the rest. **Where:** Section 4.3.6; App. M, Table M-26.

**Simulated users.** Scripts acting as visitors in the load test, not real people. **Where:**
Section 4.3.6.

**Slow 3G / slow 4G / throttling.** Making a connection slow on purpose to test a weak signal.
**Where:** Section 4.3.5; App. L, Part O.

**Supabase.** The service that hosts the PostgreSQL database. **Where:** Table 3-1; Table 4-4.

**Table.** A set of rows of one kind, such as rooms or payments. 24 in App. N. **Where:** App. N.

**Tailwind CSS.** The styling tool for the screens, version 4.0. **Where:** Table 3-1.

**Timeout.** A limit on waiting: a page gives up after 25 seconds, a save after 45. **Where:**
Section 4.3.6.

**Traceability matrix.** A table linking each requirement to the part of the system that meets it.
**Where:** Section 4.1.2.

**Trigger.** Code in the database that runs by itself when a row changes. One records every rate
change; one keeps an expense's total equal to its parts. **Where:** Section 3.1.1; Section 4.2.2.

**TypeScript.** JavaScript with types, so a wrongly shaped record is caught before the code runs.
Used on both sides. **Where:** Section 3.1.1.

**Unique index.** A database rule that refuses two rows with the same value, such as one invoice
number per unit and month. **Where:** Section 4.3.6; `STUDY_GUIDE_CODE.md`, §5.

**User authentication.** Checking who a user is before letting them in. **Where:** Section 2.4.

**UUID.** A long random identifier given to each row. **Where:** Table 4-5.

**Validation.** Checking every input (money, dates, phone numbers) before it is used. **Where:**
Table 4-19; `STUDY_GUIDE_CODE.md`, §4.

**Vercel.** The cloud host that serves the application at hivelet.vercel.app. **Where:**
Section 3.2.5; Table 4-4.

**Visitor challenge.** The hosting provider's bot check, which could have blocked payment
notifications; found on 2 October 2026 and resolved. **Where:** Table 4-20.

**Visual Studio Code.** The code editor used. **Where:** Table 3-1.

**Vite (vite-plugin-pwa).** The build tool for the frontend, version 5.4, and its plugin that makes
the PWA. **Where:** Table 3-1; Table 4-4.

**Vue 3.** The framework the screens are built with, version 3.5. **Where:** Table 3-1.

**Web Content Accessibility Guidelines.** See WCAG in Section 5.

**Webhook.** Adyen calling Hivelet's server to report a payment. See Section 4. **Where:**
`STUDY_GUIDE_CODE.md`, §5.

**Yourdon-DeMarco notation.** The drawing style of the data flow diagrams: circles for processes,
open boxes for stores. **Where:** Section 4.2.1.

---

## 4. Payments

**Acquirer account.** The account at Adyen's side that accepts GCash payments. A misconfigured one
refused payments at first; Adyen support replaced it (Case 08657379). **Where:** Section 4.3.2.

**Adyen.** The payment gateway through which a tenant may pay a bill with GCash. It runs on Adyen's
test account, and each payment it reports is recorded as pending until the owner verifies it.
**Where:** Section 2.4; Table 4-4.

**Adyen Online / Bank Transfer / Cash / GCash.** The four payment methods a record can carry.
**Where:** Table 4-5.

**Adyen Web Drop-in / API Library.** Adyen's ready-made payment window (6.44) and its server library
(32.0). **Where:** Table 3-1; Table 4-4.

**Authorization.** The payment provider's approval of a payment. **Where:** Section 4.3.2.

**Checkout.** Opening a payment on a bill. A bill is held for 15 minutes, so a second checkout is
refused; an abandoned one frees the bill after that. **Where:** Section 4.3.6; App. M, Table M-26.

**Correction (financial).** Changing a recorded payment; the old and new values go to the audit
trail. **Where:** BR-018; FR-017.

**Duplicate guard.** The database refuses the same invoice number twice for one unit and month, and
the same gateway reference twice. Receipts with no number and ACKs are not covered. **Where:**
Section 4.2.1; Section 4.3.6.

**GCash.** A Philippine mobile wallet, offered as the optional online way to pay a bill. **Where:**
Section 2.4.

**HMAC signature.** A code Adyen adds to each notification using a shared secret key, so a forged
message is refused. 73 of 73 gateway checks passed. **Where:** Table 4-8; `STUDY_GUIDE_CODE.md`, §5.

**Live account.** Adyen's real-money mode. Moving from test to live is Ch. 5, recommendation 3.
**Where:** Ch. 5, recommendation 3.

**Local cashier page.** A built-in checkout page used only in development. The server refuses it
whenever Adyen is configured, as it is on the live site. **Where:** `STUDY_GUIDE_CODE.md`, §5.

**Merchant account.** The business's account with Adyen. **Where:** Table 4-21.

**Optional online payment feature.** Paying a bill with GCash through Adyen, beside cash, not instead
of it. A payment enters a pending state and settles only when the administrator verifies it.
**Where:** Section 2.4; Section 1.4.

**Payment gateway.** The service that takes an online payment and reports it: Adyen. **Where:**
Section 1.4; Table 4-4.

**Payment source.** Where a payment came from: on-site cash, or online through Adyen with GCash.
**Where:** App. N (payments).

**Pending Verification.** A GCash payment that arrived but does not count until the landlady verifies
it. It changes nothing on the tenant's bill. **Where:** Section 4.2.4; Table 4-5.

**Reconciliation.** Matching two records. Report reconciliation (490 of 490) matched the Excel files
to the database; reconciliation against bank records is excluded. **Where:** Section 1.4; Table 4-8.

**Refund.** Returning money. Excluded from the system; made from Adyen's own dashboard. **Where:**
Section 1.4; Ch. 5, recommendation 3.

**Rejected.** A verification status: the owner refused the payment; the tenant sees "Not accepted".
**Where:** Table 4-5.

**Settle.** When a payment is verified, the bill is marked paid and the receipt written, in one step.
**Where:** `STUDY_GUIDE_CODE.md`, §5.

**Test account.** Adyen's account where payments run end to end but no real money moves. Hivelet's
gateway runs on it. **Where:** Section 2.4; Section 4.3.2.

**Transaction reference (gateway reference).** Adyen's own number for an online payment; it can never
be recorded twice. **Where:** Table 4-5.

**Verification queue.** The owner's list of payments to verify (To verify). **Where:** Section 4.3.2;
App. L, A-34.

**Verified.** A verification status: the owner confirmed the payment; it counts as paid. **Where:**
Table 4-5.

**Void.** Cancelling a receipt while keeping it, with who, when and why. It drops out of the totals
but is never deleted. **Where:** Table 4-5; Section 4.3.2.

**Webhook (notification).** Adyen calling Hivelet's server to report a payment. Its address serves
the live site. The message is checked by HMAC, then recorded as Pending Verification. **Where:**
Section 4.2.1; `STUDY_GUIDE_CODE.md`, §5.

---

## 5. Method and standards

**Acceptance testing (UAT).** Intended users doing their own tasks on the live system, to decide if it
meets their needs. **Where:** Section 2.4; Section 4.3.7.

**Agile.** Building in short iterations, each with requirements, design, development, testing,
deployment and review, and changing course on feedback. **Where:** Section 3.2; Figure 3-1.

**Axe-core.** The tool that scanned the screens against WCAG A and AA: 76 scans of 19 screens, no
violation once one defect was fixed. **Where:** Section 4.3.6; Table 3-6.

**Characteristic.** One of the eight quality areas in ISO/IEC 25010:2011 (the next eight entries).
**Where:** Section 3.3; Table 3-6.

**Compatibility.** Working with other products and exchanging data correctly (4.55). **Where:**
Table 4-17.

**Functional Suitability.** Doing the needed functions, correctly (4.79). **Where:** Table 4-17.

**Maintainability.** How easily the system can be changed and checked (4.32, lowest). **Where:**
Table 4-17; Section 4.4.3.

**Performance Efficiency.** Speed and use of resources under load (4.48). **Where:** Table 4-17.

**Portability.** Moving to other devices and installing easily (4.86, highest). **Where:**
Table 4-17.

**Reliability.** Working when needed and coping with faults (4.61). **Where:** Table 4-17.

**Security.** Protecting data and proving who did what (4.68). **Where:** Table 4-17; Section 4.4.4.

**Usability.** How easily people learn and use it (4.42). **Where:** Table 4-17; Section 4.4.3.

**The 31 sub-characteristics of ISO/IEC 25010:2011** (Table 3-6 names what measured each one):

| Sub-characteristic | Plain meaning | Measured by |
| :--- | :--- | :--- |
| **Functional completeness** | The functions cover every task needed | Traceability; walkthrough |
| **Functional correctness** | The results are right | Suites; screen-versus-database audit; walkthrough |
| **Functional appropriateness** | The functions make the tasks easy | Acceptance test |
| **Time behaviour** | How fast it answers | Response times |
| **Resource utilization** | How much it uses (data, files) | Lighthouse; download size |
| **Capacity** | How much it handles at once | Simultaneous-user test |
| **Co-existence** | Works beside other apps without harm | Rated only |
| **Interoperability** | Exchanges data with other systems correctly | Browsers; gateway; exports |
| **Appropriateness recognizability** | Users can tell what it is for | Acceptance test |
| **Learnability** | Easy to learn | Acceptance test |
| **Operability** | Easy to operate | Acceptance test |
| **User error protection** | Guards against mistakes | Walkthrough |
| **User interface aesthetics** | Pleasant to look at | Not evaluated |
| **Accessibility** | Usable by people with disabilities | Axe-core scans |
| **Maturity** | Reliable in normal use | Defect log |
| **Availability** | There when needed | Rated only |
| **Fault tolerance** | Keeps working despite faults | Offline and weak-connection tests |
| **Recoverability** | Gets data and state back after a failure | Live use; offline tests |
| **Confidentiality** | Only authorized people see data | Walkthrough; manual checks; code review |
| **Integrity** | Data cannot be changed without permission | Gateway signatures; code review |
| **Non-repudiation** | Actions can be proven to have happened | Audit trail |
| **Accountability** | Actions can be traced to who did them | Audit trail |
| **Authenticity** | Identity can be proven | Manual checks; outside scans |
| **Modularity** | Built of separate parts | Permission matrix check |
| **Reusability** | Parts can be used elsewhere | Not evaluated |
| **Analysability** | Easy to find what a change affects | Migration history |
| **Modifiability** | Easy to change without breaking | Configurable settings |
| **Testability** | Easy to test | Automated verification |
| **Adaptability** | Fits other devices and screens | Screen widths; devices |
| **Installability** | Easy to install | Installation tests |
| **Replaceability** | Can replace the old tool | Export in her layout |

**Check suite results (Table 4-8).** See Check suite in Section 3. **Where:** Section 4.3.1.

**Conceptual framework (IPO model).** Input (objectives, literature, interviews, workflows), Process
(the Agile cycle and the modules), Output (the system, reports, results, manuscript, manual), with
feedback across all three. **Where:** Section 2.3; Figure 2-2.

**Consent (informed consent).** Each tester agreed in writing before taking part. **Where:**
Section 3.4; App. P.

**Course standard (90%).** The course's pass mark for testing: at least 90% of tests passed with no
critical defect open. Hivelet: 98.8%. **Where:** Table 4-12; Table 4-13.

**Data Privacy Act of 2012 (RA 10173).** The Philippine law on personal data the study followed.
**Where:** Section 3.4.

**Defect.** Something that does not work as it should. 35 found, 32 resolved, 3 accepted, 0 critical.
**Where:** Table 4-20.

**Defect log.** The list of defects found during testing. **Where:** Section 3.3.

**Deliberate faults (mutation testing).** Breaking the code on purpose to prove a check fails; four
did for the 21st suite. **Where:** Section 4.3.6.

**Deployment plan.** Five stages: environment, record transfer, pilot use, training and hand-over,
full transition (not yet). **Where:** Table 4-22.

**Disposition.** What became of a defect: resolved, or accepted. **Where:** Table 4-20.

**Facilitator / observer.** In the user test, one person read the tasks; another filled the
observation sheet. **Where:** Section 3.3.

**Gantt chart.** A bar chart of the schedule. **Where:** App. C.

**Help order (prompt, hint, demonstration).** When a tester was stuck: a neutral prompt after about 30
seconds, then a hint, then a demonstration. After the prompt counts as without help; after a hint,
with help; a demonstration, not completed. **Where:** Section 3.3.

**Iteration.** One pass round the Agile cycle. Three: Construction (24 Jul to 28 Aug 2026),
Verification (12 to 14 Sep), Consolidation and testing (15 Sep to the defense). **Where:**
Section 4.2.1; App. M, Table M-19.

**ISO/IEC 25000 (SQuaRE).** The family of quality standards that 25010, 25022, 25023 and 25040 belong
to: Systems and software Quality Requirements and Evaluation. **Where:** Section 3.3.

**ISO/IEC 25010:2011.** The software quality model: eight characteristics, 31 sub-characteristics,
plus a model of quality in use. **Where:** Section 2.4; Section 3.3.

**ISO/IEC 25010:2023.** The revision: Usability renamed Interaction Capability, Portability renamed
Flexibility, Safety added, quality in use moved out. Used only to place results. **Where:**
Section 4.4; App. M, Table M-21.

**ISO/IEC 25022.** How quality in use is measured. **Where:** Section 3.3; App. M, Table M-20.

**ISO/IEC 25023.** How product quality is measured, as ratios X = A / B. **Where:** Section 3.3.

**ISO/IEC 25040.** The evaluation process in five steps: establish requirements, specify, design,
execute, conclude. **Where:** Section 3.3; Table 4-13.

**ISO/IEC/IEEE 29119-1.** The testing standard whose test levels the paper uses: unit and
integration, system, acceptance. **Where:** Section 3.2.4; Table 4-12.

**Lighthouse / PageSpeed.** See Section 3. **Where:** Section 4.3.5.

**Management Information System (MIS).** A system that turns raw data into information for decisions
and control. The paper's theory base. **Where:** Section 2.1.2; Figure 2-1.

**Measured quality.** What the tests showed for each sub-characteristic. **Where:** Section 3.3;
Table 4-18.

**Module 01.** The documents submitted between the first and second iterations; 22 errors in them
were corrected. **Where:** App. C; App. M, Table M-19.

**Needfinding.** Learning what users need by interviewing and watching them. **Where:** Section 3.2.1.

**Observation sheet.** The form recording, per task, the result, the time and the wrong turns.
**Where:** Section 3.3.

**Optimization.** The 51 changes made in response to feedback and testing. **Where:** Section 4.4.6;
Table 4-19.

**Panelista.** A platform matching capstone projects with volunteer evaluators; four technical
evaluators came through it. **Where:** Section 3.3.

**Pilot test (pilot implementation).** Trying the system with selected real users before full use.
**Where:** Section 3.2.5; Section 4.3.

**Quality in use.** Quality as users feel it in their own setting: effectiveness, efficiency,
satisfaction, freedom from risk and context coverage. **Where:** Section 3.3; Section 4.4.5.

**Rated quality.** What the survey respondents said. **Where:** Section 3.3; Table 4-18.

**Requirements grading.** Each functional requirement graded against the code: 25 as worded, 15 in
part, 1 interface only, 3 not as worded. **Where:** Section 4.1.2.

**Respondent groups.** Owner/administrator (1), tenants (3), prospective tenant (1), technical
evaluators (5). **Where:** Table 4-14.

**SDLC (Software Development Life Cycle).** The stages of building software; Agile is one. **Where:**
Section 3.2.

**Severity.** How bad a defect is. Critical: wrong amount in the records or lost data. High: wrong
amount shown, core task blocked or exploitable weakness. Medium: misleading display or weakness with a
workaround. Low: usability, appearance or hardening. **Where:** Section 4.4.6.

**Survey questionnaire.** The ISO/IEC 25010 form, one section per group, in English and Filipino for
tenants and prospective tenants. **Where:** Section 3.3; App. J.

**System testing.** Testing the whole system working together: the walkthrough. **Where:**
Table 4-12.

**Task cards.** Tasks read aloud to each tester, in English and Filipino. **Where:** Section 3.3.

**Technical evaluator.** An IT professional from outside the team who rated the system. **Where:**
Section 2.4; Section 3.3.

**Technology Acceptance Model (TAM).** A model of why people accept technology, used by Canlas et al.
(2026). **Where:** Section 2.1.4.

**Test level.** How much of the system a test covers: unit and integration, system, acceptance.
**Where:** Section 3.2.4.

**Think aloud.** Testers say what they expect as they work. **Where:** Section 3.3.

**Unit and integration testing.** Testing parts alone and together: the automated suites. **Where:**
Table 4-12.

**Use case diagram.** A diagram of what each kind of user can do. **Where:** Figure 4-5; App. G.

**Walkthrough (functional walkthrough).** 26 steps (30 rows) exercising every function that writes
data once, on the vacant unit, done by the owner: 24 passed, 1 failed, 5 not performed as written.
**Where:** Section 4.3.4; App. M, Table M-1.

**Waterfall.** A one-way, step-after-step method, one of the "traditional SDLC models" the paper
sets Agile against. **Where:** Section 3.2; `STUDY_GUIDE_DEFENSE_QA.md`, §4.

**WCAG (Web Content Accessibility Guidelines), levels A and AA.** The web's accessibility rules from
the World Wide Web Consortium; A is the basic level, AA the next. **Where:** Section 3.2.4;
Section 4.3.6.

---

## 6. Statistics

**Composite mean.** The mean of a characteristic's item means, worked out per group, then as the mean
of the group means. **Where:** Section 3.3; Table 4-17.

**Convenience sampling.** Choosing from people who were available (tenants home that evening).
**Where:** Section 3.3.

**Descriptive statistics.** Numbers that describe the answers (means, counts) without claiming
anything about a wider group. **Where:** Section 3.3.

**Effectiveness / efficiency (quality in use).** Effectiveness: tasks completed (34 of 34; 31
without help). Efficiency: median time and mean wrong turns (60 s; 0.2). **Where:** Section 4.4.5;
App. M, Table M-20.

**Frequency (f).** How many respondents chose a rating. **Where:** Table 4-16.

**Inferential test.** A test that generalizes from a sample to a population. None was made, so the
results describe only these ten people. **Where:** Section 3.3; Section 4.4.1.

**Interpretation scale.** 4.21 to 5.00 Very High Quality; 3.41 to 4.20 High; 2.61 to 3.40 Moderate;
1.81 to 2.60 Low; 1.00 to 1.80 Very Low. Five equal steps of 0.80. **Where:** Table 3-5.

**Item mean.** The weighted mean of one survey item. **Where:** Section 3.3.

**Likert scale.** 5 Strongly Agree, 4 Agree, 3 Neutral, 2 Disagree, 1 Strongly Disagree. **Where:**
Table 3-4.

**Mean.** The average: add up, divide by how many. **Where:** Section 3.3.

**Mean of group means.** Each group averaged first, then the groups, so one owner is not outweighed
by three tenants on functions only she uses. **Where:** Section 3.3; Section 4.4.2.

**Mean wrong turns.** The average number of wrong taps or pages per task (0.2). **Where:**
Table 4-11.

**Median.** The middle value when times are put in order (60 seconds a task). **Where:** Table 4-11.

**n / N.** The number of respondents (n per characteristic in Table 4-17; N in the formula).
**Where:** Table 4-16; Table 4-17.

**Overall mean.** The mean of the eight composites: 4.59. **Where:** Table 4-17.

**Pass rate.** Tests passed divided by tests executed: 82 / 83 = 98.8%. **Where:** Table 4-12.

**Pooled mean.** Averaging every response together, ignoring groups: 4.47, same interpretation.
**Where:** Section 4.4.2.

**Purposive sampling.** Choosing people for a purpose: cash payers, less app-confident users, Android
and iPhone, more than one cluster. **Where:** Section 3.3.

**Rank.** A characteristic's place from highest (1, Portability) to lowest (8, Maintainability).
**Where:** Table 4-17.

**Ratio X = A / B.** The 25023 form of a measure. Example: walkthrough steps passed over steps
executed, 24 / 25 = 0.96. **Where:** Section 3.3; App. M, Table M-20.

**Response rate.** Forms returned over forms given out: 10 of 10, 100%. **Where:** Table 4-15.

**Slowest 5% (95th percentile).** The time only one request in twenty took longer than: 0.52 s and
0.80 s in the load tests. **Where:** App. M, Table M-25.

**Task completion rate.** Tasks completed without help over tasks attempted: 31 / 34 = 91%.
**Where:** Section 3.3; Table 4-11.

**Weight (w).** The rating value, 1 to 5. **Where:** Table 4-16.

**Weighted mean (WM).** WM = Σ(f × w) / N. Example: three tenants all chose 5, so (3 × 5) / 3 =
5.00, Very High Quality. **Where:** Section 3.3; Table 4-16.

**Σ (sigma).** "Add them all up". **Where:** Section 3.3.

---

## 7. Every BR, FR and NFR code, and the other codes in the paper

### Business rules (BR), from `docs/02_BUSINESS_RULES.md`

There are 49. The paper cites the ten marked with a section.

| Code | Name | Plain meaning | Where |
| :--- | :--- | :--- | :--- |
| **BR-001** | Single Property Scope | Hivelet manages one property, this boarding house | Register |
| **BR-002** | Room Identity | Each unit is unique, known by its code and floor | Register |
| **BR-003** | Historical Preservation | Old records are never silently deleted when something stops being active | Register |
| **BR-004** | Room Occupancy | A unit is occupied when the administrator records an active tenant | Register |
| **BR-005** | Room Availability | Only the administrator makes a unit available, under maintenance, or free from a date | Register |
| **BR-006** | Reservation | A reserved unit takes no new inquiries | Section 4.2.3 (in words) |
| **BR-007** | Website Visibility | Status and public listing are separate | Register |
| **BR-008** | Primary Contact | One main contact per unit; others may be stored | Register |
| **BR-009** | Inquiry Conversion | Moving in from an inquiry reuses its details; it does not promise a tenancy | Section 4.2.3 (in words) |
| **BR-010** | Due Date | Each tenant's due date comes from their move-in and billing | Table 4-6 |
| **BR-011** | Overdue | Overdue from the day after the due date | Table 4-6 |
| **BR-012** | Grace Period | No grace period; late payment accepted and followed up after about a week | Table 4-6 |
| **BR-013** | Full Payment | Pay in full; partial only by recorded arrangement | Register |
| **BR-014** | Water Fee | ₱200 per occupant | Tables 4-5, 4-6 |
| **BR-015** | Electricity | Paid to the electric company, not billed by Hivelet | Section 4.2.4 (in words) |
| **BR-016** | Online Payment | GCash through Adyen is optional and must be verified | Section 1.4 (in words) |
| **BR-017** | Payment Verification | An online payment stays pending until the administrator confirms it | Section 4.2.4 (in words) |
| **BR-018** | Payment Correction | Every financial correction records old and new values | Register |
| **BR-019** | Report Recalculation | Corrections change the reports | Register |
| **BR-020** | Expense Allocation | Expenses have categories and may be tied to a unit | Register |
| **BR-021** | Ticket Priority | Emergency, High, Medium, Low | Register |
| **BR-022** | Ticket Visibility | A new repair request reaches the administrator at once | Register |
| **BR-023** | Ticket Closure | Only the administrator closes a request | Section 4.2.5 (in words) |
| **BR-024** | Tenant Privacy | Tenants see only what they may | Register |
| **BR-025** | Tenant Deactivation | On move-out the account becomes inactive; records stay | Register |
| **BR-026** | Duplicate Prevention | No duplicate people or active accounts | Register |
| **BR-027** | Returning Tenant | A returning tenant is linked to their old record | Register |
| **BR-028** | Auditability | Important actions can be traced | Register |
| **BR-029** | Current Month Dashboard | Money figures open on the current month | Register |
| **BR-030** | Exportability | Records can be exported | Register |
| **BR-031** | Online Authority | The server's records win over any offline copy | Register |
| **BR-032** | Canonical Unit List | The 33 units in five clusters, by code | Register |
| **BR-033** | Rent Period Derivation | "Rent For" is worked out from the anniversary date, never typed | Tables 4-5, 4-6 |
| **BR-034** | Occupant Count Carries Forward | Last month's occupants are used until changed | Register |
| **BR-035** | 50% Share Is Derived | A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet | Tables 4-5, 4-6 |
| **BR-036** | Water Payment Validation | Water must equal occupants × ₱200; met by construction, since water cannot be typed | Register |
| **BR-037** | Garbage Fee Frequency | **Retired** 30 Sep 2026; the garbage fee is gone | Register |
| **BR-038** | Remitted Amount Formula | Remitted = Rent + Water, worked out by the system | Tables 4-5, 4-6 |
| **BR-039** | Deposit Equals Initial Rent | Deposit set once at move-in, equal to the rent then | Table 4-6 |
| **BR-040** | Linda's Separate Billing | Linda's units pay ₱200 per occupant, recorded separately and kept out of remitted | Tables 4-5, 4-6 |
| **BR-041** | Expense Property Areas | Six property areas | Register |
| **BR-042** | One Category Per Expense Entry | Each expense has exactly one category | Register |
| **BR-043** | Fixed Expense Category List | Her thirteen categories, plus any she adds; none renamed or removed | Section 4.1.2 (in words) |
| **BR-044** | Split Expense Allocation | One expense may be split across areas without retyping | Register |
| **BR-045** | Expense Row Total Is Derived | An expense's total is the sum of its allocations | Table 4-6 |
| **BR-046** | Expense Category Totals | Each category has a monthly and a running total | Register |
| **BR-047** | Expense Category Reconciliation | Category totals equal area totals each month | Register |
| **BR-048** | Admin-Only Authorship | Only the administrator writes the ledgers | Register |
| **BR-049** | Excel Export | Both ledgers export to Excel in her layout | Register |

### Functional requirements (FR), from `docs/03_REQUIREMENTS.md`

There are 44 (Section 4.1.2). App. L names the test cases that trace to each.

| Code | Name | Plain meaning | Test cases (App. L) |
| :--- | :--- | :--- | :--- |
| **FR-001** | Authentication | Sign in administrators and active tenants | A-01, A-08 to A-10, A-15, T-01, T-02, S-04, S-07, S-08 |
| **FR-002** | Role-Based Access | Enforce what each role may do | A-22, T-15, C-02, S-05, S-06, S-11 |
| **FR-003** | Public Website | Show the property, units, photos and availability | A-05, A-06, P-01 to P-03, O-10, N-02, N-03 |
| **FR-004** | Public Inquiry | A visitor asks about a specific unit | A-07, P-04 to P-06b |
| **FR-005** | Inquiry Management | The administrator answers and updates inquiries | A-26 |
| **FR-006** | Inquiry Conversion | Reuse an inquiry's details when moving someone in | None |
| **FR-007** | Room Management | Create, edit, publish, hide and set the status of units | A-11, A-32 |
| **FR-008** | Room History | Keep occupancy and tenant history | A-11 |
| **FR-009** | Tenant Management | Manage tenant records and accounts | A-12, A-13, A-31, A-36 |
| **FR-010** | Tenant Profile Updates | Tenants update permitted details | A-18, T-12 |
| **FR-011** | Billing | Rent and water bills | A-20, T-04, T-06, N-01 |
| **FR-012** | Due Dates | Each tenant's own due date | None |
| **FR-013** | Overdue Monitoring | Show which payments are overdue (there is no grace period, BR-012) | T-04, N-01 |
| **FR-014** | Manual Payments | The administrator records cash payments | A-23, T-05 |
| **FR-015** | Online Payments | Optional GCash through Adyen | A-19, T-14 |
| **FR-016** | Payment Verification | The administrator verifies online payments | A-34 |
| **FR-017** | Financial Corrections | Corrections, with an audit record | A-24, A-25 |
| **FR-018** | Expense Management | Record expenses by category and area | A-28 |
| **FR-019** | Cash Flow | Work out income, expenses and net | A-02 |
| **FR-020** | Profitability Analytics | Graphs and trends of income | None |
| **FR-021** | Maintenance Tickets | Tenants create repair requests | A-16, T-08, O-06 |
| **FR-022** | Attachments | Photos on repair requests | A-16, T-09 |
| **FR-023** | Ticket Priority | Emergency, High, Medium, Low | T-08 |
| **FR-024** | Ticket Status | Tenants see the status | T-11 |
| **FR-025** | Ticket Administration | The administrator manages and closes requests | A-27, C-04 |
| **FR-026** | Communication | Tenant, inquiry and repair messages in one place | A-17, T-10, C-03 |
| **FR-027** | Notifications | In-app notices of important events | A-04, A-21, A-27, T-13, C-05 |
| **FR-028** | Reports | Live reports and exports | A-29 |
| **FR-029** | Audit Logs | Record important actions and money changes | A-25, A-33, S-09 |
| **FR-030** | Offline-Ready Access | Limited offline reading | O-01 to O-05, O-07 to O-09 |
| **FR-031** | Monthly Income Report Layout | Reproduce her income sheet by cluster | None |
| **FR-032** | Guided Monthly Payment Entry | A guided Record payment form that works out the figures | A-23 |
| **FR-033** | Occupant Count Memory | Fill in last month's occupants | A-14 |
| **FR-034** | Water Payment Validation | Water equals occupants × ₱200 (met by construction) | A-23 |
| **FR-035** | One-Time Onboarding Fields | Anniversary date and deposit entered once | None |
| **FR-036** | Linda Billing Flow | Linda's units recorded separately; today at ₱200 per occupant (BR-040) | None |
| **FR-037** | Monthly Expenses Ledger | Reproduce her expense sheet | None |
| **FR-038** | Split Expense Entry | One expense across several areas | A-28 |
| **FR-039** | Automatic Expense Totals | Row, area and category totals worked out | A-28 |
| **FR-040** | Expense Category Cumulative Totals | Running totals carried forward | None |
| **FR-041** | Expense Category Dropdown | Her thirteen categories, plus her own | None |
| **FR-042** | Expense/Category Reconciliation Check | Category totals equal area totals | None |
| **FR-043** | Admin-Only Income/Expense Entry | Only the administrator writes the ledgers | None |
| **FR-044** | Excel Export | Both ledgers as Excel in her layout | A-29 |

### Non-functional requirements (NFR), from Table 4-3

| Code | Name | Plain meaning | Measured in |
| :--- | :--- | :--- | :--- |
| **NFR-001** | Functional Suitability | Provide the business functions accurately | Sections 4.3.1 to 4.3.4; 4.4.3 |
| **NFR-002** | Usability | Understandable to a non-technical administrator | Section 4.3.7; 4.4.3 |
| **NFR-003** | Security | Protect personal and financial information | Sections 4.2.6, 4.4.4 |
| **NFR-004** | Performance | Respond efficiently under expected load | Tables 4-10, M-25 |
| **NFR-005** | Compatibility | Work on modern desktop and mobile browsers | Table 4-21; 4.4.3 |
| **NFR-006** | Reliability | Keep data consistent; no silent loss | Sections 4.3.1, 4.3.3, 4.3.6 |
| **NFR-007** | Maintainability | Modular, documented code | Section 4.4.3: partly met |
| **NFR-008** | Portability | Deployable to hosting the team can maintain (reworded from the university's server) | Section 4.2.1; Table 4-21 |
| **NFR-009** | Auditability | Important changes traceable | Section 4.2.6 |
| **NFR-010** | Exportability | Data usable outside the app | Section 4.2.4 |

### Other codes you will meet

| Code | Meaning | Where |
| :--- | :--- | :--- |
| **A-01 to A-36** | Owner and administrator test cases; A-05 to A-32 are the walkthrough | App. L, Part A |
| **T-01 to T-18** | Tenant tasks; T1 to T3 are the three tenants | App. L, Part T; Table 4-11 |
| **P-01 to P-08** | Public site tests | App. L, Part P |
| **C-01 to C-08** | Simultaneous-use tests | App. L, Part C; Table M-22 |
| **O-01 to O-12** | Offline, weak signal and installing | App. L, Part O |
| **S-01 to S-12** | Security tests | App. L, Part S |
| **CO-01 to CO-06** | Browsers and devices | App. L, Part CO |
| **PF-01 to PF-10** | Performance timings | App. L, Part PF; Table 4-10 |
| **N-01 to N-03** | Changes shipped on 30 September | App. L, Part N |
| **P, PH, F, NT** | In Part T: done alone, done with help, not done, not tried | App. L |
| **FS, PE, CO, US, RE, SE, MA, PO** | The eight characteristics, as App. L labels them | App. L |
| **O, T, E, P** | Questionnaire sections: administrator (owner), tenants, technical evaluators, prospective tenants | Table 3-6 |
| **1.0 to 8.0** | DFD processes: inquiries, units and rates, tenants, billing and payments, repairs, expenses, reports, sign-in | Figure 4-4; App. F |
| **D3** | The data store Bills and receipts | Section 4.2.1 |
| **Table M-1 to M-27** | The evidence tables behind Chapter 4 | App. M |
| **Step 23b** | The one failed walkthrough step (₱0 instead of "—"), passed on re-test 13 Oct | Section 4.3.4 |
| **Case 08657379** | Adyen support's case for the replaced acquirer account | Section 4.3.2 |
| **HV-48213** | An example login ID | App. K, Part 1 |
| **INV#4726** | How an invoice number is saved | App. K, Part 2, §3 |

---

## 8. Abbreviations, A to Z

| Abbreviation | Stands for | Meaning here |
| :--- | :--- | :--- |
| **A, AA** | WCAG levels | The basic and next accessibility levels |
| **ACK** | Acknowledgement receipt | A payment slip with no invoice number |
| **AI** | Artificial intelligence | The coding assistant that generated much of the code |
| **API** | Application programming interface | The server addresses the screens call |
| **App.** | Appendix | |
| **BH** | Boarding House | The main 22-unit cluster |
| **BR** | Business rule | One of 49 rules in the register |
| **BS IT** | Bachelor of Science in Information Technology | The team's degree |
| **CLS** | Cumulative Layout Shift | How much a page jumps while loading |
| **CO** | Compatibility | App. L label |
| **CSP** | Content Security Policy | Where scripts may come from |
| **CSS** | Cascading Style Sheets | How web pages are styled (Tailwind CSS) |
| **DFD** | Data flow diagram | Figure 4-4; App. E, F |
| **ERD** | Entity-relationship diagram | Figure 4-6 |
| **F1, F2F, F2B** | Front Apartment units | |
| **FHD+** | Full High Definition plus | The test phone's screen (Table 3-3) |
| **FK** | Foreign key | A column pointing to another table |
| **FR** | Functional requirement | One of 44 |
| **FS** | Functional Suitability | App. L label |
| **GB** | Gigabyte | Memory and storage size |
| **GBG** | Garbage (fee) | Retired 30 Sep 2026 |
| **HMAC** | Hash-based message authentication code | Adyen's signature on each notification |
| **HTML** | HyperText Markup Language | The language of web pages |
| **HTTP / HTTPS** | HyperText Transfer Protocol (Secure) | How the web talks; HTTPS is encrypted |
| **IEC** | International Electrotechnical Commission | Co-publisher of the ISO/IEC standards |
| **IEEE** | Institute of Electrical and Electronics Engineers | Co-publisher of 29119 |
| **INV#** | Invoice number | How her numbers are saved |
| **IPO** | Input-Process-Output | The conceptual framework (Figure 2-2) |
| **ISO** | International Organization for Standardization | Publisher of 25010 and the rest |
| **IT** | Information technology | |
| **JPG / PNG** | Two image file types | Allowed for repair photos |
| **JSON** | JavaScript Object Notation | The data format between screens and server |
| **JWT** | JSON Web Token | The signed sign-in token |
| **LB, LF** | Linda units | The two Linda units |
| **LCP** | Largest Contentful Paint | How soon the main content appears |
| **LTS** | Long-term support | A Node.js version with long updates |
| **MA** | Maintainability | App. L label |
| **MB** | Megabyte | The installed app is about 1.2 MB |
| **Mbps** | Megabits per second | Internet speed (Table 3-2) |
| **MIS** | Management Information System | The paper's theory base |
| **MSMEs** | Micro, small and medium-sized enterprises | Mia et al. (2024) |
| **NFR** | Non-functional requirement | One of 10 |
| **NT** | Not tested | App. L result |
| **OD** | Open decision | A question put to the owner, in the register (for example OD-16) |
| **OR** | Official receipt | Say "invoice" instead; the screens do |
| **PE** | Performance Efficiency | App. L label |
| **PH** | Penthouse | The one rooftop unit |
| **PhilHealth, SSS** | Philippine Health Insurance; Social Security System | Sub-lines of the Salaries expense category |
| **PK** | Primary key | The column identifying each row |
| **PO** | Portability | App. L label |
| **PWA** | Progressive Web Application | Installs from the browser, no app store |
| **RA** | Republic Act | RA 10173, the Data Privacy Act of 2012 |
| **RAM** | Random-access memory | Device memory (Tables 3-2, 3-3) |
| **RBAC** | Role-based access control | Rights by role |
| **RE** | Reliability | App. L label |
| **RLS** | Row-level security | The database refuses rows a request may not see |
| **SDLC** | Software Development Life Cycle | The stages of building software |
| **SE** | Security | App. L label |
| **SHA-256** | Secure Hash Algorithm, 256-bit | How an inquiry link's secret is stored |
| **SMS** | Short Message Service (text message) | Used by Mangca (2023b); Hivelet sends none |
| **SQL** | Structured Query Language | The language for asking the database |
| **SQuaRE** | Systems and software Quality Requirements and Evaluation | The ISO/IEC 25000 family |
| **SSD** | Solid-state drive | Fast storage (Table 3-2) |
| **SSL** | Secure Sockets Layer | The encrypted connection SSL Labs grades |
| **TAM** | Technology Acceptance Model | Used by Canlas et al. (2026) |
| **UAT** | User acceptance testing | Section 4.3.7 |
| **UI / UX** | User interface / user experience | The screens, and how they feel to use |
| **URL** | Uniform Resource Locator | A web address |
| **US** | Usability | App. L label |
| **UUID** | Universally unique identifier | The id of each row |
| **VS Code** | Visual Studio Code | The code editor |
| **W3C** | World Wide Web Consortium | Publisher of WCAG |
| **WCAG** | Web Content Accessibility Guidelines | Accessibility rules, levels A and AA |
| **WM** | Weighted mean | WM = Σ(f × w) / N |
| **X = A / B** | A ratio measure | ISO/IEC 25023's form |
| **.xlsx** | Excel workbook file | The downloads |
| **₱ (PHP)** | Philippine peso | All amounts |
