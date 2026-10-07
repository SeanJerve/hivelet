# 5. Backend Schema: Where the Data Lives and Who Can See It

Read from the live database's own catalogue on 7 October 2026 (`information_schema`, `pg_constraint`,
`pg_index`, `pg_trigger`, table grants), as `CLAUDE.md` requires. **`database/FULL_DATABASE_SCHEMA.sql`
does not describe this database; never use it as a source.** Chapter 4's Figure 9 (ERD) and Table 7A
(data dictionary extract) are drawn from the same catalogue.

---

## 1. Where data lives

| Place | What is there | Who can reach it |
| :--- | :--- | :--- |
| **Supabase PostgreSQL 17.6** | Every record: units, people, tenancies, receipts, expenses, bills, payments, repairs (with photos stored inside the record), inquiries, notifications, the audit trail | Only the Hivelet API, with the service key. The public keys can read and write nothing |
| **Adyen** | GCash payment details and the payment itself | The tenant types into Adyen's own form; Hivelet stores only Adyen's reference and the amount |
| **The person's own browser** | The sign-in token; on an installed app, a read-only copy of the figures that person's screens last loaded (`lib/offlineCache.ts`) | That person's device only; the copy is wiped at sign-out or when someone else signs in |
| **Team machine backups** | `npm run backup` writes every table as JSON to `backups/<time>/` before any data change | Gitignored, never pushed: it holds tenants' personal data |
| **Vercel** | The built app and the API's request logs | The project's Vercel owner |

## 2. The tables (24)

Twenty-one hold the business; three are backups made during data corrections. Approximate rows as of
7 October 2026.

| Group | Table | Rows | What it holds |
| :--- | :--- | --: | :--- |
| Property | `rooms` | 33 | Unit number, floor, cluster, kind, capacity, current rate, status, public visibility |
| | `clusters`, `property_areas` | small | Boarding House, Back Apartment, Front Apartment, Penthouse, Linda; the areas expenses are split across |
| | `room_photos` | small | Photos and floor-plan images per unit, one primary |
| | `room_price_history` | 31 | Every rate change: old, new, when, who (written by a database trigger) |
| People | `profiles` | 35 | Everyone with an account or record: name, email, phone, emergency contact, occupation, role, account status, password hash, lockout counters, login ID |
| | `room_assignments` | 37 | Tenancies: unit, tenant, start and end dates, anniversary date, deposit, occupants |
| Money | `monthly_income_records` | 953 | The owner's income sheet, one row per receipt (Table 7A in Chapter 4) |
| | `monthly_expense_entries`, `expense_property_allocations` | 1,262 / 1,327 | The expense sheet: one entry, split across areas |
| | `fixed_expense_categories` | 13 | Her numbered categories (with 6a, 6b, 6c) |
| | `bills`, `payments` | 9 / 19 | Bills raised on demand; online and recorded payments with verification status |
| | `system_settings` | small | Rates the owner can change (₱200 water per occupant) |
| Requests | `maintenance_tickets`, `ticket_messages`, `ticket_attachments` | small | Repairs, notes, photos |
| | `inquiries`, `inquiry_messages` | small | Visitors' questions and the conversation; the private link stored only as a SHA-256 hash |
| System | `notifications` | 48 | In-app notices per person |
| | `audit_logs` | ~17,900 | Every administrator action and sign-in event, with before and after values |
| Backups | `copied_period_backup_031`, `date_paid_import_backup_032`, `rent_period_drift_backup_030` | | Copies kept from three data corrections; no client role can read them |

37 foreign keys join the public tables (plus one from `profiles` to Supabase's own `auth.users`).
Every bill, payment, receipt, tenancy, repair and inquiry belongs to one unit; tenancies, bills and
payments belong to one person.

## 3. Personal data

| Kind | Where | Seen by |
| :--- | :--- | :--- |
| Tenant name, phone, email, emergency contact, occupation | `profiles` | The tenant (their own) and the administrator |
| Tenancy: unit, dates, deposit, occupants | `room_assignments` | The tenant (own) and the administrator; the deposit is not shown on tenant screens yet |
| Payments and receipts | `monthly_income_records`, `payments`, `bills` | The tenant (own, voided receipts hidden) and the administrator |
| Visitor name, email, phone, question | `inquiries` | The administrator, and the visitor through their link or code |
| Password | `profiles.password_hash` | Nobody: bcrypt hash only |
| Addresses of requests | `audit_logs.ip_address` | The developers, in the database only |

**The public site never shows a tenant's name.** `check:ledger` verifies it on every run against all 33
published units (BR-024).

## 4. Who can see what

Enforced on the server from one permission matrix (`backend/src/config/rbac.ts`); the browser's menus
are only convenience. A tenant asking for someone else's record gets "not found".

| Function | Visitor | Tenant | Administrator |
| :--- | :---: | :---: | :---: |
| Public site, units and rates | Yes | Yes | Yes |
| Send an inquiry and read the reply | Yes | Yes | Yes |
| Own details and password | No | Own | Own |
| Unit, bills, payments, receipts | No | Own | All |
| Pay online with GCash | No | Own | No |
| Repairs: send, follow, cancel | No | Own | All, and dispatch or close |
| Notifications | No | Own | Own |
| Units and rates, tenants, ledgers, verification, downloads, inquiries | No | No | Yes |

A prospect holds a visitor's permissions.

## 5. Protection in layers

1. **API checks**: sign-in token (HS256), role from the token never from the request, a schema for
   every write, rate limits on public writes and failed sign-ins.
2. **Database**: row-level security on all 24 tables with no policy, and no grant to the public roles,
   so only the server's service role reads or writes. Supabase's security advisor raises no warning.
3. **Rules the database itself enforces**, whatever the program does:

| Rule | How |
| :--- | :--- |
| One active tenancy per unit | Unique index on `room_assignments(room_id)` where active |
| An invoice number once per unit and month among standing receipts ("ACK" slips exempt) | Partial unique index |
| A gateway reference recorded once | Partial unique indexes on income records and payments |
| One bill per tenant per period | Unique index |
| The 50% Share and Remitted can never disagree with the rent and water beside them | Generated columns: `rent_amount / 2.0` (a system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet) and `rent_amount + water_payment` |
| Every rate change recorded | Trigger `trg_record_room_price_change` |
| An expense entry's total equals its allocations | Trigger `trg_update_expense_total` |
| Linda's water filed in Linda's column | Trigger `trg_route_linda_water` |
| Emails, phone logins, login IDs and unit numbers unique | Unique indexes (case and format normalised) |

## 6. Keeping, correcting and deleting

- **Financial records are voided, never deleted**: a voided receipt keeps its row, its reason and who
  voided it, and leaves every total. Historical receipts stay exactly as the owner wrote them.
- **The audit trail** cannot be changed or row-deleted by the application: its role holds INSERT and
  SELECT, not UPDATE or DELETE. **One gap, found 7 October 2026:** the role still holds TRUNCATE,
  which would empty the whole table. Nothing in the application calls it, and Supabase's REST interface
  does not offer it. Migration `080_audit_log_no_truncate.sql` revokes it (written, not yet applied: B-104).
- **Inquiries** can be deleted by the administrator (audited).
- **Moved-out tenants** keep their records; their accounts are deactivated.
- Every change to live data is a reviewed, numbered migration run after a backup.

## 7. Law and promises

The system holds personal data under the **Data Privacy Act of 2012 (Republic Act No. 10173)**. The
privacy policy at `/privacy` says what is collected, why, who receives it and how to ask about it.
Survey answers collected for the study had their names removed before analysis (B-103).
