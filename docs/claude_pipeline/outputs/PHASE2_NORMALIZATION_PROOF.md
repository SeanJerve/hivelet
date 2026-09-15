# PHASE 2 — NORMALIZATION PROOF (1NF / 2NF / 3NF)

**Hivelet — Fe Galang Da Silva Boarding House**
Bicol University College of Science | Capstone Project 2 | Group 4
Database Administrator: John Lloyd Cuario

---

## 1. What is being claimed, and how it was tested

This document argues the normal form of the **21 live tables**, using
`database/live_schema.csv` (read from the production catalogue on 2026-09-13) as the structural
source and the production rows themselves as evidence.

**The claim is not "the schema is perfectly normalized".** A proof that concedes nothing is a proof
nobody believes. The claim is narrower and stronger:

> **20 of the 21 tables are in Third Normal Form. One — `rooms` — carries a genuine transitive
> dependency. Six columns across four tables are deliberate, declared denormalizations, each of
> which is either maintained by the database itself or is a point-in-time snapshot whose whole
> purpose is to *not* track its source.**

Every dependency asserted below was tested with a query against the live data, and the query result
is given. Where a dependency holds in the data, that is stated as evidence — not as proof, since
data can be coincidentally consistent. Where it fails, the count of failures is given.

**Method for finding candidates.** Rather than inspect columns by intuition, three mechanical sweeps
were run over the catalogue:

1. Every column of type array or composite (a 1NF risk) — `pg_type.typcategory = 'A'` or
   `typtype = 'c'`.
2. Every column with a generation expression or a default that references another column
   (`pg_attribute.attgenerated`, `pg_attrdef`).
3. Every non-key column whose name suggests it restates a fact available elsewhere — totals, shares,
   counts, names, flags — each then tested by query.

---

## 2. First Normal Form

**1NF requires:** every attribute holds a single atomic value drawn from a single domain; no
repeating groups; no multi-valued attributes; each row uniquely identifiable.

### 2.1 No arrays, no composites — verified mechanically

```sql
SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND a.attnum > 0 AND NOT a.attisdropped
  AND (t.typcategory = 'A' OR t.typtype = 'c');
```

**Result: zero rows.** Not one column in the schema is an array type or a composite type. There is
no `room_ids TEXT[]`, no comma-separated occupant list, no `"amounts"` tuple. Repeating groups were
resolved into child tables at design time — `expense_property_allocations` is the clearest example:
the spreadsheet's five side-by-side Property Area columns became five *rows*, which is exactly the
1NF transformation.

**Every table has a primary key**, so every row is uniquely identifiable. Seventeen use a surrogate
`UUID`; four use a single-attribute natural key (`clusters.code`, `fixed_expense_categories.code`,
`property_areas.code`, `system_settings.key`).

### 2.2 The JSONB columns do not break 1NF

`audit_logs.previous_values` and `audit_logs.new_values` are `JSONB`, and a JSONB value plainly has
internal structure. The question is whether that structure is a *repeating group of this relation's
own attributes*, which is what 1NF forbids.

It is not. The audit entity's attributes are *who, what, when, which row, from where*. The JSONB
holds a **snapshot of a different relation's row**, whose shape is not known until runtime because
`entity_type` names one of nine domain labels, not a table — `PROFILE`, `ROOM`, `ROOM_ASSIGNMENT`, `INQUIRY`, `BILL`, `PAYMENT`, `INCOME_RECORD`, `EXPENSE_ENTRY`, `TICKET`, declared as a TypeScript union in `auditService.ts` and unconstrained by the database (`VARCHAR(100)`, no `CHECK`). *This read “any of twenty tables” until 2026-09-15.* The document is opaque to the audit relation: no audit
query decomposes it, joins on it, or aggregates it — it is retrieved and displayed whole.

The 1NF-respecting alternative is an `audit_log_values(log_id, column_name, old_value, new_value)`
child table. That would be a textbook Entity-Attribute-Value design: it would force every value in
the system through `TEXT`, destroying the type information the diff exists to preserve, and it would
turn one insert into *n*. The JSONB column is the better engineering decision, and it is a
*value*, atomic at the level this relation reasons about.

### 2.3 The one genuine 1NF weakness: `monthly_expense_entries.or_supplier`

This is conceded rather than defended.

The column is `TEXT NOT NULL` and its name declares its own problem — **"OR"** (official receipt
number) **"or supplier"**. Those are two different facts from two different domains, and the live
data holds both, plus several others. Real values from the 1,262 rows:

