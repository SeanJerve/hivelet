# AI DEVELOPMENT WORKFLOW

## Purpose

This document defines the required workflow for any AI agent contributing to the Hivelet capstone project.

Hivelet is an active software project under continuous development. The codebase on GitHub is the current implementation state of the system.

AI agents must never assume that previously generated code, previous conversations, local files, or outdated documentation represent the latest state of the project.

The latest version of the project repository is the primary source of truth for the current implementation.

---

# 1. REQUIRED SOURCE-OF-TRUTH HIERARCHY

Before making changes, use the following hierarchy:

## 1. Current GitHub Repository

This is the source of truth for:

* Current source code
* Current database implementation
* Current API implementation
* Current frontend implementation
* Current project structure
* Current configuration
* Current documentation included in the repository

Always inspect the latest repository state before modifying the project.

---

## 2. HIVELET_SYSTEM_BIBLE.md

This is the primary source of truth for:

* Business rules
* System behavior
* Core workflows
* User roles
* Module boundaries
* Room-centric system logic
* Approved system scope

---

## 3. Capstone Paper

The Capstone Paper is the academic source of truth for:

* Research problem
* Objectives
* Scope and limitations
* Theoretical and conceptual foundations
* Methodology
* Agile development approach
* ISO/IEC 25010 evaluation criteria
* Academic terminology
* Research requirements

---

## 4. Current User/Team Decisions

The latest explicit decisions made by the Hivelet development team may update or clarify implementation details.

However, any major change that affects the approved capstone scope, objectives, or system concept must be checked against the Capstone Paper before implementation.

---

# 2. MANDATORY PRE-CHANGE WORKFLOW

Before changing any code, the AI agent MUST:

## Step 1: Inspect the Current Repository

Review the latest available version of the project.

Check:

* Current branch
* Recent commits
* Current project structure
* Relevant files
* Existing implementations
* Existing database schema
* Existing API routes
* Existing frontend components

Do not rely on assumptions about the current codebase.

---

## Step 2: Identify the Affected System Area

Determine exactly what the requested change affects.

Examples:

* Authentication
* Rooms
* Tenants
* Inquiries
* Payments
* Expenses
* Maintenance Tickets
* Notifications
* Reports
* Database
* API
* Frontend
* Deployment

---

## Step 3: Read Relevant Documentation

Before implementing the change, inspect the relevant documentation.

At minimum, check:

* `HIVELET_SYSTEM_BIBLE.md`
* Relevant database documentation
* Relevant API documentation
* Relevant UI/UX documentation
* Relevant capstone requirements

---

## Step 4: Check the Capstone Paper

Determine whether the requested change:

* Is explicitly required by the paper
* Supports an objective in the paper
* Is consistent with the scope
* Is consistent with the limitations
* Supports the system's intended users
* Supports the intended evaluation criteria

If the change cannot be connected to the Capstone Paper or approved system requirements, do not automatically implement it.

---

## Step 5: Analyze Existing Dependencies

Before modifying a feature, determine what other parts of the system depend on it.

For example:

Changing a Room Status may affect:

* Public room availability
* Inquiries
* Tenant assignment
* Payments
* Dashboard statistics
* Reports

Do not modify one module without checking its interconnected effects.

---

# 3. REQUIRED CHANGE ANALYSIS

Before implementing a non-trivial change, the AI should identify:

### Requested Change

What is being changed?

### Reason

Why is it being changed?

### Affected Files

Which existing files are affected?

### Affected Modules

Which system modules are affected?

### Database Impact

Does the database schema or data model need to change?

### API Impact

Do existing endpoints need to change?

### UI Impact

Do frontend pages or components need to change?

### Capstone Impact

Which requirement, objective, workflow, or scope item does this support?

---

# 4. DO NOT BLINDLY REBUILD EXISTING FEATURES

If a feature already exists:

* Inspect it first.
* Understand how it currently works.
* Preserve working behavior unless the requested change requires modification.
* Avoid replacing an entire module unnecessarily.

Do not create duplicate implementations.

Do not create a second version of an existing feature without first determining whether the current implementation should be extended or refactored.

---

# 5. CHANGE IMPLEMENTATION PRINCIPLE

Every change should follow this pattern:

```text
Understand Current Repository
        ↓
Understand Requested Change
        ↓
Check System Bible
        ↓
Check Capstone Paper
        ↓
Analyze Dependencies
        ↓
Plan Change
        ↓
Implement
        ↓
Test
        ↓
Verify Capstone Alignment
        ↓
Update Documentation
```

---

# 6. AFTER IMPLEMENTATION

After making a change, the AI MUST verify:

* Does the feature work?
* Did existing functionality remain intact?
* Did the database remain consistent?
* Did the API remain consistent?
* Did role permissions remain secure?
* Did the change introduce duplication?
* Did the change introduce unnecessary scope?
* Does the final implementation still align with the Capstone Paper?

If documentation describes the changed behavior, update the relevant documentation.

---

# 7. SOURCE CODE AND DOCUMENTATION CONSISTENCY

The following must remain consistent:

```text
Capstone Paper
      ↓
System Bible
      ↓
Database Design
      ↓
API Specification
      ↓
Frontend Implementation
      ↓
Actual User Experience
```

If these layers conflict, investigate the conflict instead of silently ignoring it.

---

# 8. CAPSTONE PROJECT RULE

Hivelet is not simply a software application.

It is a capstone research and development project.

Therefore, implementation decisions must consider both:

1. Whether the system works technically.
2. Whether the system remains aligned with the approved academic project.

A technically impressive feature that is outside the approved scope should not automatically be implemented.

A feature should be added only when it:

* Supports the approved objectives,
* Addresses the identified problem,
* Fits the system scope,
* Supports the intended users,
* Or is necessary for the operation of an approved feature.

---

# 9. FINAL RULE

Before making any meaningful change, always ask:

> What is the current implementation?

> What does the System Bible require?

> What does the Capstone Paper support?

> What other parts of Hivelet will this affect?

> Is this change necessary?

> Does the final result still represent the approved Hivelet capstone project?

Never develop blindly.

Always inspect.

Always verify.

Always return to the source documents.

---

# 10. ACADEMIC AI CODE DOCUMENTATION & MOBILE-FIRST STANDARDS

## Academic AI Transparency Standard
To satisfy strict institutional academic policies evaluating AI-assisted software engineering:
1. **File & Component Header Comments:** Every file created or updated must contain an explicit JSDoc / Header comment defining:
   - Functional purpose & System Bible reference
   - Architectural rationale
   - Innovations, custom algorithms, or UI adaptations tailored specifically for Hivelet.
2. **Inline Logic Comments:** Business rules (e.g., 50% revenue share, ₱200/head water billing, 2% annual price increase history, room-centric model) must be annotated inline.

## Mobile-First & Corporate UI Mandate
1. **Mobile-First Responsive Design:** All UI components MUST be developed mobile-first using Tailwind responsive breakpoints (`sm`, `md`, `lg`).
2. **Jira-Inspired Minimalist Aesthetic:** Use clean slate canvas (`#f4f5f7`), crisp card panels (`#ffffff`), dark slate typography (`#172b4d`), and corporate blue accents (`#0c66e4`).
3. **Strictly No Emojis:** Use clean Lucide SVG icons across all interfaces.

