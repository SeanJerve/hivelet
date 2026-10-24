# How to study the capstone

Everything the team needs to understand Hivelet, the paper and the defense is in this folder. This
page says which document answers which question, and in what order to read them. **If a study guide
and a chapter ever disagree, the chapter wins.**

The quickest way in, on a phone: the study page,
https://claude.ai/artifact/HcPUTm1QV1Qcov8SK6MwKQ (questions to practise, numbers to check yourself
on, a quiz and the plan for the day). Sean shares it from the page's Share menu.

---

## Which document answers what

| When you want to know... | Open |
| :--- | :--- |
| The whole capstone in one sitting: the story, the numbers to know, a tour of every screen | `STUDY_GUIDE_TEAM_REVIEWER.md` |
| What a chapter, section, table or figure of the paper says, in plain words | `STUDY_GUIDE_PAPER_WALKTHROUGH.md` |
| What a word means: business terms, screen labels, technology, standards, statistics, every BR, FR and NFR code, every abbreviation | `STUDY_GUIDE_GLOSSARY.md` |
| What the panel is likely to ask, with the answer and the section that proves it | `STUDY_GUIDE_DEFENSE_QA.md` |
| How a feature works end to end: its screen, endpoint, code and tables; security; how money is computed | `STUDY_GUIDE_CODE.md` |
| What a frontend file does (every file under `frontend/src`, plus the app's installable parts) | `STUDY_GUIDE_CODE_FRONTEND_FILES.md` |
| What a backend file, route, table, migration or check suite does | `STUDY_GUIDE_CODE_BACKEND_FILES.md` |
| What a reference found and where the paper uses it | `STUDY_GUIDE_REFERENCES.md` |
| What to say on each slide | `DEFENSE_PRESENTATION_SCRIPT.md` and `HIVELET DEFENSE SLIDES.pptx` |
| How to run the live demo, and what to do if it fails | `DEMO_SCRIPT.md` |
| What is still waiting on someone | `00_NEEDS_YOUR_ATTENTION.md` |

## A reading order

1. **Everyone, first:** `STUDY_GUIDE_TEAM_REVIEWER.md`, sections 1 to 4 (the story and the numbers).
   Keep `STUDY_GUIDE_GLOSSARY.md` open beside it for any word that stops you.
2. **Everyone, the paper:** read each chapter (`01_ABSTRACT.md` to `06_...`), then its part of
   `STUDY_GUIDE_PAPER_WALKTHROUGH.md`. End with its checklist, "Can you explain these without notes?".
3. **Everyone, the questions:** `STUDY_GUIDE_DEFENSE_QA.md`, or the Questions tab of the study page in
   practice mode. Learn the three weak spots well: Usability (the owner's two 3s), Maintainability
   (154 of 204 database calls inside the request handlers) and the ten-respondent sample.
4. **By topic, then go deeper on your own:**
   - the problem and the paper: `STUDY_GUIDE_REFERENCES.md` and the walkthrough of Chapters 1 to 3;
   - the system and the code: `STUDY_GUIDE_CODE.md`, then the two file-by-file guides;
   - testing and the evaluation: the walkthrough of Sections 4.3 and 4.4, and the Testing and ISO
     sections of the Q&A;
   - design and the screens: `STUDY_GUIDE_CODE_FRONTEND_FILES.md` and the screen tour in the
     reviewer, section 5.

   Agree who answers which topic before the day.
5. **Together, last:** rehearse with `DEFENSE_PRESENTATION_SCRIPT.md` and the slides, then run the
   demo once on the real devices with `DEMO_SCRIPT.md`.

## Rules for saying things aloud

- Say a number only if it is in a chapter or a guide. If you forget it, say where it is.
- The 50% Share, exactly: "a system-computed figure equal to half that row's Rent Amount, kept for
  ledger parity with the owner's historical spreadsheet." Nothing more about it.
- GCash through Adyen works end to end on Adyen's test account, so no real money moves yet.
- 33 units, 32 occupied (the live site may show 33 of 33: the test account holds PH for the demo).
- Nobody signs in with an email: it is a login ID or a phone number.