| Value | What it actually contains |
| :--- | :--- |
| `101 Shoping mall` | A supplier name |
| `101 Shoping Mall` | The **same** supplier, differently capitalised |
| `13th month pay (michelle Cuario)` | An expense description **and** a payee |
| `4th quareter SMR (Atty.Lawenko)` | A period, a document type **and** a payee |
| `3f electricbill (vacant)` | A unit, a utility **and** an occupancy note |
| `(mar.24-26)` | A date range only |

**797 distinct values across 1,262 rows.** A column that can hold a receipt number, a supplier, a
payee, a period, or a parenthetical note is not drawing from a single domain.

**Assessment.** Strictly, this is a 1NF atomicity violation. Practically, it is a faithful transfer
of a handwritten ledger column, and it is the *only* place the supplier is recorded at all, so no
information is lost — it is merely not queryable. The consequence is real and should be stated to
the panel: **you cannot reliably total spending by supplier**, because `101 Shoping mall` and
`101 Shoping Mall` are different strings.

The fix — a `suppliers` table plus a separate `receipt_number` column — is **not proposed for this
phase**. It would require re-keying 1,262 historical rows against a supplier list that does not
exist, and it changes no figure in any report. It is recorded here as known, bounded, and
deliberately deferred.

> **1NF verdict: satisfied for 20 tables. `monthly_expense_entries` satisfies it structurally
> (no repeating groups, atomic storage) but its `or_supplier` column violates the single-domain
> requirement in substance. Declared, not hidden.**

---

## 3. Second Normal Form

**2NF requires:** 1NF, plus no non-key attribute is functionally dependent on only *part* of a
candidate key. **A partial dependency is only possible when a candidate key is composite.**

### 3.1 Key structure

| Key shape | Tables | 2NF risk |
| :--- | :--- | :--- |
| Single-attribute surrogate `UUID` PK | 17 | **None, by construction** |
| Single-attribute natural PK | 4 — `clusters.code`, `fixed_expense_categories.code`, `property_areas.code`, `system_settings.key` | **None, by construction** |

Twenty of the 21 tables have **no composite candidate key at all**. For those, 2NF follows
immediately from 1NF: there is no "part of the key" for an attribute to depend on.

This is not an accident of convenience — it is the surrogate-key discipline applied consistently, and
it is why the 2NF section of this proof is short rather than laboured.

### 3.2 The one composite candidate key

`expense_property_allocations` has a surrogate PK (`id`) **and** a composite candidate key from
`UNIQUE (expense_entry_id, property_area)` — the rule that one expense entry may charge a given
Property Area at most once (BR-044).

> **Provenance warning.** That constraint exists in **production** and appears nowhere in
> `FULL_DATABASE_SCHEMA.sql` — it is drift 7, found during this phase by an `ON CONFLICT` clause
> failing with `42P10` on a database built from the repository. The entire 2NF argument below rests
> on a constraint that no file in this repository creates. It is now reproduced by
> `_TEST_FIXTURE_production_drift.sql`, but **it still needs a migration of its own** so that a
> rebuilt database has it. Recorded as a Phase 3 item.

2NF must be checked against that candidate key. Its non-key attributes:

| Attribute | Depends on | Full or partial? |
| :--- | :--- | :--- |
| `amount` | *both* `expense_entry_id` and `property_area` | **Full.** The amount is meaningless without both: "₱5,688.67" is only a fact once you say *which entry* and *which area*. |
| `created_at` | both (it is a property of the allocation row) | **Full.** |

Neither attribute depends on `expense_entry_id` alone or `property_area` alone. The real
spreadsheet row makes this concrete: the `4-Jun-26 Electricbill (May26)` entry splits to
**₱14,964.13** Boarding House and **₱5,688.67** Main House. Entry alone does not determine either
figure; area alone certainly does not.

> **2NF verdict: satisfied by all 21 tables.**

---

## 4. Third Normal Form

**3NF requires:** 2NF, plus no non-key attribute is transitively dependent on the primary key —
that is, no non-key attribute is functionally determined by another non-key attribute.

This is where the schema has something to answer for, so each candidate is taken in turn.

### 4.1 The taxonomy that matters

"Derived column" is not one thing. Three cases behave completely differently under 3NF, and the
difference is **who guarantees the value**:

