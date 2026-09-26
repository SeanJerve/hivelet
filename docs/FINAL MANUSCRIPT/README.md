# FINAL MANUSCRIPT

The working copy of the capstone manuscript for Hivelet. **The Markdown files in this folder are
now the source we write in**; the finished text is carried into the `.docx` at the end.

| File | What it is | State (2026-09-26) |
| :--- | :--- | :--- |
| `Hivelet_Manuscript_as_of_2026-09-18.pdf` | The manuscript as it stood on 18 September. Kept only to compare against; **do not cite it as a description of the system** | Old version |
| `FIXES_TO_CHAPTERS_1_TO_3.md` | Every error found in the front matter and Chapters 1 to 3, with paste-ready replacements | Ready to apply |
| `CHAPTER_4_RESULTS_AND_DISCUSSION.md` | Replaces the Lorem Ipsum Chapter 4 | Drafted; walkthrough, performance and survey data pending |
| `CHAPTER_5_SUMMARY_CONCLUSIONS_RECOMMENDATIONS.md` | Replaces the auto shop Chapter 5 left over from another project | Drafted; parts that depend on the survey pending |
| `TEAM_TASKS_WE_DO_OURSELVES.md` | What the team must do in person (usability testing, security scans, walkthrough) and what Claude does with the results | Checklist |

## Three things the old PDF gets wrong that matter most

1. **Chapters 4 and 5 are not Hivelet.** Chapter 4 is placeholder text, and Chapter 5 describes an
   auto shop booking app, with ISO ratings that belong to that app.
2. **Chapter 3 describes a different technology stack** (MySQL, plain HTML and JavaScript, a
   university server). The system is Vue 3, Express and PostgreSQL 17.6 on Supabase, hosted on
   Vercel.
3. **§1.4 says 32 units and §2.4 calls the payment feature a simulation.** The property has 33
   units, and the payment feature is Adyen with GCash, configured and operational.

## Rules for writing here

- **Every number comes from the system or from a check run, with its date.** Never estimate.
- **Pending stays pending.** A table with no data says [DATA PENDING]; it is never filled from
  expectation.
- **Plain words.** Write so a panel member and the owner can both read it on the first try.
- The same wording rules as the rest of the repository apply, and `npm run check:canon` checks
  these files on every run.

The older drafts in `docs/chapter 4 tenative/` are superseded by this folder, except the survey
instrument (`ISO_25010_SURVEY_INSTRUMENT.md`), which stays there and is still the source for the
survey questions.
