# HIVELET TECHNICAL ARCHITECTURE

## Recommended Architecture

Use a separated full-stack web application:

Frontend:
- Vue.js
- Vite
- TypeScript
- Tailwind CSS
- A mature component system where appropriate

Backend:
- Node.js
- Express.js
- TypeScript

Database:
- MySQL

Payment:
- Adyen API for optional GCash payment flow

Deployment:
- University-provided server
- Environment variables for secrets
- HTTPS in production where available

## Why This Architecture

The project is a real-time web application that must:
- run on a real server
- expose a public website
- support authenticated dashboards
- enforce backend authorization
- process financial workflows
- integrate with Adyen
- support relational data
- remain understandable to the development team

A conventional Vue + Node/Express + MySQL architecture is appropriate for the project scope.

## Important Architecture Rule

The frontend is not a security boundary.

Every protected operation must be validated and authorized by the backend.

## Suggested Layers

Frontend:
- pages/views
- reusable components
- composables
- API client
- authentication state
- validation
- offline cache layer

Backend:
- routes/controllers
- services/business logic
- validation
- authorization
- database repositories/queries
- payment integration
- audit logging
- notification logic

Database:
- relational schema
- foreign keys
- indexes
- timestamps
- status fields
- historical records

## Financial Integrity

Financial calculations must be based on server-side authoritative data.

The frontend may display calculations but must not be trusted to define financial truth.

## Payment Integration

Adyen integration must be isolated in a dedicated backend service.

Secrets must never be exposed to the frontend.

Payment callbacks/webhooks must be validated and handled safely.

The administrator verification workflow must remain respected.

## Offline/PWA Boundary

Offline capability is moderate and read-oriented.

Do not permit offline financial mutations that can later create conflicting transactions.

## Deployment

The system must be deployable to the university server.

The production environment must use environment variables for:
- database credentials
- authentication secrets
- Adyen credentials
- other sensitive configuration

No secrets may be committed to Git.
