# docs/FINAL MANUSCRIPT: the sources FINAL/ is built from

**Read `FINAL/00_READ_ME_FIRST.md` instead.** This folder holds the files that
`node scripts/manuscript/build-final.mjs` turns into `FINAL/`; edit them here, then run it.
The working notes that used to be here (the fixes list, the guide alignment, the team task and
question lists, the testing-day forms, the table numbering map, the audits) were archived on
13 October 2026 to `_ARCHIVE (not in repo)/2026-10-13 cleanup/docs/FINAL MANUSCRIPT/`.

| File | Becomes |
| :--- | :--- |
| `ABSTRACT.md` | `FINAL/01_ABSTRACT.md` |
| `CHAPTER_4_RESULTS_AND_DISCUSSION.md` | `FINAL/05_CHAPTER_4_RESULTS_AND_DISCUSSION.md` (also built to `.docx` by `node scripts/build-chapter-4-docx.mjs`) |
| `CHAPTER_5_SUMMARY_CONCLUSIONS_RECOMMENDATIONS.md` | `FINAL/06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md` |
| `USER_MANUAL_APPENDIX_K.md` | Appendix K |
| `TESTING_DAY_TEST_CASES.md` | Appendix L |
| `APPENDIX_M_CHAPTER_4_EVIDENCE.md` | Appendix M |
| `APPENDIX_N_DATA_DICTIONARY.md` | Appendix N (generated from the live schema by `node scripts/manuscript/build-data-dictionary.mjs`) |
| `APPENDIX_O_UAT_SIGN_OFF.md`, `UAT_SIGN_OFF_FORM.docx` | Appendix O; the form to print and have signed |
| `CONSENT_FORM.pdf`, `.docx`, `_PRINT.html` | Appendix P |
| `survey/` | Appendix J, the survey instrument, and the Google Form script `compute-survey.mjs` reads |
| `figures/` | Every figure; diagrams drawn by `node scripts/build-chapter-4-diagrams.mjs` |
| `TENANT_QUICK_GUIDE_PRINT.html` | The one-page tenant handout (Appendix K, Part 1) |
