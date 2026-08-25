# HIVELET SYSTEM BIBLE

## 1. Product Identity

**Name:** Hivelet

**System:** Web-Based Apartment Management System with Financial Analytics, Booking Inquiry, Issue Tracking, Communication, and Optional Online Payment Processing.

**Target Property:** Fe Galang Da Silva Boarding House.

**Primary Goal:**

> Centralize the apartment's operational, financial, tenant, inquiry, maintenance, and communication workflows into one system so the administrator can understand and manage the business from one place.

The system exists to replace fragmented workflows involving notebooks, spreadsheets, Facebook/Messenger conversations, text messages, face-to-face requests, and manually separated financial records.

---

## 2. Core Product Philosophy

Hivelet should make the administrator feel:

> "I finally know exactly where my money goes."

The system should answer:

- What money came in?
- What money went out?
- Where was money allocated?
- Which rooms are occupied?
- Who is responsible for each room?
- Which payments are pending, overdue, or verified?
- Which inquiries need attention?
- Which maintenance issues are urgent?
- What needs the administrator's attention today?

Hivelet is not merely a collection of CRUD pages. It is a centralized business operations and financial monitoring system.

---

## 3. Scope

### Included

- Public property website
- Room listings and availability
- Booking/inquiry submission
- Admin dashboard
- Tenant accounts
- Room and occupancy management
- Billing and payment tracking
- Optional online GCash payment through Adyen
- Expense and financial tracking
- Cash flow monitoring
- Profitability analytics
- Maintenance issue tickets
- Tenant-admin communication
- Notifications
- Activity and audit logs
- Report generation and export
- Basic PWA capabilities for moderate offline-ready access

### Explicitly Not Included

- Offline transactions
- Offline payment processing
- Enterprise multi-property management
- Complex accounting standards or full accounting software
- Multiple property support
- Complex staff permission systems
- Full utility-company billing automation
- Automatic electricity billing from the electric company
- Installation as a required PWA feature

---

## 4. Users

### Public Visitor / Prospective Tenant

Can:
- view property information
- view room information
- see room availability
- see room status and expected availability
- submit an inquiry for a specific room
- provide contact information
- communicate with the administrator through the inquiry process

Cannot:
- access private tenant information
- access administrative records
- directly reserve or transact a room online

### Tenant

Can:
- access their account while active
- view relevant room and account information
- view billing/payment status
- submit maintenance tickets
- attach photos to issue tickets
- communicate with the administrator
- update permitted personal information
- receive status updates and notifications

Cannot:
- access other tenants' information
- access financial records of the entire property
- modify official financial records
- independently close official maintenance tickets

### Administrator

The system has one administrator role according to the capstone scope.

The administrator can:
- manage rooms
- manage tenant records
- manage tenant accounts
- manage inquiries
- convert inquiries into tenant records
- manage occupancy
- create and manage billing records
- verify payments
- record manual payments
- review online payment confirmations
- correct financial records
- manage expenses
- track cash flow
- view analytics
- manage maintenance tickets
- communicate with tenants
- manage room availability
- view notifications
- export reports
- review audit logs and activity history

---

## 5. Property Model

The property has:

- 3 floors
- 32 total rooms/units

The system treats each unit as a room record.

Room types include:
- Studio
- One-bedroom
- Two-bedroom
- Three-bedroom

Rooms may differ in:
- floor
- room number
- room type
- price
- capacity
- size/description
- amenities
- photos

Typical room information may include:
- kitchen
- bathroom
- cabinets
- bed frames
- other amenities

The property has:
- parking
- common areas
- separate electricity metering
- water charging at ₱200 per person
- no included Wi-Fi
- no included laundry service

---

## 6. Room-Centric Model

A room is the central operational entity.

A room may have:
- historical occupants
- one current active account/contact arrangement
- multiple occupants in reality
- multiple historical tenants over time
- different historical prices
- billing records
- payment records
- maintenance records
- expenses assigned to it when applicable
- inquiries connected to it
- reservations

