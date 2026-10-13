# APPENDIX N: DATA DICTIONARY

This appendix lists every table and column of the Hivelet database as it stands in the live system, with the
type and length of each column, whether a value is required, its default, and the keys that link the tables.
PK marks a primary key and FK a foreign key, with the table and column it refers to; a generated column is
computed by the database from the columns named and cannot be written. Allowed values of an enumerated type
are listed beside it. No sample values are given, because the rows hold tenants' personal data.

## Property

### rooms

One row per rentable unit: 33 units in five clusters.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_number | varchar(20) | Yes |  |  | The unit's code, as the owner writes it (unique regardless of capitals) |
| floor | integer | Yes |  |  | Building level: 1 to 3 residential, 4 the rooftop penthouse |
| cluster_code | varchar(50) | Yes |  | FK clusters.code | The cluster the unit belongs to |
| room_type | room_type_enum (Studio, One-bedroom, Two-bedroom, Three-bedroom) | Yes | Studio |  | Kind of unit (studio, one-bedroom and so on) |
| description | text |  |  |  | Text shown on the public site |
| capacity | integer | Yes |  |  | Most occupants the unit is meant for |
| base_price | numeric(10,2) | Yes |  |  | The rate the unit was first set up with |
| current_price | numeric(10,2) | Yes |  |  | The rate in effect now, set by the owner |
| operational_status | operational_status_type (Available, Reserved, Occupied, Under Maintenance) | Yes | Available |  | Available, Occupied, Reserved or under maintenance |
| visibility_status | visibility_status_type (Published, Hidden) | Yes | Published |  | Whether the unit is listed on the public site |
| available_from | date |  |  |  | When a unit becoming free can be moved into |
| is_linda_unit | boolean |  | false |  | True for the two Linda units, whose money is kept separately (BR-040) |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |

### clusters

The five clusters (Boarding House, Back Apartment, Front Apartment, Penthouse, Linda) and the expense area each books its costs to.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| code | varchar(50) | Yes |  | PK | Short code of the cluster |
| name | varchar(100) | Yes |  |  | Name shown on screens |
| display_order | integer | Yes |  |  | Order on screens and reports |
| expense_area | property_area_type (Boarding House, Main House, Front Apartment, Back Apartment, Other Expenses / Personal, Penthouse) | Yes |  | FK property_areas.code | The property area this cluster's costs are booked to |

### property_areas

The parts of the property an expense can be split across, and whether each counts as a rental cost.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| code | property_area_type (Boarding House, Main House, Front Apartment, Back Apartment, Other Expenses / Personal, Penthouse) | Yes |  | PK | The area |
| name | varchar(150) | Yes |  |  | Name shown on screens |
| is_rental_expense | boolean | Yes | true |  | False for the owner's own residence and personal costs, which are not deducted from rental income |
| display_order | integer | Yes | 0 |  | Order on screens and reports |
| notes | text |  |  |  | Notes on what the area covers |

### room_photos

Photographs and floor plans of each unit, one marked primary.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| file_url | text | Yes |  |  | Where the image is kept |
| caption | varchar(255) |  |  |  | Caption shown with it |
| display_order | integer | Yes | 0 |  | Order in the unit's gallery |
| is_primary | boolean | Yes | false |  | The photo shown first |
| uploaded_by | uuid |  |  | FK profiles.id | Who added it |
| created_at | timestamptz | Yes | now() |  | When the row was created |

### room_price_history

Every change of a unit's rate, written by a database trigger.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| previous_price | numeric(10,2) | Yes |  |  | The rate before the change |
| new_price | numeric(10,2) | Yes |  |  | The rate after it |
| effective_date | date | Yes | CURRENT_DATE |  | When the new rate applies |
| reason | text |  |  |  | Why, if given |
| created_by | uuid |  |  | FK profiles.id | Who made the change |
| created_at | timestamptz |  | now() |  | When the row was created |

## People

### profiles

