# CAPSTONE ALIGNMENT PROTOCOL

## Purpose

This document ensures that Hivelet remains academically aligned with the approved Capstone Paper throughout development.

Hivelet must not gradually become a different system simply because AI-generated development introduces new ideas, assumptions, or features.

The Capstone Paper defines the research and project foundation.

The System Bible translates that foundation into detailed system behavior.

The implementation must remain consistent with both.

---

# 1. THE CAPSTONE PAPER IS THE ACADEMIC AUTHORITY

The Capstone Paper must always be consulted when making decisions that affect:

* System purpose
* Target users
* Problem being addressed
* Objectives
* Scope
* Limitations
* Major features
* Methodology
* Evaluation criteria
* Technical direction

AI agents must not replace the Capstone Paper with general software development assumptions.

---

# 2. DEVELOPMENT MUST ALWAYS RETURN TO THE RESEARCH PROBLEM

Before implementing a feature, determine:

> What problem identified in the Capstone Paper does this feature address?

A feature should have a clear connection to the system's purpose.

For example:

### Centralized Inquiries

Problem:

Apartment inquiries and communication may be scattered across different channels.

System Response:

Centralized inquiry management.

---

### Maintenance Tickets

Problem:

Tenant issues may be communicated through scattered channels and become difficult to track.

System Response:

Centralized issue ticketing and status tracking.

---

### Financial Tracking

Problem:

Financial records and operational expenses may be manually tracked across different records.

System Response:

Centralized income, expense, and cash-flow monitoring.

---

### Public Property Access

Problem:

Potential tenants may have limited access to information about the property.

System Response:

Public-facing property and room information with inquiry submission.

---

# 3. OBJECTIVE ALIGNMENT

Every major system feature should support at least one approved objective or project requirement.

When proposing a feature, document:

```text
Feature:
[Feature Name]

Problem Addressed:
[Problem from the Capstone Paper]

Objective Supported:
[Relevant Objective]

System Module:
[Module]

Reason for Inclusion:
[Explanation]
```

If no clear connection exists, the feature must be questioned before implementation.

---

# 4. SCOPE CONTROL

Hivelet must remain within the approved project scope.

AI agents must not introduce features simply because they are common in commercial software.

Examples of features that should not be added automatically:

* Multi-property management
* Multi-building management
* Full enterprise accounting
* Subscription billing
* Marketplace functionality
* Unapproved social networking features
* Unnecessary AI features
* Complex enterprise administration

The system should be complete within its intended scope rather than unnecessarily large.

---

# 5. REQUIREMENT TRACEABILITY

Every major feature should be traceable through the following chain:

```text
Capstone Paper
      ↓
Problem / Objective
      ↓
System Requirement
      ↓
System Bible Rule
      ↓
Database Design
      ↓
API
      ↓
Frontend Feature
      ↓
Test Case
      ↓
ISO/IEC 25010 Evaluation
```

A feature should not be considered complete merely because it works visually.

It must also be:

* Supported by the project requirements
* Properly implemented
* Tested
* Evaluated where applicable

---

# 6. CHANGE REVIEW PROTOCOL

Whenever a proposed change is made, determine its classification.

## Type A: Implementation Change

Changes how an existing approved feature is implemented.

Example:

Changing a Vue component structure.

Usually does not require changing the Capstone Paper.

---

## Type B: Clarification

Makes an existing requirement more precise.

Example:

Defining how a room becomes Available after a tenant vacates.

Should be documented in the System Bible.

---

## Type C: Scope Extension

Introduces a new capability not previously defined.

Example:

Adding a new financial system or an unrelated module.

Requires careful review before implementation.

---

## Type D: Requirement Change

Changes the meaning of an approved requirement, objective, or scope.

This must be reviewed by the project team and, where necessary, the capstone adviser.

AI agents must never silently make this type of change.

---

# 7. CONFLICT RESOLUTION

If sources appear to conflict:

## Step 1

Identify the exact conflict.

## Step 2

Determine whether the difference is:

* A wording issue
* An implementation detail
* A clarification
* A genuine scope conflict

## Step 3

Do not silently choose a new interpretation.

## Step 4

Escalate the decision to the project team.

The final decision must be documented.

---

# 8. AI DEVELOPMENT RULE

AI is an implementation assistant.

AI is NOT the authority for changing the research project.

AI may:

* Suggest improvements
* Identify technical problems
* Propose implementation options
* Explain trade-offs
* Detect inconsistencies

AI must not independently redefine:

* The research problem
* The project objectives
* The target users
* The approved scope
* The system's academic purpose

---

# 9. FEATURE APPROVAL CHECKLIST

Before implementing a significant feature, answer:

### Academic Alignment

* Is this supported by the Capstone Paper?
* Does it address the identified problem?
* Does it support an objective?

### System Alignment

* Is it consistent with the System Bible?
* Does it follow the room-centric model?
* Does it respect existing workflows?

### Scope Alignment

* Is it within the approved scope?
* Does it introduce unnecessary complexity?

### Technical Alignment

* Does it fit the current architecture?
* Does it affect existing modules?
* Does it require database changes?

### Evaluation Alignment

* Can the feature be tested?
* Does it contribute to relevant ISO/IEC 25010 characteristics?

---

# 10. FINAL CAPSTONE RULE

Every major development decision must be able to answer:

> Why does Hivelet need this?

The answer must ultimately connect to:

```text
The Problem
      ↓
The Objectives
      ↓
The Scope
      ↓
The System Requirements
      ↓
The Implemented Feature
```

If a feature cannot be reasonably connected to the Capstone Paper, it should not be added simply because an AI suggested it.

---

# 11. FINAL DEVELOPMENT PRINCIPLE

The development team should never allow Hivelet to become:

> An AI-generated application that happens to resemble the capstone paper.

The goal is:

> A faithful software implementation of the approved capstone project, improved through careful technical decisions while preserving academic and functional alignment.

Every AI agent must return to the Capstone Paper.

Every major system decision must return to the System Bible.

Every code change must return to the latest version of the repository.

This is the foundation of the Hivelet development process.
