# AI DEVELOPMENT INSTRUCTIONS

You are implementing Hivelet from the project documentation.

## Before Coding

Read:
1. `01_SYSTEM_BIBLE.md`
2. `02_BUSINESS_RULES.md`
3. `03_REQUIREMENTS.md`
4. `04_ARCHITECTURE.md`
5. `05_DATABASE_DESIGN.md`
6. `06_DEVELOPMENT_ROADMAP.md`

Do not begin major implementation until the relevant documentation is understood.

## Development Behavior

Do not:
- invent major business rules
- silently change requirements
- create disconnected mock features
- bypass backend authorization
- expose secrets
- hardcode production credentials
- use fake payment success as real payment confirmation
- delete historical financial data silently
- create duplicate tenant records unnecessarily

Do:
- implement incrementally
- keep features connected
- validate server-side
- create reusable components
- preserve historical data
- add audit logging to important administrative and financial actions
- test each phase before moving to the next

## Important Rule

If the documentation contains a contradiction:
1. identify the contradiction
2. do not silently choose one interpretation
3. ask for clarification or clearly document the chosen decision

## Financial Rule

Financial logic must be implemented in the backend/service layer.

The frontend is for presentation and user interaction.

## Payment Rule

Adyen credentials and sensitive payment operations belong on the server.

## AI Workflow

For every major feature:
1. explain the implementation plan
2. identify affected entities and workflows
3. implement
4. test
5. review against the System Bible
6. document any new decision

## Quality Standard

The result should feel like a coherent small-business product, not a collection of generated pages.

The primary goal is:
- simple for the landlady
- connected across modules
- traceable
- financially transparent
- secure
- maintainable
- deployable on a real server