Everyone with a record: the administrator, tenants, and visitors recorded from an inquiry.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| auth_user_id | uuid |  |  |  | Link to a sign-in account of the hosting service, where one exists |
| email | varchar(255) |  |  |  | Email address, optional (unique when given) |
| full_name | varchar(255) | Yes |  |  | Full name |
| phone_number | varchar(50) |  |  |  | Philippine mobile number (unique when given) |
| emergency_contact_name | varchar(255) |  |  |  | Emergency contact |
| emergency_contact_phone | varchar(50) |  |  |  | Emergency contact's number |
| occupation | varchar(100) |  |  |  | Occupation, optional |
| facebook_url | text |  |  |  | Facebook profile, optional |
| role | user_role_type (admin, tenant, prospect) | Yes | tenant |  | admin, tenant, prospect or guest |
| account_status | account_status_type (active, inactive) | Yes | active |  | active, or inactive once a tenant has moved out |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |
| password_hash | varchar(255) |  |  |  | The password as a bcrypt hash; the password itself is never stored |
| last_login_at | timestamptz |  |  |  | Last successful sign-in |
| failed_login_count | integer | Yes | 0 |  | Failed sign-ins in a row; five lock the account |
| locked_until | timestamptz |  |  |  | While in the future, sign-in is refused |
| password_changed_at | timestamptz |  |  |  | When the password last changed; earlier sessions end |
| must_change_password | boolean | Yes | false |  | True until a new tenant, or one whose password was reset, sets their own |
| login_id | varchar(20) |  |  |  | Short sign-in ID given to a tenant (unique) |

### room_assignments

