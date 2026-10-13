# FINAL: the manuscript to retype into Word

Every chapter here has every fix applied, sentence by sentence, from `FIXES_TO_CHAPTERS_1_TO_3.md`,
the panel-style read of 13 October 2026, and the two IT 124 course guides. Retype or paste each file
into the Word manuscript in the order below. Do not compare against the old Word file line by line:
these files replace Chapters 1 to 5, the Abstract and the References entirely.

## 1. The order of the Word document

| Order | File | Replaces |
| :--- | :--- | :--- |
| Front matter | (in the Word file; see Section 4 below) | |
| Abstract | `01_ABSTRACT.md` | The blank Abstract page (p. vii) |
| AI statement | `09_AI_USE_STATEMENT.md` | New. Its place is the adviser's call (marker at its top) |
| Chapter 1 | `02_CHAPTER_1_INTRODUCTION.md` | Chapter 1 |
| Chapter 2 | `03_CHAPTER_2_THEORETICAL_FRAMEWORK.md` | Chapter 2 |
| Chapter 3 | `04_CHAPTER_3_MATERIALS_AND_METHODS.md` | Chapter 3 |
| Chapter 4 | `05_CHAPTER_4_RESULTS_AND_DISCUSSION.md` | Chapter 4 (the old one is template text) |
| Chapter 5 | `06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md` | Chapter 5 (the old one describes another project's auto shop application) |
| References | `07_REFERENCES.md` | References |
| Appendices | `08_APPENDICES.md` lists A to Q and where each one's content is; K, M, N and O are in `appendices/` | Appendices |
| | Curriculum Vitae | Still the blank template (Section 4) |

## 2. How to paste

- **Headings.** Apply Word's Heading 1 to chapter titles, Heading 2 to 1.1, Heading 3 to 1.1.1, then
  insert an automatic table of contents. The old contents, list of tables and list of figures do
  not match the body; do not repair them by hand.
- **Tables and figures.** Every number here is already in the chapter scheme the guide asks for
  (Table 4-1, Figure 4-1, restarting each chapter). Insert each caption with **References > Insert
  Caption** (label Table or Figure, "Include chapter number" ticked) so the lists build themselves.
  Captions go **above** every table and figure, in sentence case, as written here.
- **Images.** Chapter 4's images link to `docs/FINAL MANUSCRIPT/figures/`. A `[KEEP: ...]` marker
  means use the image already in the old manuscript, at the page it names.
- **Bold brackets** `**[TO DO: ...]**` are the only things still open. Each is listed in Section 3;
  none may reach the printed copy.
- **Survey results and test figures** in Chapters 4 and 5 are final; do not round or restate them.
  `npm run check:canon` fails if a locked wording (the 50% Share, Adyen with GCash, 33 units with 32
  occupied) is changed in any file here.

## 3. What is still open

| Where | What | Who |
| :--- | :--- | :--- |
| Chapter 2, Figure 2-2 | The conceptual framework image says "Ayden" twice. Redraw it with "Adyen" before pasting | Design seat |
| Chapter 3, Section 3.3 | The length of the introductory video, in minutes | Team |
| Chapter 4, Section 4.3.7 | One sentence once the owner signs the acceptance form (the marker gives it) | Team, after the signature |
| Appendix O | The scan of the signed form. Print `docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx`; she ticks and signs only if she agrees. Never sign it for her | Team, with the owner |
| References | The full entry for Ullah et al. (2021). It is cited five times (Sections 1.1, 2.1.1, 2.1.6 and 4.1.1) and was never in the list | Whoever found the source |
| AI statement | Where it goes, whether a prompt log is attached, and the tool used in the first iteration (24 July to 28 August) | Adviser; team |
| Appendix C | The Gantt chart redrawn with the three iterations' real dates | Team |
| Appendix F | Redraw the child data flow diagrams from the as-built processes, or mark the letter "Not used" | Team |
| Appendix Q | How the panel reads the source code once the repository is private | Sean |
| **Decision** | Whether Section 4.4.1 should say that the administrator who rated the system is a team member's relative (see Section 6) | Team, with the adviser |

`node scripts/manuscript/build-final.mjs` reprints this list's source markers if they change; search
the folder for `[TO DO` to see the current set.

## 4. Front matter, outside these files

From FIXES sections D and E, unchanged because only the team or the adviser can settle them:

- **Result of Final Oral Defense (p. 3):** the place and date are still placeholders.
- **The two adviser certifications (pp. 5 and 6)** carry an older title ("... with Financial
  Analytics, Booking, and Issue Tracking ..."). They are signed; ask the adviser whether they are
  reissued with the cover's title. Do not edit them.
- **Acknowledgement:** listed in the contents, not written.
- **Table of contents:** "CURRICULUM VITAEx" and the template entries ("Objective 1 Title", "Pet
  Adoption System") disappear when the contents are regenerated from the headings.
- **Curriculum Vitae:** still the blank template with example years 2019 to 2023.

## 5. What each chapter must contain, and where it is

**Chapter 1.** Background with the gap stated (1.1); the general and four specific objectives (1.2);
significance for the owner, the tenants and future researchers (1.3); scope and delimitations (1.4).
The property is the **Fe Galang Da Silva Boarding House** everywhere, and Section 1.4 names its 33
units.

**Chapter 2.** Related literature by theme (2.1.1 to 2.1.5) and its synthesis (2.1.6); the gap
(2.2); the conceptual framework, Figure 2-2 (2.3); definitions of terms (2.4), with ISO/IEC
25010:2011 named and cited at its first mention. Every source cited here is in the References and
every reference is cited (the build checks both).

**Chapter 3, in the past tense, describing what was done.** Software and hardware, including the
devices actually used (3.1); the Agile method and its six phases (3.2), with testing in four layers
on the ISO/IEC/IEEE 29119 levels (3.2.4); the evaluation procedure (3.3): the ISO/IEC 25000 series,
the 25040 process, the four respondent groups and what each rated, participants, instruments, data
gathering, the statistical treatment (mean of group means), and Tables 3-4 to 3-6 (scale,
interpretation, item-to-sub-characteristic map); ethical considerations (3.4).

**Chapter 4 (guide v03: 25 to 45 pages; about 50 in Word with images).** One section per objective:
4.1 practices and requirements (Tables 4-1 to 4-3, including the ten non-functional requirements);
4.2 the system as built (architecture, models and every module); 4.3 pilot testing, every result
with its date and device; 4.4 the ISO/IEC 25010 evaluation, with respondents, interpretation,
results by characteristic, security, measured and rated evidence together, and the optimizations
made in response; 4.5 the deployment plan. Indicator-level tables, the full walkthrough, the data
dictionary and the signed form are in Appendices M, N and O, as the guide requires.

**Chapter 5 (guide v01: 3 to 5 pages).** A descriptive summary, one paragraph per objective; one
conclusion per objective, one to three sentences each; eight recommendations, each with its basis
in Chapter 4. No citations, and no number that is not in Chapter 4.

## 6. The one question a panel can ask that the paper does not answer yet

The administrator who used the system and rated it is the mother of a team member. Purposive
sampling allows it, and she is the system's only administrator, so no one else could have rated the
owner's side. A panel that learns of the relationship from someone else will ask why the paper did
not say so. If the team and the adviser agree, add to Section 4.4.1, after the table of respondents:

> The administrator is related to a member of the research team. Her ratings enter each composite
> as one group's mean, beside the other groups that rated the same characteristic, and every
> characteristic she rated also has measured evidence that does not depend on her judgment
> (Table 4-23).

## 7. What changed in the references

Sorted alphabetically (FIXES C7), with italics restored to the APA 7 places (journal and volume,
book and report titles), and the six ISO entries the method now cites added (2011a, 2011b, 2016a,
2016b, 2023, and ISO/IEC/IEEE 29119-1:2022). **Monteverde et al. (2023) and Thevaraju et al. (2019)
were removed:** they were listed but cited nowhere, which a panel reads as padding. To keep either,
cite it in Chapter 2 first; for example, in Section 2.1.6, "Monteverde et al. (2023) likewise
evaluated a web-based rental house finder against ISO/IEC 25010", using only what the source says.
The ISO/IEC 25040 entry is the 2011 edition; a newer one exists, with the same five steps, so cite
2011 only if the adviser accepts it alongside the 2011 quality model.

## 8. Changing a file here

Do not edit the numbered files: they are rebuilt. Chapters 1 to 3, the references, the appendix
list and the AI statement are written in `FINAL/_src/`; the Abstract, Chapters 4 and 5 and
Appendices K, M, N and O stay in `docs/FINAL MANUSCRIPT/` (in the drafts' old numbering, so other
documents that cite "Table 22A" still find it). After editing either, run

```bash
node scripts/manuscript/build-final.mjs
```

It strips the team notes, renumbers every table and figure, and fails if any text cites a table,
figure or section that does not exist, if a citation has no reference entry or an entry has no
citation, or if a team note survives.