| Class | Guarantor | Can it drift? | 3NF standing |
| :--- | :--- | :--- | :--- |
| **A — Generated** | PostgreSQL (`GENERATED ALWAYS AS … STORED`) | **No.** Physically impossible; the column cannot even be written. | Not a violation. The dependency is *declared to the DBMS*, which is what 3NF is protecting against. |
| **B — Trigger-maintained** | A database trigger | Only if the trigger is dropped or bypassed by a path it does not cover | Technically a violation; practically contained. Must be declared. |
| **C — Application-maintained** | Application code | **Yes** — any bug or any direct SQL write breaks it | A genuine violation. Must be declared and justified. |

### 4.2 Every derived column, classified

| Column | Derivation | Class | Live evidence |
| :--- | :--- | :-- | :--- |
| `monthly_income_records.fifty_percent_share` | `rent_amount / 2.0` | **A** | 937 of 937 rows match exactly; 0 rows hold `0.00` |
| `monthly_income_records.remitted_amount` | `rent_amount + water_payment` | **A** | 937 of 937 rows match exactly |
| `monthly_expense_entries.total_expenses` | `SUM(allocations.amount)` | **B** — `trg_update_expense_total` | **0 of 1,262** entries disagree with their allocations |
| `bills.total_amount` | `rent_amount + water_amount` | **C** | 0 of 2 rows disagree — but *n* = 2, which is no evidence at all |
| `bills.grace_period_end_date` | `due_date + grace_period_days` | **C** | Depends on `system_settings`, a value outside the row. See §4.6 |
| `rooms.is_linda_unit` | `cluster_code = 'Linda'` | **C** | **0 of 33** rooms disagree — see §4.3 |

**Class A is the interesting result**, and it corrects the project's own record. Both columns are
`GENERATED ALWAYS AS (…) STORED` in production. The value is not stored redundantly in the sense 3NF
cares about: the dependency is *declared in the schema*, the DBMS enforces it, and the application
is **forbidden** from writing the column. This is the strongest possible answer to a panel question
about `fifty_percent_share` — it cannot be wrong, because nothing is permitted to set it.

> `fifty_percent_share` is a system-computed figure equal to half the row's Rent Amount, retained so
> the ledger reconciles line-for-line with Column 6 of the historical spreadsheet (BR-035). No
> party, recipient or purpose is modelled or implied.

**Class B** — `total_expenses` — is defensible. The trigger fires `AFTER INSERT OR UPDATE OR DELETE`
on the allocations, so every path that changes a child updates the parent, and 1,262 rows agree with
their children. BR-045 already names the value as derived. It is kept because the expense report
reads entry totals far more often than it re-sums allocations, and because the historical spreadsheet
carried the same total.

### 4.3 A genuine 3NF violation: `rooms.is_linda_unit`

**This one is a real transitive dependency and is not defended.**

```
rooms.id  →  cluster_code  →  is_linda_unit
```

`is_linda_unit` is a fact about the **cluster**, not about the room. It is `TRUE` exactly when
`cluster_code = 'Linda'`, tested across all 33 units:

```sql
SELECT count(*) FROM public.rooms WHERE is_linda_unit <> (cluster_code = 'Linda');
-- 0
```

Zero exceptions. The column is functionally determined by another non-key attribute, which is the
textbook definition of the violation 3NF exists to prevent. The practical risk is the usual one: the
two can be updated independently, so a unit can be moved out of the Linda cluster while keeping the
flag, and BR-040's fixed-rate billing would then apply to the wrong room.

**Why it is still there, stated plainly:** the flag is read by `backend/src/routes/public.ts:32`,
`backend/src/routes/tenant.ts:55` and `frontend/src/lib/systemState.ts:351`. Removing it is a
four-file change with no functional gain in this phase.

**The 3NF-correct form** is to delete the column and derive it:

```sql
-- the fact belongs to the cluster
ALTER TABLE public.clusters ADD COLUMN uses_fixed_rate_billing boolean NOT NULL DEFAULT false;
UPDATE public.clusters SET uses_fixed_rate_billing = true WHERE code = 'Linda';
ALTER TABLE public.rooms DROP COLUMN is_linda_unit;
```

Recorded as a Phase 3 item. It is listed as a **known deviation**, not as a claim of compliance.

### 4.4 Snapshot columns are not transitive dependencies

Two columns look like violations and are not. The distinction matters and is worth making precisely.