Tenancies: who occupies which unit, from when, with how many occupants.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| tenant_profile_id | uuid | Yes |  | FK profiles.id | The tenant |
| start_date | date | Yes |  |  | Move-in date (not recorded in the owner's workbook for transferred tenancies) |
| end_date | date |  |  |  | Move-out date, once moved out |
| anniversary_date | date | Yes |  |  | The day of the month rent runs from |
| deposit_amount | numeric(10,2) | Yes | 0 |  | The deposit held: one month, set against repairs at move-out (BR-039) |
| occupant_count | integer | Yes | 1 |  | Occupants; water is ₱200 for each |
| is_primary_contact | boolean |  | true |  | Whether this tenant is the unit's contact |
| is_active | boolean |  | true |  | True while the tenancy runs; only one per unit (unique index) |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |

## Money

### monthly_income_records

The owner's Monthly Income ledger, one row per receipt per month covered (Chapter 4, Table 4-5).

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| tenant_profile_id | uuid |  |  | FK profiles.id | The tenant credited |
| assignment_id | uuid |  |  | FK room_assignments.id | The tenancy credited |
| year | integer | Yes |  |  | Year of the month the rent is for |
| month | integer | Yes |  |  | Month the rent is for (1 to 12) |
| date_paid | date | Yes |  |  | Date the money was received |
| contact_name | varchar(255) | Yes |  |  | Name as written on the receipt |
| invoice_number | varchar(100) |  |  |  | The owner's invoice number (INV#…), an acknowledgement receipt, or none; never made up by the system |
| rent_period_start | date | Yes |  |  | First day the payment covers |
| rent_period_end | date | Yes |  |  | Last day it covers |
| rent_amount | numeric(10,2) | Yes |  |  | Rent received for the period |
| fifty_percent_share | numeric(10,2) |  |  | Generated: rent_amount / 2.0 | A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet (BR-035) |
| occupants | integer | Yes |  |  | Occupants the water was charged for |
| water_payment | numeric(10,2) | Yes | 0 |  | Water received |
| remitted_amount | numeric(10,2) |  |  | Generated: rent_amount + water_payment | Rent plus water (BR-038) |
| is_linda_billing | boolean |  | false |  | True for a Linda unit's row |
| linda_electricity_charge | numeric(10,2) |  | 0 |  | Historical only: a flat electricity charge retired on 13 September 2026; old rows kept as collected |
| linda_water_charge | numeric(10,2) |  | 0 |  | A Linda unit's water, ₱200 per occupant, recorded here and kept out of the remitted amount (BR-040) |
| payment_method | payment_method_type (Cash, GCash, Bank Transfer, Adyen Online) | Yes | Cash |  | Cash, GCash or bank transfer |
| verification_status | verification_status_type (Verified, Pending Verification, Rejected) | Yes | Verified |  | Verified, Pending Verification or Rejected; only Verified counts as paid |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |
| transaction_reference | varchar(120) |  |  |  | The gateway's or bank's reference (recorded once) |
| voided_at | timestamptz |  |  |  | When the receipt was voided; a voided receipt leaves every total |
| voided_by | uuid |  |  | FK profiles.id | Who voided it |
| void_reason | text |  |  |  | Why |

### monthly_expense_entries

The owner's Monthly Expenses ledger: one row per expense.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| expense_date | date | Yes |  |  | Date of the expense |
| invoice_supplier | text | Yes |  |  | Invoice or supplier, as the owner writes it |
| category_code | varchar(20) | Yes |  | FK fixed_expense_categories.code | Expense category |
| total_expenses | numeric(10,2) | Yes | 0 |  | Total, kept equal to its allocations by a trigger (BR-045) |
| created_by | uuid |  |  | FK profiles.id | Who recorded it |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |
| voided_at | timestamptz |  |  |  | When voided |
| voided_by | uuid |  |  | FK profiles.id | Who voided it |
| void_reason | text |  |  |  | Why |

### expense_property_allocations

How each expense is split across property areas; the parts add up to the expense.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| expense_entry_id | uuid | Yes |  | FK monthly_expense_entries.id | The expense |
| property_area | property_area_type (Boarding House, Main House, Front Apartment, Back Apartment, Other Expenses / Personal, Penthouse) | Yes |  | FK property_areas.code | The area this part is for (one part per area) |
| amount | numeric(10,2) | Yes |  |  | The part's amount |
| created_at | timestamptz |  | now() |  | When the row was created |

### fixed_expense_categories

The owner's expense categories (the thirteen numbered lines, with sub-lines), and any she adds.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| code | varchar(20) | Yes |  | PK | Category code (1 to 13, with sub-lines such as 6a) |
| name | varchar(255) | Yes |  |  | Name shown on screens and reports |
| parent_code | varchar(20) |  |  | FK fixed_expense_categories.code | The line a sub-line belongs to |
| display_order | integer | Yes |  |  | Order on the ledger and in the download |

### bills

Bills raised for a tenancy: rent and water for one whole month.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| tenant_profile_id | uuid | Yes |  | FK profiles.id | The tenant billed |
| bill_type | bill_type_enum (Rent, Water, Combined, Other) | Yes | Combined |  | Rent and water together, as the owner bills them |
| billing_period_start | date | Yes |  |  | First day of the whole month billed |
| billing_period_end | date | Yes |  |  | Last day of it |
| rent_amount | numeric(10,2) | Yes | 0 |  | The whole month's rent; never prorated |
| water_amount | numeric(10,2) | Yes | 0 |  | Occupants × the water rate |
| total_amount | numeric(10,2) | Yes |  |  | Rent plus water |
| due_date | date | Yes |  |  | Due date; overdue from the next day |
| grace_period_end_date | date | Yes |  |  | Equal to the due date: there is no grace period |
| status | bill_status_type (Pending, Due, Overdue, Paid, Partially Paid) | Yes | Pending |  | Pending, Paid, Overdue and so on |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |
| checkout_opened_at | timestamptz |  |  |  | When a GCash checkout was opened on the bill; another is refused for 15 minutes |

### payments

Payments made against bills, online with GCash through Adyen or recorded by the owner, with their verification.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| bill_id | uuid |  |  | FK bills.id | The bill paid, where one exists |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| tenant_profile_id | uuid | Yes |  | FK profiles.id | The tenant |
| amount | numeric(10,2) | Yes |  |  | Amount paid |
| payment_method | payment_method_type (Cash, GCash, Bank Transfer, Adyen Online) | Yes | Cash |  | Cash, GCash or bank transfer |
| payment_source | varchar(100) | Yes | On-Site Cash |  | Where it came from (on site, or online through Adyen with GCash) |
| verification_status | verification_status_type (Verified, Pending Verification, Rejected) | Yes | Pending Verification |  | Pending Verification until the owner verifies or rejects it |
| transaction_reference | varchar(255) |  |  |  | The gateway reference (recorded once) |
| paid_at | timestamptz | Yes | now() |  | When it was paid |
| verified_at | timestamptz |  |  |  | When the owner verified it |
| verified_by | uuid |  |  | FK profiles.id | Who verified it |
| created_at | timestamptz |  | now() |  | When the row was created |

### system_settings

Values the owner can change without a new release, such as the water rate per occupant.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| key | varchar(80) | Yes |  | PK | Name of the setting |
| value | text | Yes |  |  | Its value |
| value_type | varchar(20) | Yes | number |  | How the value is read (number, text) |
| label | varchar(160) | Yes |  |  | Name shown to the owner |
| description | text |  |  |  | What it does |
| business_rule | varchar(20) |  |  |  | The business rule it serves |
| updated_by | uuid |  |  | FK profiles.id | Who last changed it |
| updated_at | timestamptz | Yes | now() |  | When it last changed |

## Requests

### maintenance_tickets

Repair requests, from submission to closing.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit |
| tenant_profile_id | uuid |  |  | FK profiles.id | The tenant who reported it; empty for a repair the owner logged for an empty unit |
| title | varchar(255) | Yes |  |  | Short title |
| description | text | Yes |  |  | What is wrong |
| category | varchar(100) | Yes | General Repair |  | Kind of repair |
| priority | ticket_priority_type (Emergency, High, Medium, Low) | Yes | Medium |  | Low, Medium, High or Urgent |
| status | ticket_status_type (Submitted, In Progress, Resolved, Closed) | Yes | Submitted |  | Submitted, In Progress, Resolved or Closed |
| created_at | timestamptz |  | now() |  | When the row was created |
| resolved_at | timestamptz |  |  |  | When marked done |
| closed_at | timestamptz |  |  |  | When closed |
| closed_by | uuid |  |  | FK profiles.id | Who closed it (the owner, or the tenant who cancelled) |
| assigned_technician | varchar(160) |  |  |  | Who was sent |

### ticket_messages

Notes added to a repair request by the tenant or the owner.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| ticket_id | uuid | Yes |  | FK maintenance_tickets.id | The repair request |
| sender_id | uuid | Yes |  | FK profiles.id | Who wrote it |
| message_body | text | Yes |  |  | The note |
| created_at | timestamptz |  | now() |  | When the row was created |

### ticket_attachments

Photographs attached to a repair request.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| ticket_id | uuid | Yes |  | FK maintenance_tickets.id | The repair request |
| file_url | text | Yes |  |  | Where the photo is kept |
| file_type | varchar(50) |  | image/jpeg |  | JPEG or PNG only |
| uploaded_at | timestamptz |  | now() |  | When it was added |

### inquiries

Questions sent from the public site about a unit.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| room_id | uuid | Yes |  | FK rooms.id | The unit asked about |
| prospect_name | varchar(255) | Yes |  |  | Visitor's name |
| prospect_email | varchar(255) | Yes |  |  | Visitor's email |
| prospect_phone | varchar(50) | Yes |  |  | Visitor's Philippine mobile number |
| message | text | Yes |  |  | The question |
| status | inquiry_status_type (Pending, Contacted, Converted, Closed) | Yes | Pending |  | Pending, answered, closed or converted |
| converted_tenant_id | uuid |  |  | FK profiles.id | The tenant record it became, if the visitor moved in |
| created_at | timestamptz |  | now() |  | When the row was created |
| updated_at | timestamptz |  | now() |  | When it last changed |
| access_token_hash | text |  |  |  | SHA-256 of the secret in the visitor's private link; the secret itself is never stored |
| reference_code | varchar(9) |  |  |  | Short code that, with the visitor's phone number, opens the conversation |

### inquiry_messages

The conversation on an inquiry between the visitor and the owner.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| inquiry_id | uuid | Yes |  | FK inquiries.id | The inquiry |
| sender_id | uuid |  |  | FK profiles.id | The owner, when she wrote it; empty for the visitor |
| sender_name | varchar(255) | Yes |  |  | Name shown on the message |
| message_body | text | Yes |  |  | The message |
| sent_at | timestamptz |  | now() |  | When it was sent |

## System

### notifications

In-app notices to one person, each linked to the record it is about.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| recipient_profile_id | uuid | Yes |  | FK profiles.id | Who it is for |
| title | varchar(255) | Yes |  |  | Title |
| message | text | Yes |  |  | Text |
| type | varchar(100) | Yes | System |  | Kind of notice |
| priority | ticket_priority_type (Emergency, High, Medium, Low) | Yes | Low |  | How prominently it is shown |
| is_read | boolean |  | false |  | Whether it has been opened |
| related_entity_type | varchar(100) |  |  |  | Kind of record it is about |
| related_entity_id | uuid |  |  |  | The record it opens |
| created_at | timestamptz |  | now() |  | When the row was created |

### audit_logs

Every administrator action and sign-in event, with the values before and after. The application can add rows and read them, but cannot change, delete or empty the table.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes | gen_random_uuid() | PK | Primary key |
| actor_profile_id | uuid |  |  | FK profiles.id | Who acted |
| action | varchar(100) | Yes |  |  | What was done (for example PAYMENT_VERIFY) |
| entity_type | varchar(100) | Yes |  |  | Kind of record |
| entity_id | uuid | Yes |  |  | The record |
| previous_values | jsonb |  |  |  | Values before |
| new_values | jsonb |  |  |  | Values after |
| ip_address | varchar(50) |  |  |  | Address the request came from |
| created_at | timestamptz |  | now() |  | When the row was created |

## Backup

### copied_period_backup_031

A copy of rent periods before the correction made by migration 031. No client role can read it.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes |  | PK | Primary key |
| invoice_number | text |  |  |  | Copied from the corrected row |
| old_period_start | date |  |  |  | The value before the correction (period start) |
| old_period_end | date |  |  |  | The value before the correction (period end) |
| new_period_start | date |  |  |  | The value after the correction (period start) |
| new_period_end | date |  |  |  | The value after the correction (period end) |
| corrected_at | timestamptz | Yes | now() |  | When the correction was made |

### date_paid_import_backup_032

A copy of imported payment dates before the correction made by migration 032. No client role can read it.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes |  | PK | Primary key |
| invoice_number | text |  |  |  | Copied from the corrected row |
| old_date_paid | date |  |  |  | The value before the correction (date paid) |
| new_date_paid | date |  |  |  | The value after the correction (date paid) |
| how | text |  |  |  | Copied from the corrected row |
| corrected_at | timestamptz | Yes | now() |  | When the correction was made |

### rent_period_drift_backup_030

A copy of rent periods before the correction made by migration 030. No client role can read it.

| Column | Type | Required | Default | Key | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| id | uuid | Yes |  | PK | Primary key |
| room_id | uuid |  |  |  | The unit |
| year | integer |  |  |  | Copied from the corrected row |
| month | integer |  |  |  | Copied from the corrected row |
| date_paid | date |  |  |  | Copied from the corrected row |
| old_period_start | date |  |  |  | The value before the correction (period start) |
| old_period_end | date |  |  |  | The value before the correction (period end) |
| new_period_start | date |  |  |  | The value after the correction (period start) |
| new_period_end | date |  |  |  | The value after the correction (period end) |
| corrected_at | timestamptz | Yes | now() |  | When the correction was made |
