# FINAL: the manuscript to retype into Word

Every chapter here has every fix applied, sentence by sentence, from the list of fixes to Chapters 1 to 3 (archived 13 October),
the panel-style read of 13 October 2026, and the two IT 124 course guides. Retype or paste each file
into the Word manuscript in the order below. Do not compare against the old Word file line by line:
these files replace Chapters 1 to 5, the Abstract and the References entirely.

**Two other files here:** `QUESTIONS_TO_FINALIZE.md` (what is still needed, Section 1) and
`STUDY_GUIDE_REFERENCES.md` (every reference: what it found, where the paper uses it, and what to
say if the panel asks).

## 1. The order of the Word document

| Order | File | Replaces |
| :--- | :--- | :--- |
| Front matter | (in the Word file; see Section 4 below) | |
| Abstract | `01_ABSTRACT.md` | The blank Abstract page (p. vii) |
| Chapter 1 | `02_CHAPTER_1_INTRODUCTION.md` | Chapter 1 |
| Chapter 2 | `03_CHAPTER_2_THEORETICAL_FRAMEWORK.md` | Chapter 2 |
| Chapter 3 | `04_CHAPTER_3_MATERIALS_AND_METHODS.md` | Chapter 3 |
| Chapter 4 | `05_CHAPTER_4_RESULTS_AND_DISCUSSION.md` | Chapter 4 (the old one is template text) |
| Chapter 5 | `06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md` | Chapter 5 (the old one describes another project's auto shop application) |
| References | `07_REFERENCES.md` | References |
| Appendices | `08_APPENDICES.md` lists A to Q and where each one's content is; C, F, K, M, N, O and Q are in `appendices/` | Appendices |
| | Curriculum Vitae | Still the blank template (Section 4) |

## 2. How to paste

- **Headings.** Apply Word's Heading 1 to chapter titles, Heading 2 to 1.1, Heading 3 to 1.1.1, then
  insert an automatic table of contents. The old contents, list of tables and list of figures do
  not match the body; do not repair them by hand.
- **Tables and figures.** Every number here is already in the chapter scheme the guide asks for
  (Table 4-1, Figure 4-1, restarting each chapter). Insert each caption with **References > Insert
  Caption** (label Table or Figure, "Include chapter number" ticked) so the lists build themselves.
  Captions go **above** every table and figure, in sentence case, as written here.
- **Images.** Every image links to `docs/FINAL MANUSCRIPT/figures/`. Figure 2-2 is redrawn there
  (Adyen spelled right, and the maintenance module the objectives name added). A `[KEEP: ...]`
  marker (Figures 2-1 and 3-1) means use the image already in the old manuscript, at the page it names.
- **The AI-use statement is not in this folder.** It is ready in `_AI_USE (not in repo)/` in the
  hivelet folder, outside the repository, until the adviser says where it goes.
- **Bold brackets** `**[TO DO: ...]**` are the only things still open. Each is listed in Section 3;
  none may reach the printed copy.
- **Survey results and test figures** in Chapters 4 and 5 are final; do not round or restate them.
  `npm run check:canon` fails if a locked wording (the 50% Share, Adyen with GCash, 33 units with 32
  occupied) is changed in any file here.

## 3. What is still open

| Where | What | Who |
| :--- | :--- | :--- |
| Chapter 4, Section 4.3.7 | One sentence once the owner signs the acceptance form (the marker gives it) | Team, after the signature |
| Appendix O | The scan of the signed form. Print `docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx`; she ticks and signs only if she agrees. Never sign it for her | Team, with the owner |
| AI statement | Where it goes, and whether the prompt log is attached | Adviser |
| Acknowledgement | Who to thank; then Claude drafts it | Team decision |

Everything else in `QUESTIONS_TO_FINALIZE.md` is answered and applied. Search the folder for
`[TO DO` to see the markers still in the text.

## 4. Front matter, outside these files

From FIXES sections D and E, unchanged because only the team or the adviser can settle them:

- **Result of Final Oral Defense (p. 3):** the place and date are still placeholders.
- **The two adviser certifications (pp. 5 and 6)** carry an older title; the team is handling it.
- **Acknowledgement:** listed in the contents, not written yet (Section 3).
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

**Abstract.** The guides set no word limit; its last sentence must restate the general objective and
agree with Chapter 5, and it does. It is about 310 words.

## 6. What changed in the references

Sorted alphabetically (FIXES C7), with italics restored to the APA 7 places (journal and volume,
book and report titles), and the six ISO entries the method now cites added (2011a, 2011b, 2016a,
2016b, 2023, and ISO/IEC/IEEE 29119-1:2022). **Thevaraju et al. (2019) was removed:** it was listed but cited nowhere, which a panel reads as
padding. Monteverde et al. (2023) was also removed (Sean, 13 Oct).
**Ullah et al. (2018)**, *Sustainability* 10(9), 3142, is a review of how real estate adopts digital
technologies. The draft cited it for things it does not say (that property management workflows are
fragmented, that systems assume dedicated staff); it is now cited only for its finding that real
estate still needs to improve its adoption of digital technologies and online platforms (Sections
1.1 and 2.1.1). The 2021 details first supplied matched no article.

**Checked against each source's title and abstract (13 October 2026), and corrected where a sentence
claimed more than the source:** Mia et al. (2024) is about small Philippine enterprises in general,
so it now supports the point about small enterprises, not about residential systems or cash;
Magno et al. (2024) is no longer said to hold a view it does not state (Section 4.3.3); "significantly"
is removed where a study did not test significance; Pressman and Maxim (2020) is software
engineering, not MIS, literature. Every parenthesis with several sources lists them alphabetically,
as APA 7 asks, and the ISO group authors are spelled out at their first citation. The Laudon and
Laudon entry no longer links to an unofficial copy of the book.

**Five references added**, each one supporting a choice the method made, verified against the
publisher or Crossref: Etikan et al. (2016) for purposive and convenience sampling; Nielsen and
Landauer (1993) for why a few testers are defensible, since each additional tester finds fewer new
usability problems (it does not say three find most of them); Likert (1932) for
the scale; the Data Privacy Act of 2012 (Republic Act No. 10173), which Section 3.4 named but the
list lacked; and WCAG 2.2 (World Wide Web Consortium, 2023), the standard the accessibility scans
checked against.

**Newer sources (13 October 2026)**, each verified at Crossref or the publisher and cited only for
what its abstract says. **Someone on the team should skim each before the defense**, since a panel may
ask what it found:

| Source | What it is | Where it is cited |
| :--- | :--- | :--- |
| Laudon et al. (2026), 18th ed. | The current edition of the MIS textbook, replacing the 9th (2006). Compare Figure 2-1 with its functions-of-an-information-system figure (marker in Chapter 2) | 2.1.2 |
| Canlas et al. (2026) | FixHub, a Philippine dormitory maintenance system built with Agile and evaluated with ISO/IEC 25010 and TAM by tenants, administrators and IT professionals: the closest study to this one | 2.1.4, 2.1.6, 4.4.3 |
| Puspasari et al. (2025) | A boarding house system with WhatsApp billing notifications, used by the manager only | 2.2 |
| Muawwal (2024) | A PWA built with a manifest, a service worker and Express.js, installable and usable offline; replaces Google (2018), an old web page | 2.1.5, 2.1.6 |
| Anuar and Othman (2024) | Usability heuristics developed for PWAs (Springer) | 2.1.5 |



**From the team's own RRL (sent 13 October 2026).** Ten of the seventeen links were already cited
(Saputra, Burke, Kotkar, Mia, Puspasari, Monteverde, Setty, and the duplicates). Six more are now
cited, each checked at Crossref or on its own first page:

| Source | What it is | Where it is cited |
| :--- | :--- | :--- |
| Pernate et al. (2025), BH Niyo App | Ormoc City boarding house rentals app; Agile; ISO/IEC 25010; owners Excellent, tenants Very Good | 2.1.4, 2.1.6, 2.2, 4.1.1 |
| Mangca (2023a) | Assessment of a Surigao City boarding house booking system; notifications reduced miscommunication | 2.1.4 |
| Mangca (2023b) | The same system's design, Laravel with SMS notifications | 2.1.4, 2.2 |
| Caparos et al. (2025) | Cloud property management system, Region XII; automated billing, access control, tenant communication | 2.1.3 |
| Altinay et al. (2024) | 150 dormitory residents interviewed; information management, communication and service quality need improving | 2.1.4 |
| Thevaraju et al. (2019) | 1,000-unit apartment recorded by hand; web system built with Agile | 2.1.1 |

**Not cited:** the Scribd file ("Android App for Rental Management", Angeles City) gives no authors or
year, so APA cannot cite it; add it only if the team has its authors and year.

Monteverde and Voumick were then dropped as the two least needed (Sean, 13 Oct). The list now has 35 entries.

**Why ISO/IEC 25040:2011 and not the 2024 edition.** The 2024 edition was retitled *Quality
evaluation framework* and restructured, so its steps are not the five the evaluation followed. The
2011 process was written for the 2011 quality model the instrument is built on, so the study cites the
two as a matched pair. If asked: "We evaluated against the 2011 model, so we followed the evaluation
process written for it; Appendix M, Table M-21 shows where each result falls in the 2023 model."

## 7. Changing a file here

Do not edit the numbered files: they are rebuilt. Chapters 1 to 3, the references, the appendix
list and Appendices C, F and Q are written in `FINAL/_src/`; the Abstract, Chapters 4 and 5 and
Appendices K, M, N and O stay in `docs/FINAL MANUSCRIPT/` (in the drafts' old numbering, so other
documents that cite "Table 22A" still find it). After editing either, run

```bash
node scripts/manuscript/build-final.mjs
```

It strips the team notes, renumbers every table and figure, and fails if any text cites a table,
figure or section that does not exist, if a citation has no reference entry or an entry has no
citation, if several sources in one parenthesis are not in alphabetical order, or if a team note
survives.