| Column | Apparent determinant | Why it is not a transitive dependency |
| :--- | :--- | :--- |
| `monthly_income_records.contact_name` | `tenant_profile_id → profiles.full_name` | The attribute is *"the payer's name **as written on this receipt**"*. It is a fact about the **transaction**, not about the person. If a tenant later marries and changes their name, every historical receipt must keep the name that was on it — a ledger that silently rewrites its own history is a worse defect than a redundant column. |
| `monthly_income_records.occupants` | `assignment_id → room_assignments.occupant_count` | The attribute is *"the headcount **this row's water charge was computed from**"* (BR-034). The current headcount is a different fact and changes over time. Recomputing a 2023 water charge from a 2026 headcount would falsify the ledger. |

Both columns are **temporally distinct attributes that happen to share a value with their source at
the moment of writing**. A functional dependency must hold for all time, not at one instant; these
do not, by design.

**Honest caveat.** `contact_name` currently equals `profiles.full_name` in **583 of 583** rows that
have a profile — there is not yet a single counterexample in the live data. The argument above is
therefore a *design* argument, not one the data can corroborate. It should be presented that way:
the column is justified by what it must survive, not by what it currently differs from.

### 4.5 `year` and `month` are not derivable — proven

An obvious challenge is that `monthly_income_records.year` / `month` merely restate a date. Tested:

| Test | Rows failing |
| :--- | ---: |
| `year`/`month` ≠ year/month of `rent_period_start` | **88** |
| `year`/`month` ≠ year/month of `date_paid` | **254** |

Neither derivation holds. The ledger period is an **independent business attribute**: rent is
collected in the closing days of a month for the month ahead (OD-03), so money received on
28 December can belong to the January ledger, and a late-entered row can belong to an earlier period
than its `date_paid`. The columns record a decision, not a restatement.

This is the cleanest 3NF result in the schema, and it is worth offering at the defense **before**
being asked.

### 4.6 `bills.grace_period_end_date` — Class C, and entangled with an open question

The value is `due_date + system_settings.grace_period_days`. Two observations:

1. The determinant lives in **another table**, so this is not a transitive dependency *within* the
   relation — strictly it does not violate 3NF. What it does violate is the single-source principle:
   changing the setting does not move existing rows' grace dates.
2. **This is arguably correct.** A bill issued under a 7-day grace should keep its 7-day grace when
   the policy changes. The stored date is the *terms of that bill*, like an interest rate on a loan.

Left as-is deliberately. It is, however, tangled with **OD-16**, which is open: the seeded
`grace_period_days = 7` and BR-012 describe a grace window, while OD-03's answer states that late
payment is not accepted at all. Until that is resolved, `billingService` cannot be specified, and
this column's semantics are provisional.

### 4.7 `rooms.current_price` and `room_price_history`

`current_price` is in principle derivable as the most recent `room_price_history.new_price` with
`effective_date <= CURRENT_DATE`.

**It is not, today.** `room_price_history` holds **0 rows**. `current_price` is not a cached
projection of a history that exists — it is the *only* record of the rate. ARCH-004 is a design
target that no rate change has yet exercised.

Retaining `current_price` is correct regardless: deriving the live rate through a `MAX(effective_date)`
subquery on every room listing is a performance cost for no integrity gain, and the column is the
authoritative value at the moment of a booking. **No violation, on the current data.** Once
`room_price_history` is populated in Phase 3, the two must be kept in step and the relationship
re-examined.

### 4.8 Two facts deliberately *not* stored

Worth stating, because their absence is the reason two potential violations do not exist:

- **The cumulative expense total (OD-07).** Computed per calendar year with a window function
  partitioned by year. **No column, no roll-forward job.** Had it been stored, it would be a
  textbook transitive dependency on the rows it summarises and would drift the first time a row was
  voided.
- **Net rental income.** Computed as the sum of allocations whose area has `is_rental_expense = TRUE`
  (OD-05). Not stored anywhere. This is what allows the ₱3.43M of personal expenditure to be excluded
  from Net Operating Income without a reconciliation job.

### 4.9 `property_areas.is_rental_expense` is not a violation

`is_rental_expense` is determined by `code`, which is the **primary key**. A non-key attribute
depending on the key is not a transitive dependency — it is the definition of a normalized fact.
The table exists precisely to hold it.

---

## 5. Per-table verdict

