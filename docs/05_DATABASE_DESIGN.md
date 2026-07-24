# HIVELET DATABASE DESIGN

This is the conceptual database blueprint. Exact column names and SQL should be finalized before implementation.

## Core Entities

### users
Authentication identities.

Suggested concepts:
- id
- email/username
- password hash
- role
- status
- created_at
- updated_at
- last_login_at

### tenant_profiles
Personal information belonging to a tenant/person.

Suggested concepts:
- id
- user_id
- full_name
- phone numbers
- emergency contact
- occupation
- Facebook/contact information
- status
- created_at
- updated_at

### rooms
Property units.

Suggested concepts:
- id
- room_number
- floor
- room_type
- description
- capacity
- base_price
- current_price
- operational_status
- visibility_status
- available_from
- created_at
- updated_at

### room_price_history
Historical pricing.

Suggested concepts:
- room_id
- previous price
- new price
- effective date
- reason
- created_by

The 2% annual increase rule must be represented transparently rather than silently overwriting history.

### room_assignments
Historical and current relationships between tenants/contacts and rooms.

Suggested concepts:
- room_id
- tenant_profile_id
- start_date
- end_date
- role/contact relationship
- active status

### inquiries
Public inquiries.

Suggested concepts:
- id
- room_id
- prospect information
- message
- status
- timestamps
- converted tenant reference where applicable

### inquiry_messages
Messages related to inquiries.

### bills
Financial obligations.

Suggested concepts:
- id
- room_id
- tenant/primary contact reference
- bill type
- billing period
- amount
- due date
- status
- created_at

Bill types may include:
- rent
- water
- other approved bill types

### payments
Payment records.

Suggested concepts:
- id
- bill_id where applicable
- room_id
- amount
- payment method
- source
- verification status
- payment reference
- paid_at
- verified_at
- created_by

### expenses
Outgoing money.

Suggested concepts:
- id
- category
- amount
- description
- room_id nullable
- date
- payment method
- created_by

### maintenance_tickets
Issue records.

Suggested concepts:
- id
- room_id
- tenant_id
- title
- description
- priority
- status
- created_at
- resolved_at
- closed_at

### ticket_attachments
Photos and other permitted attachments.

### conversations/messages
Internal communication.

Messages should be linked to an appropriate context such as:
- inquiry
- ticket
- tenant relationship

### notifications
System notifications.

Suggested concepts:
- recipient
- type
- priority
- read status
- related entity
- created_at

### audit_logs
Immutable activity history.

Suggested concepts:
- actor
- action
- entity type
- entity id
- previous value
- new value
- timestamp
- metadata

## Database Rules

1. Use foreign keys where appropriate.
2. Do not rely only on frontend validation.
3. Use indexes for frequently searched fields.
4. Preserve historical records.
5. Avoid duplicate active relationships.
6. Use transactions for multi-step financial operations.
7. Use server timestamps for authoritative events.
8. Never store plaintext passwords.
9. Never store payment secrets in the database.
10. Avoid hard deletion of important financial and historical records.
