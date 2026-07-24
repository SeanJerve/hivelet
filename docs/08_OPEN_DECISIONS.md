# HIVELET OPEN DECISIONS

This file is intentionally kept for decisions that must be finalized before the related implementation.

## 1. Final exact monthly billing generation behavior

Need to finalize:
- whether bills are generated automatically on schedule
- how the system handles missed generation
- whether an administrator can regenerate safely

## 2. Exact water billing relationship

The business rule is ₱200 per person.

Need to finalize the exact record used for the number of persons charged:
- registered occupants
- agreed room occupants
- another administrator-defined count

## 3. Exact payment verification workflow

Need to finalize:
- what evidence the administrator reviews
- what statuses exist
- what happens when a payment is rejected

## 4. Exact Adyen/GCash production workflow

Must be finalized against the actual Adyen configuration and sandbox/production requirements before integration.

## 5. Exact report export formats

Candidate formats:
- CSV
- Excel-compatible spreadsheet
- PDF

## 6. Exact notification priority rules

Need to define which events are:
- urgent
- normal
- informational

## 7. Exact communication retention rules

Need to define how long messages and attachments are retained.

## 8. Exact tenant reactivation workflow

The intended direction is reuse of an existing historical tenant record without creating a duplicate.

The exact reactivation flow must be finalized before implementation.

## 9. Exact room price increase workflow

The business rule is a 2% increase after at least one year of tenancy.

Need to finalize:
- whether the increase applies automatically or requires administrator confirmation
- the exact effective date
- rounding behavior
