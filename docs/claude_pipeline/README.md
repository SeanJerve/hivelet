# Hivelet Claude AI Pipeline Package
## Quick-Start & Usage Guide for Group 4

This directory (`docs/claude_pipeline/`) contains the complete engineering pipeline and prompts to feed directly into **Claude** (Claude 3.5 Sonnet, Claude 3.7 Sonnet, or Claude Project).

---

### Folder Contents

```
docs/claude_pipeline/
├── README.md                                  <- This quick-start guide
├── CLAUDE_PIPELINE.md                         <- Master System Prompt & Context Specification
├── prompts/
│   ├── PROMPT_1_ARCHITECTURE_AND_PATTERN.md  <- Architecture, Pattern Justification, & DFDs
│   ├── PROMPT_2_ERD_AND_DATABASE.md          <- 3NF Relational Schema, Data Dictionary, & ERD
│   └── PROMPT_3_BACKEND_SERVICES.md          <- Express API, Domain Services, & Audit Logs
└── diagrams/
    └── reference_dfds/
        ├── CFD.png                            <- Context Flow Diagram (Level 0 DFD)
        ├── PHYSICAL.png                       <- Baseline Physical DFD (Legacy manual system)
        ├── DFD.png                            <- Logical Level 1 DFD
        ├── CHILD1.png                         <- Process 1.0 Child DFD (Manage Tenant)
        └── CHILD2.png                         <- Process 2.0 Child DFD (Process Booking & Reservation)
```

---

### How to Use with Claude

#### Option A: Claude Project Knowledge Base (Recommended)
1. In Claude.ai, create a project named **Hivelet Backend & Systems Architecture**.
2. Upload the following files to the Project Knowledge:
   - `docs/claude_pipeline/CLAUDE_PIPELINE.md`
   - `docs/01_SYSTEM_BIBLE.md`
   - `docs/05_DATABASE_DESIGN.md`
   - `docs/04_ARCHITECTURE.md`
   - `docs/reference/Hivelet_ A Web-Based Apartment Management System for  Fe Galang Da Silva Boarding House.docx.pdf`
   - The 5 images in `docs/claude_pipeline/diagrams/reference_dfds/`
3. Set the Project Instructions to:
   > *"You are Claude, Principal Backend Architect and Database Engineer for Hivelet Group 4. Adhere strictly to CLAUDE_PIPELINE.md. Frontend is strictly READ-ONLY. Follow all business rules in 01_SYSTEM_BIBLE.md. CRITICAL RULE: If anything is unclear, ambiguous, or not yet finalized, DO NOT assume or guess. Initiate a conversation with the user first, present options/tradeoffs, and get explicit alignment before producing final code, schemas, or diagrams."*
4. Whenever you need a specific task executed, copy and paste the corresponding prompt from `docs/claude_pipeline/prompts/` (`PROMPT_1`, `PROMPT_2`, or `PROMPT_3`).

#### Option B: Single-Chat Session
1. Attach `docs/claude_pipeline/CLAUDE_PIPELINE.md` and the 5 reference images in `docs/claude_pipeline/diagrams/reference_dfds/`.
2. Attach or paste whichever task prompt you want Claude to work on (`PROMPT_1_ARCHITECTURE_AND_PATTERN.md`, `PROMPT_2_ERD_AND_DATABASE.md`, or `PROMPT_3_BACKEND_SERVICES.md`).
3. **Interactive Alignment**: If Claude detects any unconfirmed parameter, design question, or ambiguity, it will initiate a dialogue with you first to align on decisions before finalizing the diagrams, schemas, or backend implementations.