| # | Table | 1NF | 2NF | 3NF | Note |
| :-- | :--- | :-: | :-: | :-: | :--- |
| 1 | `clusters` | ✔ | ✔ | ✔ | |
| 2 | `rooms` | ✔ | ✔ | **✘** | `is_linda_unit` transitively determined by `cluster_code` (§4.3) |
| 3 | `room_photos` | ✔ | ✔ | ✔ | |
| 4 | `room_price_history` | ✔ | ✔ | ✔ | 0 rows |
| 5 | `profiles` | ✔ | ✔ | ✔ | |
| 6 | `room_assignments` | ✔ | ✔ | ✔ | |
| 7 | `inquiries` | ✔ | ✔ | ✔ | |
| 8 | `inquiry_messages` | ✔ | ✔ | ✔ | `sender_name` is a snapshot (§4.4 reasoning) |
| 9 | `bills` | ✔ | ✔ | ✔* | `total_amount` Class C denormalization (§4.2) |
| 10 | `payments` | ✔ | ✔ | ✔ | |
| 11 | `monthly_income_records` | ✔ | ✔ | ✔* | 2 Class A generated columns; 2 snapshots (§4.2, §4.4) |
| 12 | `fixed_expense_categories` | ✔ | ✔ | ✔ | Self-referencing hierarchy is not a transitive dependency |
| 13 | `monthly_expense_entries` | **✘**† | ✔ | ✔* | `or_supplier` (§2.3); `total_expenses` Class B (§4.2) |
| 14 | `expense_property_allocations` | ✔ | ✔ | ✔ | The one composite candidate key (§3.2) |
| 15 | `property_areas` | ✔ | ✔ | ✔ | |
| 16 | `maintenance_tickets` | ✔ | ✔ | ✔ | |
| 17 | `ticket_attachments` | ✔ | ✔ | ✔ | |
| 18 | `ticket_messages` | ✔ | ✔ | ✔ | |
| 19 | `notifications` | ✔ | ✔ | ✔ | Polymorphic reference — an integrity gap, not a normalization one |
| 20 | `audit_logs` | ✔ | ✔ | ✔ | JSONB defended at §2.2 |
| 21 | `system_settings` | ✔ | ✔ | ✔ | Key-value by design; `business_rule` is documentation |

`✔*` = in 3NF apart from a **declared** denormalization, named in the cited section.
`†` = structurally 1NF; violates the single-domain requirement in substance.

**Totals: 1NF 20/21 · 2NF 21/21 · 3NF 20/21.**

---

## 6. What strict 3NF would require

Three changes, none of which is proposed for Phase 2:

| Change | Fixes | Cost |
| :--- | :--- | :--- |
| Move `is_linda_unit` onto `clusters` as `uses_fixed_rate_billing` and drop it from `rooms` | §4.3, the one genuine violation | 1 migration + 4 source files |
| Convert `bills.total_amount` to `GENERATED ALWAYS AS (rent_amount + water_amount) STORED` | §4.2 Class C → Class A | 1 migration; the pattern is already proven in `monthly_income_records` |
| Split `or_supplier` into `receipt_number` + `supplier_id` → a new `suppliers` table | §2.3 | 1 migration + re-keying 1,262 historical rows against a supplier list that does not yet exist |

The second is cheap and strictly improves the defense: it converts an application-maintained total
into one the database guarantees, using a mechanism this schema already demonstrates. It is
recommended for Phase 3.

---

## 7. Summary for the defense

1. **Every repeating group was resolved into a child table.** The strongest single piece of evidence
   is `expense_property_allocations`: five side-by-side spreadsheet columns became rows, and the
   split that OD-05 depends on is only expressible because of it.
2. **2NF is satisfied everywhere, by construction.** Twenty of 21 tables have no composite candidate
   key, so partial dependency is impossible. The one that does was checked explicitly.
3. **3NF holds in 20 of 21 tables.** The exception is named, measured (0 of 33 rows disagree, so it
   is a structural risk rather than live corruption), and given a concrete fix.
4. **Derived values are classified by who guarantees them.** Two are guaranteed by PostgreSQL and
   cannot drift; one by a trigger, verified across 1,262 rows; two by the application and declared as
   such.
5. **The most important normalization decisions in this project were decisions *not* to store
   things** — the yearly cumulative and net rental income are both computed, which is why neither can
   fall out of step with the ledger that produces it.

---

*Phase 2 deliverable. Companion documents: `PHASE2_ERD_AND_DATA_DICTIONARY.md`,
`PHASE2_SECURITY_AND_RLS.md`. Binding canon: `PHASE1_LOCKED_DECISIONS.md`,
`PHASE2_LOCKED_DECISIONS.md`.*
