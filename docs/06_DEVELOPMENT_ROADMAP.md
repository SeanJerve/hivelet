# HIVELET DEVELOPMENT ROADMAP

## Phase 0 — Documentation Lock

Before coding:
- read all documentation
- resolve contradictions
- finalize database schema
- finalize business rules
- finalize authentication design

Deliverable:
- approved documentation set

## Phase 1 — Project Foundation

Build:
- frontend
- backend
- database connection
- environment configuration
- base error handling
- validation
- logging
- project structure

Test:
- frontend starts
- backend starts
- database connects

## Phase 2 — Authentication and Authorization

Build:
- admin authentication
- tenant authentication
- password security
- account status
- backend role authorization

Test:
- unauthorized users cannot access protected routes
- tenants cannot access admin endpoints
- inactive tenants cannot access active tenant functions

## Phase 3 — Rooms

Build:
- room CRUD
- room statuses
- visibility
- photos
- amenities
- pricing
- price history
- availability date

Test:
- public website reflects room status correctly
- reserved rooms cannot receive inquiries

## Phase 4 — Tenant and Occupancy

Build:
- tenant records
- room assignment
- account lifecycle
- duplicate prevention
- vacancy workflow
- returning tenant handling

## Phase 5 — Public Website and Inquiries

Build:
- property pages
- room listings
- inquiry forms
- inquiry dashboard
- inquiry communication
- conversion workflow

## Phase 6 — Billing and Payments

Build:
- rent billing
- water billing
- due dates
- overdue status
- grace period
- manual payments
- verification workflow

## Phase 7 — Adyen Payment Integration

Build:
- payment initiation
- secure server-side integration
- callback/webhook handling
- pending verification workflow
- payment reference handling

Test with sandbox/test environment before production.

## Phase 8 — Expenses and Financial Analytics

Build:
- categorized expenses
- room allocation
- income
- expenses
- net cash flow
- graphs
- live reports
- exports

## Phase 9 — Maintenance and Communication

Build:
- ticket creation
- photos
- priority
- status
- tenant-admin messages
- administrator closure

## Phase 10 — Notifications and Audit

Build:
- in-system notifications
- read/unread state
- activity logs
- financial audit logs

## Phase 11 — Offline-Ready/PWA Layer

Build only safe moderate offline functionality.

Do not implement offline financial transactions.

## Phase 12 — Testing and ISO/IEC 25010 Evaluation Preparation

Test:
- functional suitability
- usability
- security
- performance efficiency
- compatibility
- reliability
- maintainability
- portability

## Phase 13 — Server Deployment

Deploy to the university-provided server.

Verify:
- public website
- admin dashboard
- tenant dashboard
- database
- HTTPS/configuration
- payment integration environment
- backups
- logs

## Phase 14 — Final Hardening

- fix defects
- remove debug data
- verify audit logs
- verify permissions
- verify exports
- verify mobile responsiveness
- verify production configuration
