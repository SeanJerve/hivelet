# Chapters 4 and 5 against the IT 124 course guides

**Checked 2026-09-30** against Prof. Penetrante's two guides (IT 124, SY 2026-2027):
*Capstone Project 2 Student Guide, Chapter 4: Results and Discussion* (v03, 43 pp.) and *Writing and
Defending Chapter 5* (v01, 39 pp.). The PDFs are in Lloyd's Downloads folder, not in the repository.
This page lists where our drafts (`CHAPTER_4_RESULTS_AND_DISCUSSION.md`,
`CHAPTER_5_SUMMARY_CONCLUSIONS_RECOMMENDATIONS.md`) differ from the guides, and what to do about
each. Both guides say the approved template and the adviser come first; **bring this page to the
adviser** for the items marked *Adviser*.

---

## 1. Decide with the adviser first (these change everything else)

| # | The guide expects | Our draft | Decision needed |
| :-- | :--- | :--- | :--- |
| D1 | Chapter 4 as **4.1 Needs Assessment Result, 4.2 Data Gathering Result, 4.3 The Developed System** (eight subsections: overview and architecture; process and data models; database design; modules and walkthrough; business rules; security and access control; deployment environment; testing results) and **4.4 Evaluation Result** | 4.1 Analysis of practices and requirements; 4.2 Development (one subsection per feature); 4.3 Pilot testing; 4.4 ISO/IEC 25010 evaluation; 4.5 Deployment plan | Keep ours (the guide calls Chapter 4 headings suggestive and says to follow the adviser) or re-cut to the guide's order. Our content maps across: 4.1 → 4.1 + 4.2; 4.2 → 4.3.1 and 4.3.4 to 4.3.6; 4.3 → 4.3.8; 4.4 → 4.4; 4.5 → 4.3.7 and an appendix |
| D2 | Tables and figures numbered **with the chapter**: Table 4-1, Figure 4-1, restarting each chapter; captions **above** the exhibit, sentence case, inserted with Word's Insert Caption so the lists build themselves | Continuous numbering (Tables 5 to 25 with lettered tables, Figures 4 to 14) | Renumber at the Word stage (our scripts print "Table 10", "Table 12" and so on; renumber after the results are pasted in, then update the List of Tables) |
| D3 | The **ISO/IEC 25010 edition named** in Chapters 3 and 4, and used consistently; the guide notes the 2011 edition is withdrawn and a *new* instrument should use 2023 | Our instrument uses the 2011 characteristics (Usability, Portability; no Safety) but no edition is written | **Chapter 4 done 5 Oct** (§4.4 names ISO/IEC 25010:2011); Chapters 2 and 3: paste FIXES H6. Write **ISO/IEC 25010:2011** in §3.2.4 and §4.4 (the survey is already built and in use on 2011 names; switching now would invalidate it). Be ready for the panel question "why 2011?": the instrument was built on the 2011 model and every item maps to it |
| D4 | The verbal labels in Chapter 4 **identical** to the scale declared in Chapter 3 | Chapter 4's Table 13 uses Very High / High / Moderate / Low / Very Low Quality | **Checked 5 Oct:** Chapter 3 declares only the agreement labels (right: the survey shows them) and no mean ranges. Paste FIXES H7 (a Table 4A identical to Table 13). Confirm Chapter 3's scale table uses the same five labels and ranges; change whichever is wrong |

---

## 2. Fix now (no test data needed)

| # | Item | Where | Action |
| :-- | :--- | :--- | :--- |
| N1 | **Chapter 4 may cite only sources already in Chapter 2 or 3 and the References.** §4.4.8 now cites the W3C TAG *Good Practices for Capability URLs* and OWASP's 64-bit guidance, which Chapter 2 does not review | §4.4.8 | Add both to Chapter 3 and the References (paste-ready text in `FIXES_TO_CHAPTERS_1_TO_3.md` H5), or drop the two names from §4.4.8 |
| N2 | **Chapter 4 reports outcomes, not procedures.** The opening of §4.3.7 describes how the acceptance test was run (facilitator, observer, what was recorded) | §4.3.7 | **Done 5 Oct:** §4.3.7 now points to §3.3 in one clause; the description lives in FIXES H2. Move that description to §3.3 (FIXES H2 and H4 already carry it) and keep one sentence in §4.3.7 pointing to it |
| N3 | **Compare results with Chapter 2 literature.** Chapter 4 has almost no comparison with the related studies; the guide asks each section's discussion to connect to at least one reviewed study | §4.1, §4.3, §4.4 discussion paragraphs | **Done 5 Oct for 4.1 to 4.3:** §4.2.4 (Encarnacion; Setty), §4.2.5 (Saputra; Jing and Lim), §4.2.7 (Biørn-Hansen), §4.3.3 (Magno; Pressman and Maxim), §4.3.7 (Mia), all already in Chapter 2. §4.4 waits on the survey. For each: one sentence naming a Chapter 2 study and whether our result agrees. Only studies already in Chapter 2 |
| N4 | **Third person, no contractions, no "we"** | Both chapters | Already the case in the drafts; keep it when pasting results |
| N5 | **Password handling named precisely** (hashing algorithm and salt, never "encrypted") | §4.2.6 | Already says bcrypt; make sure the Word copy says "hashed with bcrypt (per-password salt)" |

---

## 3. Exhibits the guide expects that Chapter 4 does not have yet

Build these before the defense; each is a small table or figure. "Have" means an equivalent exists.

