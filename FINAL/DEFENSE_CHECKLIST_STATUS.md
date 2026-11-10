# Defense checklists: where the paper stands

Updated 10 November 2026 against the two forms Sean sent on 4 November: **Form 2, Pre-Defense
Clearance Checklist** (23 items, signed by the advisers and the Faculty-in-Charge) and the
**Proponent's Checklist** (Phases 1 to 6, from endorsement to the hardbound copy). Each row says what
the form asks for, what to attach, whether it is ready, and who acts. "Team" means it needs a person,
a signature or a paper that cannot come from the repository.

**Everything for the defense checklist, one folder per Form 2 item:** `_DEFENSE CHECKLIST/` in the
hivelet folder, outside the code, committed so both machines have it. **The repository is public until
it is made private (P9): a signed scan put there is published by the next commit.** Its `00 STATUS` file says which items are ready and which are
missing. Put each signed scan in its item's folder, then rebuild it with
`node scripts/manuscript/build-defense-folder.mjs`, which never deletes a file the team put there.

Figure and table numbers are the final paper's (`FINAL/05_CHAPTER_4_...`), not the drafts'.

## Form 2, Part III

| No. | What the form asks for | What to attach | Status | Who |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Chapters I to V complete, with front matter, references and annexes, on the Form 1 template | `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx` (Chapters 1 to 5, References, Appendices A to R) | Nearly done. Open: the front matter (P3: title page, defense date and room, CVs) and the Acknowledgement (P4). The layout has not been checked against the Form 1 template, which is not in the repository | Team |
| 2 | Every comment of the Content Adviser addressed | `FINAL/FORM_2_EVIDENCE/CONSULTATION_RECORD.md`: each point Sir Jayvee raised beside what the team did | Every point recorded so far is addressed. Signatures open | Team, with Sir Jayvee |
| 3 | **Literature Map** (Form 3A asks for it) | **Appendix R**, Figure R-1 (`docs/FINAL MANUSCRIPT/figures/appendix-r-literature-map.png`) | **Done 10 Nov**: Chapter 2's five themes with their sources, narrowing to the gap and the study | Content Adviser to check |
| 4 | Citations and references in the Form 1 template's style | `FINAL/07_REFERENCES.md` (APA 7, 35 entries. The build checks every citation has an entry and every entry is cited) | Style not checked against Form 1 | Team, with the template |
| 5 | Similarity check, within the University's threshold | The similarity report | Not done. The threshold on the form is blank | Team |
| 6 | Every module developed and working | The live system at hivelet.vercel.app, shown with `FINAL/DEMO_SCRIPT.md` | Done | Team demonstrates |
| 7 | Revision log, up to date | **`FINAL/FORM_2_EVIDENCE/REVISION_LOG.md`** | **Done 10 Nov**: every round of testing and review, what it found and what was revised, from Tables 4-19, 4-20, M-19 and M-27 and the 4 November rerun | Programming Adviser to check |
| 8 | Test plan executed, at least 90% passing, critical defects resolved | Appendix L (the test cases and results), Table 4-12 (by level), Table 4-20 (defects) and `docs/TESTING_DAY/results/RERUN_2026-11-04.md` | Done: 82 of 83 passed (98.8%), no critical defect, and the 4 November rerun of all 114 cases found none failing | Attach as the Test Plan and Test Results Report |
| 9 | UAT signed by the client | Appendix O, printed from `docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx` | Waiting on the owner's signature (P1) | Team, with the owner |
| 10 | Deployed or pilot-tested, with a Deployment Report and a Client or End-User Acceptance Form or MOA | **`FINAL/FORM_2_EVIDENCE/DEPLOYMENT_REPORT.md`**, and the acceptance form or MOA | Deployment Report **done 10 Nov**. **No acceptance form or MOA found.** Ask the FIC whether the signed UAT form of item 9 serves, or whether Module 06's form is separate | Team |
| 11 | User manual complete, and the source code in version control and open to the Programming Adviser | Appendix K, and the repository link | Done, with one catch: if the repository goes private before the defense (P9), **add the Programming Adviser as a collaborator** | Sean |
| 12 | Context Diagram in the standard model | Figure 4-3 and Appendix D | Done. Gane and Sarson, three outside parties: Adyen is part of process 4.0, as the SAD professor approved | |
| 13 | Data Flow Diagram in Gane and Sarson notation, down to Level 2 | Figure 4-4 (Level 1) and Appendix F (Level 2, all eight processes, Figures F-1 to F-8) | Done | See the level naming note below |
| 14 | Use Case Diagram | Figure 4-5 and Appendix G | Done | |
| 15 | ERD or database diagram | Figure 4-6 and Appendix H, drawn from the live database catalogue | Done | |
| 16, 17 | Consultation records with each adviser, signed sessions | `FINAL/FORM_2_EVIDENCE/CONSULTATION_RECORD.md`, one record for both, since Sir Jayvee is both advisers: 26 February, 2 March and 22 September 2026, and one before the final defense | Ready to print. Signatures open | Team, with Sir Jayvee |
| 18, 19 | Forms 3A and 3B signed, all items ticked, the four diagram annexes attached to 3B | Forms 3A and 3B. The annexes are Appendices D, E and F, G and H. Each form is checked item by item in `FORM_2_EVIDENCE/FORMS_3A_3B_CHECK.md` | All 16 items of 3A and all 6 of 3B met (3A items 2, 3, 5 and 11 fixed in Chapters 1 and 2 on 10 Nov). Signatures open | Team |
| 20, 21 | Mock defense held, every recommendation acted on | The mock defense evaluation and a list of actions taken | Open | Team. Send the recommendations and Claude records what was done |
| 22 | Slides and demo script, with a backup copy of the system and slides | `FINAL/HIVELET DEFENSE SLIDES.pptx`, `FINAL/DEFENSE_PRESENTATION_SCRIPT.md`, `FINAL/DEMO_SCRIPT.md` | Ready. Slide 1 still needs the names, adviser and date. Backup copy not made | Team |
| 23 | Copies for the three panelists and two advisers | Five printed copies | Open | Team |