The system must preserve historical room activity.

A room must not lose its historical record simply because:
- a tenant vacates
- a price changes
- a payment is corrected
- a room becomes available

---

## 7. Room Status and Availability

Room operational status and website visibility are separate concepts.

### Operational Status

- Available
- Reserved
- Occupied
- Under Maintenance

### Website Visibility

- Published
- Hidden

A room can be:
- visible while under maintenance
- visible while reserved
- visible while occupied
- hidden by administrator decision

A room marked reserved must not accept new inquiry submissions for that room.

A room may have an expected availability date.

Example:

> Available from August 15, 2026.

When a tenant vacates:
1. The administrator settles the tenant's departure.
2. The tenant's active access is terminated/deactivated.
3. The room becomes available or is marked under maintenance.
4. The administrator may specify the expected availability date.
5. The public website reflects the new status.

---

## 8. One Room, One Primary Account Relationship

A room may contain multiple people in real life.

The system does not need to manage every occupant as an independent tenant account.

The primary contact is the person responsible for communication and transactions with the administrator.

The system may store additional contact information where necessary.

A room may have:
- one primary account/contact
- additional phone numbers or contact information
- multiple historical tenant/contact records over time

The current primary account/contact may be replaced when the person responsible for the room changes.

Example:

Sean, John, and Mark share a room. Mark is the contact with the administrator. Mark leaves. If Sean remains, the administrator may update the room's active contact relationship to Sean without creating a duplicate room.

---

## 9. Inquiry Workflow

Public visitor:

1. Visits the public website.
2. Views rooms and property information.
3. Selects a specific room.
4. Submits an inquiry.
5. Administrator sees the inquiry in the admin dashboard.
6. Administrator communicates with the prospect.
7. The prospect may visit the property in person.
8. Further discussion and decision may occur outside or inside the system.
9. If successful, the inquiry may be converted into a tenant onboarding process.
10. If not successful, it is closed with an appropriate outcome.

Inquiry conversion should avoid retyping information.

Information captured during the inquiry should be reusable during tenant onboarding.

---

## 10. Billing and Financial Model

The financial system distinguishes between:

### Hivelet-managed bills

- Rent
- Water

### External bill records

- Electricity

The electric company issues the electricity bill. Hivelet may record electricity-related financial information for monitoring and reporting, but it does not pretend to be the electric company's billing system.

Water is charged at ₱200 per person.

Rent and water are included in the monthly amount due to the apartment.

Electricity follows the private electric company's billing process and due date.

The system must track:
- income
- payments
- deposits
- advance payments
- expenses
- money allocation
- net cash flow
- profitability

---

## 11. Due Dates and Overdue Status

Each room/tenant billing cycle has an individual due date based on the move-in date.

Example:

Move-in: January 5

Monthly due date: 5th of each month

Starting January 6, the payment is overdue.

There is a one-week grace period depending on the situation.

The system should distinguish:
- Pending
- Due
- Overdue within grace period
- Grace period expired / seriously overdue
- Paid
- Verified where verification is required

The exact administrative handling of grace periods should remain visible to the administrator.

---

## 12. Payment Types

Payments may include:
- rent payments
- water payments
- deposits
- advance payments
- other legitimate business income where applicable

Payment sources may include:
- manual cash payment
- manual bank/e-wallet record
- optional online payment

Online payment through Adyen:
- supports the optional GCash payment flow
- must be treated as pending until confirmation is verified by the administrator
- successful gateway information must not automatically bypass the required administrative verification workflow if the business process requires confirmation

---

## 13. Expenses

Expenses must be:
- categorized
- dated
- described
- assigned to a room when applicable
- included in financial monitoring

Examples:
- electricity
- water
- repairs
- maintenance
- cleaning
- caretaker salary
- 13th month pay
- caretaker benefits
- taxes
- emergency maintenance expenses
- other operational expenses

The administrator should be able to view:
- total income
- total expenses
- net cash flow
- expense allocation
- trends
- profitability graphs

