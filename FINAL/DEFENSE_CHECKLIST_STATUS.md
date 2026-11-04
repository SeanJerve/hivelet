# Defense checklists: where the paper stands

Checked on 4 November 2026 against two forms Sean sent: **Form 2, Pre-Defense Clearance Checklist**
(23 items, signed by the advisers and the Faculty-in-Charge) and the **Proponent's Checklist**
(Phases 1 to 6, from endorsement to the hardbound copy). Each row says what the form asks for,
what we have, and who has to act. "Claude" means it can be done in the repository. "Team" means it
needs a person, a signature or a paper.

## Form 2, Part III

| No. | What the form asks for | What we have | Status | Who |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Chapters I to V complete, with front matter, references and annexes, on the Form 1 template | All five chapters, references and Appendices A to Q in `FINAL/`. The front matter is still open (P3: title page, defense date, CVs) and so is the Acknowledgement (P4) | Nearly done | Team. Also check the layout against the Form 1 template, which is not in the repository |
| 2 | Every comment of the Content Adviser addressed | The consultation record | Not in the repository | Team |
| 3 | **Literature Map** (Form 3A asks for it) | **None.** Chapter 2 has the review (2.1.1 to 2.1.6), the gap (2.2) and the concept (2.3), which is everything a literature map is drawn from | **Missing** | Claude can draft it from Chapter 2 |
| 4 | Citations and references in the Form 1 template's style | The build checks that every citation has an entry and every entry is cited | Style not checked against Form 1 | Team, with the template |
| 5 | Similarity check, within the University's threshold | No report yet. The threshold on the form is blank | Not done | Team |
| 6 | Every module developed and working (live demonstration) | The live system at hivelet.vercel.app, and `FINAL/DEMO_SCRIPT.md` | Done | Team demonstrates |
| 7 | Revision log, up to date | No single log. The revisions are recorded in Table M-19 (each iteration), Table 23 (the evaluators' comments and what was done), the git history and `docs/13_AUDIT_JUDGEMENT_LOG.md` | **Missing as one document** | Claude can compile it from those |
| 8 | Test plan executed, at least 90% passing, critical defects resolved | Appendix L (test cases and results). 82 of 83 passed (98.8%), no critical defect (Section 4.3) | Done | Attach Appendix L as the Test Plan and Test Results Report |
| 9 | UAT signed by the client | Appendix O is ready to print. The owner has not signed (P1) | Waiting on the signature | Team |
| 10 | Deployed or pilot-tested, with a Deployment Report and a Client or End-User Acceptance Form or MOA | Deployed at hivelet.vercel.app since 24 September 2026, in use beside the owner's records (Table 25). **No Deployment Report document. No MOA or acceptance form found** (the UAT sign-off of item 9 may or may not be the same form as Module 06's) | **Missing** | Claude can draft the Deployment Report. Team: the acceptance form or MOA |
| 11 | User manual complete, and the source code in version control and open to the Programming Adviser | Appendix K, brought up to date for the redesign on 4 November. The code is on GitHub | Done, with one catch | P9 makes the repository private before the defense. If it goes private, **add the Programming Adviser as a collaborator** or item 11 fails |
| 12 | Context Diagram in the standard model | Figure 6 and Appendix D, in Gane and Sarson since 4 November | Done | See the Adyen question below |
| 13 | Data Flow Diagram in **Gane and Sarson** notation, **down to Level 2** | Redrawn on 4 November: Figure 7 (Level 1) and Appendix F, now Level 2 diagrams for all eight processes. They were Yourdon-DeMarco circles, with four of eight processes opened | Done | See the level naming question below |
| 14 | Use Case Diagram | Figure 8 and Appendix G | Done | |
| 15 | ERD or database diagram | Figure 9 and Appendix H, drawn from the live database catalogue | Done | |
| 16, 17 | Consultation records with each adviser, signed sessions | Paper records | Not in the repository | Team |
| 18, 19 | Forms 3A and 3B signed, all items ticked, the four diagram annexes attached to 3B | The annexes are Appendices D, E/F, G and H | Signatures open | Team |
| 20, 21 | Mock defense held, every recommendation acted on | Not yet | Open | Team. Send the recommendations and Claude records what was done |
| 22 | Slides and demo script, with a backup copy of the system and slides | `FINAL/HIVELET DEFENSE SLIDES.pptx`, `FINAL/DEMO_SCRIPT.md`, `FINAL/DEFENSE_PRESENTATION_SCRIPT.md` | Ready. Backup copy not made | Team |
| 23 | Copies for the three panelists and two advisers | | Open | Team |

## The Proponent's Checklist, beyond Form 2

- **Item 4**: the signed UAT form and the signed acceptance form or MOA go in the annexes. Only
  Appendix O exists, and it waits for the signature.
- **Item 31**, the turnover package: the user manual (Appendix K), the source code and **a database
  script**, installation and deployment notes, and the repository link. The database script must be
  taken from the live database (a schema-only dump), never `database/FULL_DATABASE_SCHEMA.sql`,
  which does not describe it (CLAUDE.md rule 2). That is Sean's side of the repository. The
  installation and deployment notes can go in the Deployment Report of item 10.
- Items 14, 27, 28 and 32 (copies some working days before, the editor's certification, the second
  similarity check, the final PDF) are the team's.

## The SAD Laboratory Activity 3 the professor approved

Sean sent it on 4 November. It matches the paper's diagrams in style: Gane and Sarson processes
(rounded, numbered band), shaded squares for entities, stores with the ID in a box. It differs in
three ways the team should settle before the defense:

1. **Adyen.** Its context diagram (Figure 1) draws three entities, Tenant, Administrator and Public
   User, and no Adyen, though its own text says "four external entities" and names Adyen. The
   paper's Figure 6 keeps Adyen, because the gateway really does send each payment's result into the
   system. **Waiting on Sean**: did the professor say to take Adyen off, or was it never drawn?
2. **Processes.** It has five (manage tenant and room records, booking and reservation, financial
   transactions, maintenance tickets, sign-in and access). The paper's Figure 7 has eight, drawn
   from what was built, and the system has no booking approval: a visitor sends an inquiry and the
   owner moves them in. The lab exercise was the planned design, and the paper shows the system as
   built, which is what Chapter 4 reports and tests.
3. **Level names.** The lab calls the diagram under the context diagram "Diagram 0 (Level 0)" and the
   ones under it "Level 1" (its Figure 4 says "Level 2" for the same depth). The paper calls them
   Level 1 and Level 2, the usual names, which is what Form 2 item 13's "down to Level 2" reads as.
   If the panel uses the lab's names, the paper's Appendix F is Level 1 and one more level would be
   needed.