## The Proponent's Checklist, beyond Form 2

- **Item 4**: the signed UAT form and the signed acceptance form or MOA go in the annexes. Appendix O
  waits for the signature, and there is no acceptance form or MOA yet.
- **Item 31**, the turnover package: the user manual (Appendix K), the source code and a database
  script, installation and deployment notes (Section 6 of the Deployment Report), and the repository
  link. The database script must be taken from the live database as a schema-only dump, never
  `database/FULL_DATABASE_SCHEMA.sql`, which does not describe it (CLAUDE.md rule 2). That is Sean's
  side of the repository.
- Items 14, 27, 28 and 32 (copies some working days before, the editor's certification, the second
  similarity check, the final PDF) are the team's.

## The SAD Laboratory Activity 3 the professor approved

Sean sent it on 4 November. It matches the paper's diagrams in style: Gane and Sarson processes
(rounded, numbered band), shaded squares for entities, stores with the ID in a box.

1. **Adyen. Settled 4 November.** The professor took it off the context diagram because Adyen is
   part of a process, not an entity. It is no external entity on any level of the paper's diagrams,
   which keeps them balanced, and step 4.3 of Appendix F is "Take a GCash payment through Adyen".
   Section 4.2.1 says why. Figure 4-2 (the architecture) and the use case diagram still show Adyen,
   since those are not data flow diagrams.
2. **Processes.** The lab has five. The paper's Figure 4-4 has eight, drawn from what was built, and
   the system has no booking approval: a visitor sends an inquiry and the owner moves them in. The
   lab was the planned design, and the paper shows the system as built, which is what Chapter 4
   reports and tests. If asked, say exactly that.
3. **Level names.** The lab calls the diagram under the context diagram "Diagram 0 (Level 0)". The
   paper calls it Level 1 and the ones under it Level 2, the usual names, which is how Form 2 item
   13's "down to Level 2" reads. If the panel uses the lab's names, Appendix F is Level 1 and one more
   level would be needed.