Reports should be live and exportable.

---

## 14. Financial Corrections and Auditability

The administrator may correct mistakes.

Corrections must:
- be recorded in the audit log
- preserve a history of the change
- identify the actor
- record the previous value
- record the new value
- record the timestamp
- affect current reports after confirmation

The corrected value becomes the active value only after the administrative correction process is confirmed.

Financial history must never silently disappear.

---

## 15. Maintenance and Issue Tracking

Tenants can submit issue tickets.

Tickets may include:
- title
- description
- room
- category
- priority
- photos/attachments
- status
- timestamps
- communication history

Priority levels:

- Emergency
- High
- Medium
- Low

Visual priority:
- Emergency: red
- High: orange
- Medium: yellow
- Low: green

New tickets should become visible to the administrator immediately.

The administrator should be able to:
- review
- communicate
- update status
- assign or track resolution
- close the ticket after resolution

The tenant should be able to see the ticket status.

The tenant should not independently close the official ticket without administrative confirmation.

---

## 16. Communication Centralization

Hivelet should centralize communication that is otherwise fragmented across:
- social media
- text messages
- in-person communication
- informal requests

The system should provide an internal communication path connected to:
- inquiries
- tenant records
- maintenance tickets
- relevant room records

The goal is not to eliminate real-world communication. The goal is to preserve important operational context inside Hivelet.

---

## 17. Dashboard Philosophy

The administrator dashboard should prioritize attention.

The first screen should help answer:

- What money came in this month?
- What money went out this month?
- What is the net cash flow?
- Which payments are overdue?
- Are there new inquiries?
- Are there emergency or high-priority issues?
- Are there rooms becoming available?
- Are there online payments requiring verification?

The dashboard should default to the current month for financial statistics.

---

## 18. Reports

Reports should be live based on current valid system records.

Exportable data may include:
- income
- expenses
- net cash flow
- payment history
- room financial history
- occupancy
- maintenance history
- inquiries
- audit activity

The system should support export for use outside the website.

---

## 19. Account Lifecycle

Tenant accounts are active only while the tenant has an active relationship with the property.

When the tenant vacates:
- the administrator settles the departure
- the account becomes inactive/deactivated
- access to active tenant functions is removed
- historical records remain preserved

A returning tenant should not automatically create a duplicate person/account record.

The existing historical record should be reused where appropriate.

The tenant may update permitted personal information such as:
- phone number
- emergency contact
- occupation
- Facebook/contact information

---

## 20. Security

Tenant data is private.

A tenant must not access:
- another tenant's personal data
- property-wide financial records
- administrator-only audit logs
- other rooms' private records

Authentication and authorization must be enforced on the backend, not only in the frontend.

---

## 21. PWA Scope

Hivelet may provide moderate offline-ready functionality.

The intended offline capability is:
- opening previously cached application resources
- viewing limited previously available dashboard data where technically safe

The system does not support:
- offline payment processing
- offline financial transactions
- offline ticket submission requiring immediate server persistence

Online synchronization is required for authoritative data changes.

---

## 22. Core Design Principle

Every important operational action should produce a clear state transition.

Examples:

Inquiry submitted
→ visible to administrator

Room reserved
→ no new inquiry for that room

Tenant created
→ room occupancy and billing relationship established

Payment recorded
→ financial totals and relevant reports update

Online payment submitted
→ pending verification

Payment verified
→ financial records update

Ticket created
→ visible immediately with priority

Tenant vacates
→ account becomes inactive and room returns to availability workflow

Expense recorded
→ financial analytics update

Correction made
→ audit log records the change and reports recalculate

---

## 23. Non-Negotiable Product Rule

Do not build Hivelet as disconnected CRUD pages.

Build one connected system.

A public inquiry should be capable of becoming a tenant record.

A tenant should be connected to a room.

A room should be connected to billing.

A payment should affect financial records.

An expense should affect cash flow.

A ticket should be connected to a room and tenant.

A correction should be audited.

Everything should remain traceable.