| Guide exhibit | Status | Source for it |
| :--- | :--- | :--- |
| Current (as-is) process flow figure | **Have: Figure 4** (5 Oct 2026), swimlanes | The owner's workflow in §4.1.1 and Table 5; the booking channel stays general until the owner answers Table 5's question |
| Summary of identified problems with evidence | Have: Table 5 | Check each row names the method, the volume examined and the count |
| Requirements and traceability (problem → requirement → module) | Have: Table 6 | |
| Instrument administration and response rate (distributed, retrieved, valid, rate) | **Missing** | The testing day: consent forms, survey responses per group |
| Respondent profile | Have: Table 12 (pending) | Add n per group and percentages that sum to 100 |
| System architecture diagram | **Have: Figure 5** (5 Oct 2026) | Vue PWA → Express API on Vercel → Supabase PostgreSQL; Adyen with GCash |
| Context diagram, data flow diagram, use case diagram | **Have: Figures 6, 7, 8** (5 Oct 2026); Yourdon-DeMarco for the DFDs, UML for use cases | Drawn from the routes and `rbac.ts` by `scripts/build-chapter-4-diagrams.mjs` |
| Entity-relationship diagram and a data dictionary extract | **Have: Figure 9 and Table 7A** (5 Oct 2026) | From the live catalogue (21 tables, 37 foreign keys), never from `FULL_DATABASE_SCHEMA.sql`; Crow's Foot |
| Business rules table with **one worked example per computation** | **Have: Table 7B** (5 Oct 2026; 7A until the data dictionary took that number) | Water = occupants × ₱200; the bill (rent + water); overdue from the day after the due date; the 50% share per BR-035 wording only |
| Role and privilege matrix (role × function, Yes/No) | **Have: Table 7C** (5 Oct 2026), from `config/rbac.ts` | The permission matrix in the code: public, prospect, tenant, administrator |
| Deployment environment table (client-side hardware and software, **with versions**) | **Have: Table 24** (5 Oct 2026), a column for what was used on 30 Sep; the tenants' own phone models were not recorded | Add the landlady's laptop and the tenants' phones as actually used on 30 Sep |
| **Test execution summary by level** (unit, integration, system, user acceptance: executed, passed, failed, pass rate) | **Have: Table 11E** (5 Oct 2026): 82 of 83 executed tests passed, 98.8% | Unit/integration: the check suites; system: the walkthrough (Table 10); acceptance: the testing day (Tables 11C, 11E). The course standard is **at least 90% passed, all critical defects resolved** |
| Defect summary by severity and disposition (found, resolved, deferred) | **Have: Table 23A** (5 Oct 2026): 35 found, 31 resolved, 1 open, 3 accepted | Add a severity column and the deferred items (e.g. B-86 until 064 runs) |
| Worked computation of one weighted mean (rating, weight, frequency, product) | **Missing** | From the real survey: one indicator |
| Summary table with a **rank** column and n per characteristic | Table 22 (pending) | `compute-survey.mjs` prints the numbers; add rank and n |

---

## 4. Chapter 5

| # | The guide expects | Our draft | Action |
| :-- | :--- | :--- | :--- |
| C1 | **One conclusion per specific objective, in order**, each: echoes the objective, states whether it was achieved, cites the evidence from the Summary, and judges it against a criterion | Four conclusions, but 1 to 3 are general lessons ("the main problem was the lack of connection between records", "automated verification is necessary") rather than "Objective 1 was achieved, as shown by…" | Rewrite after the results: Conclusion 1 = analysis done (Tables 5, 6); 2 = system developed with the six named features; 3 = pilot tested (pass rates against the 90% standard, UAT signed); 4 = evaluated (overall mean and interpretation, every characteristic at least X). Move the current lessons to the §4.x discussions |
| C2 | **No number in Chapter 5 that is not in Chapter 4** | The Summary uses 43% of 937 rows, 490 report checks, 78 and 73 checks, 1,085 and 285 requests | Check each against Chapter 4 and update to the current figures (the ledger is now 952 income rows after migration 062) |
| C3 | **Summary is descriptive** (past tense, no judgments), one paragraph per objective | Mostly descriptive | Keep; remove any "effective" or "successfully" judgment |
| C4 | **Five to eight recommendations**, evidence-linked, grouped by audience, **none that finishes a feature promised in the objectives** | **Done 5 Oct: eight**, grouped by audience, each with its Chapter 4 basis; number 6 is the lowest-rated characteristic, waiting on the survey; the eight cut are in a team note with reasons. Was: sixteen | Cut to the strongest 6 to 8, each with its basis (the lowest-rated characteristic, a delimitation, a test finding, a user comment). The lowest-rated characteristic **must** appear |
| C5 | **No citations in Chapter 5** | None | Keep |
| C6 | **The abstract's last sentence restates the achievement of the general objective** and agrees with the conclusions | Abstract not yet rewritten | Write it last, after 5.2 |
| C7 | No claims of impact, satisfaction or "error-free" that were not measured | The draft avoids them | Keep; "users are satisfied" only if the survey measured satisfaction |

---

## 5. What the guides say the panel will ask (prepare one answer each, with the table and page)

- Which ISO/IEC 25010 edition, and why? Was anyone from the group an evaluator? (No: evaluators are
  the landlady, tenants, prospects and outside IT evaluators.)
- Compute one weighted mean for us. (Section 3 above: the worked-computation table.)
- Which test cases failed, what did you do, and who did the acceptance testing? (Signed Form 6.)
- Why does this feature exist? (Table 6, read one row aloud.)
- Where does the data live, and how are passwords stored? (Architecture; bcrypt.)
- What is the weakest part of the system? (The lowest-rated characteristic and its recommendation.)
- Who maintains it after you graduate? (User manual Appendix K, the hand-over, backups.)
