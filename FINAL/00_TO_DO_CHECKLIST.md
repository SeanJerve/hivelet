# Hivelet: what is left to do

Written 12 November 2026 from Sean's answers the same day, and brought up to date that evening. Tick
each box (`[x]`) when it is done.
Every item says **what it is**, **why it is needed** and **what to do**. The paper itself is finished
and checked: what is left is signatures, scans, forms and a few decisions only people can make.

Where the files are: the defense folder is `_DEFENSE CHECKLIST/`, one folder per Form 2 item. After you
put a scan or a signed form in its folder, run `node scripts/manuscript/build-defense-folder.mjs` and
it updates `00 STATUS` by itself.

**The repository is public.** Never commit a signed form, a consent form or anything with a tenant's
name. Signed consent forms go only in `_CONSENT_FORMS (not in repo)/`.

**Done on 12 November, nothing for you to do:**
- [x] The whole paper read for purpose: repeats, filler and claims with no basis cut, every number,
  citation and reference kept.
- [x] One name for one thing. Michelle manages the boarding house for its owner, so the paper, the
  figures, the guides and the slides call her **the landlady**. "The owner" means only the proprietor
  (for example, going live with GCash needs the owner's merchant onboarding documents).
- [x] "Booking and reservation management" explained once: an inquiry the landlady answers, a unit she
  can mark Reserved, and a move-in from the inquiry. Nothing is booked or paid for online.
- [x] The 4 November rerun stated the same way everywhere: 77 of the 114 test cases run and passed,
  37 left for a person, none failed.
- [x] Recommendation 4 rests on the 15 October evaluator's written comment (Section 4.4.6).
- [x] The small design and wording choices (B-121, item 18) are in the system and live.
- [x] The Laudon et al. year (item 10).
- [x] The Word manuscript, the slides, the study guides and the defense folder rebuilt.
- [x] The three technical evaluators of 12 November added (Sean). The main result is now the
  second round on the redesigned system: 16 users 4.82 and 3 technical evaluators 4.90, every
  characteristic Very High Quality. The October round (5 users 4.75, 5 evaluators 4.34) is the
  "before the redesign" comparison in Appendix M, Tables M-28 and M-29. Answers saved, names blank,
  in docs/TESTING_DAY/results/TECHNICAL_2026-11-12_ISO_IEC_25010_Software_Quality_Assessment.csv.
  Lloyd: Chapters 3 to 5, the abstract and Appendix M changed again, so take them from the new
  CLAUDE MANUSCRIPT.docx.

---

## A. Before the pre-defense clearance (Form 2)

Form 2 is the **Pre-Defense Clearance Checklist**: 23 items the Faculty-in-Charge (FIC) checks before
the team is allowed to schedule the final defense. Each item below is one we cannot finish alone.

### [ ] 1. Consultation record (Form 2 items 2, 16 and 17)

- **What it is:** a record of each meeting with the adviser: the date, what he said, what the team
  did about it, and his signature. Form 2 asks for one with the Content Adviser (item 16) and one
  with the Programming Adviser (item 17). Sir Jayvee is both, so **one record covers both items.**
  Item 2 ("every comment of the Content Adviser addressed") is proved by the same record.
- **Why:** without it the FIC cannot see that the adviser guided the study and that his comments
  were acted on.
- **What is ready:** `FINAL/FORM_2_EVIDENCE/CONSULTATION_RECORD.md`, also in folders 16 and 17.
  Sessions 1 (26 February), 2 (2 March) and 3 (22 September) are filled in, each point with what the
  team did about it.
- **To do:**
  - [ ] Print it.
  - [ ] Have Sir Jayvee sign Sessions 1, 2 and 3.
  - [ ] Hold Session 4 before the final defense, write down what he says, have him sign it.
  - [ ] At Session 4, also ask him the two questions of item 9 (the AI wording and where the
    statement goes), and whether he wants two outside suggestions back in recommendation 4: record
    each tenancy's agreed term, and warn when a unit has more people than it holds. They are out of
    the paper now because no survey answer or test supports them.
  - [ ] Scan the signed record into folders 16 and 17.

### [ ] 2. Forms 3A and 3B, signed (Form 2 items 18 and 19)

- **What they are:** the advisers' **endorsements**, their signed statement that the paper is ready
  to be defended. Each is a one-page checklist from the FIC (the blank forms are in
  `_DEFENSE CHECKLIST/Forms from the FIC (blank)/`).
  - **Form 3A, Content Adviser Endorsement:** 16 questions about the writing. Is the background a
    funnel from the world down to Legazpi City? Does it end on the gap? Are the objectives SMART? Is
    there a Literature Map? Do the conclusions answer every objective? And so on.
  - **Form 3B, Programming Adviser Endorsement:** 6 questions about the system. Were the objectives
    built? Was the approved method (Agile) used? Are the context diagram, the data flow diagrams in
    Gane and Sarson down to Level 2, the use case diagram and the entity-relationship diagram all
    attached?
- **Why:** the FIC will not clear the team for the defense without both advisers' signatures.
- **Where we stand:** every one of the 22 questions is already met. Each is checked against the paper,
  with the page it points to, in `FINAL/FORM_2_EVIDENCE/FORMS_3A_3B_CHECK.md`. Show Sir Jayvee that
  file so he can tick each box quickly.
- **To do:**
  - [ ] Print Forms 3A and 3B and fill in the header (title, the five proponents, section, adviser).
    The form has lines for four proponents: **add a fifth line** for the fifth member.
  - [ ] Attach the four diagram annexes to Form 3B: Appendices D (context diagram), E and F (data
    flow diagrams, Levels 1 and 2), G (use case diagram) and H (entity-relationship diagram).
  - [ ] Sir Jayvee signs both.
  - [ ] Scan them into folders 18 and 19.

### [ ] 3. Similarity check (Form 2 item 5)

- **What it is:** the whole manuscript is run through a checker (usually **Turnitin**) that compares
  it with published papers and the internet and reports what percentage matches. The FIC sets the
  highest percentage allowed.
- **Why:** it proves the paper is the team's own work, not copied.
- **Good to know:** Turnitin also has a separate **AI-writing detector**. The paper was drafted with
  the help of an AI assistant, which the paper discloses (item 9 below). If the FIC also runs the AI
  detector, the disclosure is the honest answer to whatever it reports. Ask the FIC which reports
  they need: similarity only, or AI as well.
- **To do:**
  - [ ] Ask the FIC who runs it (the team or the FIC) and what the threshold is.
  - [ ] Run it on `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx` (the whole paper).
  - [ ] If a passage is over the limit, send Claude the report: it rewrites those passages.
  - [ ] Put the report in folder 05.

### [ ] 4. The landlady's signature on the UAT form (Form 2 item 9): signed 12 November, scan left

- **What it is:** UAT means **User Acceptance Testing**: the client uses the system herself and signs
  that it does what she needs. Our form is Appendix O. The landlady did the walkthrough on 30
  September and used it again in the second round.
- **Why:** the course guide accepts acceptance results only with the client's signed form. Without
  it, Chapter 4 can say she tested the system but not that she accepted it.
- **Important:** she signs **only if she agrees.** Never sign it for her.
- **To do:**
  - [x] Print the form (the one-page version in `FINAL/PRINT FOR SIGNING/`, 12 November).
  - [x] The landlady signed it (12 November). It has no line for the adviser.
  - [x] Section 4.3.7 and conclusion 3 now say she accepted the system and signed (12 November).
  - [ ] Scan it, keep the scan outside the repository, and place it in Appendix O of the Word file.

### [ ] 5. Acceptance form or MOA (Form 2 item 10): both signed by the client, Sir Jayvee left

- **What it is:** Form 2 item 10 asks for proof that the system was **deployed** where it is meant to
  be used, and that the client **accepted** it. It names two kinds of paper:
  - a **Client or End-User Acceptance Form**: a short letter or form, signed by the landlady, saying she
    received the system and accepts it; or
  - an **MOA (Memorandum of Agreement)**: a signed agreement between the team and the boarding house,
    saying the team gives the boarding house the system (free, as Section 4.5 says) and what each side
    does after.
- **Why:** the deployment report (already in folder 10) shows the system runs. This paper shows the
  boarding house agreed to receive it.
- **Where we stand (12 November):** both exist, one page each, in `FINAL/PRINT FOR SIGNING/`. The
  owner and the landlady signed the Client Acceptance Form, and the owner and the five of us signed
  the MOA. **Sir Jayvee has not signed either yet** (Turned over by on the acceptance form, Noted by
  on the MOA).
- **To do:**
  - [x] Draft, print and have the client sign both (12 November).
  - [ ] Sir Jayvee signs both: bring them to the same visit as items 1 and 2.
  - [ ] Ask the FIC whether item 10 needs the acceptance form, the MOA or both.
  - [ ] Scan them, keeping the scans outside the repository.

### [ ] 6. Form 1 template (Form 2 items 1 and 4)

- **What it is:** Form 1 is the FIC's **manuscript template**: the Word file that sets how the paper
  must look (margins, font and size, spacing, the order of the front pages, how headings, tables and
  captions are written, and the reference style). Form 2 item 1 asks for "Chapters I to V complete
  and **on the Form 1 template**", and item 4 asks for the references in its style.
- **Why:** the panel and the FIC check the layout. A paper in the wrong format can be sent back.
- **Where we stand:** the Word manuscript follows the layout of the team's proposal (US Letter, 1.5
  inch left margin, Arial 12, double spaced, APA 7 references). Form 1 itself is **not** in the LMS
  folder Sean shared (that folder has Forms 2 to 9 only), so it has not been compared.
- **To do:**
  - [ ] Find Form 1 on the LMS or ask the FIC for it.
  - [ ] Give it to Claude: it compares the paper with it and fixes any difference.

---

## B. For the paper

### [ ] 6b. Bring the team's Word manuscript up to date (Lloyd)

- **What:** the team's Word file ("REVISED AFTER PROPOSAL", 240 pages, checked as a PDF on 12
  November) has the right front matter but **old chapters**. Chapter 1 is from before 10 November:
  it still cites Mia et al. (2024) for the opposite of what that study found, has no world-to-Legazpi
  funnel, and ends 1.1 with "This study proposes Hivelet", which Form 3A item 3 does not allow.
  Chapters 2 and 3 have the old section titles (for example 2.1.1 "Structural Inefficiencies in
  Property Management Systems"). Chapters 4 and 5 and the appendices are from 10 to 11 November:
  "the owner" appears 169 times, the old rerun wording and the old Booking Inquiry term are there.
  The Abstract page is empty.
- **Why:** the panel reads the Word file, not the repository. Everything checked and corrected since
  10 November is only in `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx`.
- **To do:**
  - [ ] Keep the front pages (title page to List of Figures). Replace everything from **1 INTRODUCTION**
    to the end of the appendices with the same part of `FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx`
    (already Arial 12, double spaced, 1.5 inch left margin, final table and figure numbers).
  - [ ] Paste the Abstract from the same file onto the Abstract page.
  - [ ] Appendix P: insert `docs/FINAL MANUSCRIPT/CONSENT_FORM.pdf` (the blank form) in place of its
    TO DO line. Appendix O: insert the scan of the landlady's signed form (keep the scan out of the
    repository).
  - [ ] Fix the end of the file: a heading "Appendix N: Source Code" sits before the Curriculum Vitae,
    Appendix Q's page holds CV template text, and Appendix R's text runs into the CV. Order must be
    A to R, then the five CVs.
  - [ ] Result of Final Oral Defense page: the date still says January 1, 2023, and the place is a
    placeholder. Fill both once the defense is scheduled.
  - [ ] Write Prof. Rodriguez's degrees the same way on every page ("MIT/MCS" on the panel pages,
    "MSCS, MIT" on the approval sheet). Check the correct form with him or the department.
  - [ ] The Acknowledgement page is missing (item 7). Add it after the Programming Adviser's
    Certification.
  - [ ] Update the table of contents last (right-click it, Update Field, Update entire table). Its
    page numbers are wrong now (Chapter 4 listed at page 30 but starting at 46), it shows
    "CURRICULUM VITAEx", and it lists Appendix N's 24 table names as entries. Keep only the appendix
    titles.

### [ ] 7. Acknowledgement

- **What it is:** the page near the front where the team thanks the people who helped: the adviser,
  the landlady, the tenants and prospects who tested, the technical evaluators, family, and anyone
  else the team chooses.
- **Why:** it is a required front page of the manuscript.
- **To do:**
  - [ ] Send Claude the list of people to thank (and how each should be named). Claude drafts it.
  - [ ] The team reads and approves it.

### [ ] 8. Scans for Appendices A and B

- **What they are:**
  - **Appendix A, Letter of Request:** the signed letter of request asking to study the boarding
    house and use its records.
  - **Appendix B, Adviser appointment:** the paper that appoints Sir Jayvee as the team's adviser.
- **Why:** the paper lists both appendices, but today they have only their headings. They prove the
  study had the boarding house's permission and an official adviser.
- **To do:**
  - [x] Letter of request: printed and signed by the owner and the five of us (12 November).
  - [ ] Sir Jayvee signs it as Noted by (same visit as items 1, 2 and 5), then scan it.
  - [ ] Find the adviser appointment paper and scan it.
  - [ ] Give both to Claude: they go into the Word manuscript as Appendices A and B (the scans go in
    the Word file only, not in the repository, if they carry signatures).

### [ ] 9. The AI-use statement

- **What it is:** a disclosure that the team used an AI coding assistant (Claude) to build the system
  and draft parts of the paper, and what the team did itself. A memorandum from CHED requires the
  disclosure and lets each school decide its form. It has three parts:
  - **The short disclosure inside the paper,** Chapter 3, Section 3.1.1: two paragraphs say the
    screens and the record-transfer scripts were made "with the help of an AI coding assistant and
    reviewed by the researchers".
  - **The full statement,** already written, kept outside the repository in
    `_AI_USE (not in repo)/AI_USE_STATEMENT.md`: which tools, what they made, and what the team did
    and is responsible for.
  - **The prompt log:** the record of what was asked of the AI, exported from each computer that used
    it.
- **Why:** using AI without saying so can be treated as dishonesty. Saying it plainly, with what the
  team did, protects the team at the defense and in the similarity check (item 3).
- **To do:**
  - [ ] Ask Sir Jayvee to read the wording in Section 3.1.1 and confirm it. One word in it changed on
    12 November: "the owner's past records" became "the landlady's past records".
  - [ ] Ask him where the full statement goes (a page after the Abstract, the end of Section 3.2, or
    an appendix) and whether the prompt log must be attached. Tell Claude his answer.
  - [x] Lloyd's prompt log exported (12 November): 252 prompts in 13 sessions, 17 September to 12
    November, in `ai-use-log/` on his laptop (never committed). The file to share is
    `PROMPT_LOG_LAPTOP-2F4BFUEL - SHAREABLE.md`: two pasted passwords (since changed), payment strings,
    Google Docs links and the names of 42 private people removed. The original stays on the laptop.
  - [ ] Lloyd sends Sean the shareable copy and the summary privately, not through the repository.

### [x] 10. The year of Laudon et al. (done 12 November)

- Checked on Pearson's own page: the 18th edition was published on 6 February 2025 and carries
  **© 2026**. APA 7 cites the copyright year, so **"Laudon et al. (2026)" is correct**. Nothing changes.

---

## C. Consent forms (Sean)

### [x] 11. Scan the second round's consent forms (done 12 November)

- **What:** the ten tenants who did the tasks between 31 October and 10 November signed paper consent
  forms. Prospective tenants and technical evaluators signed none: they agreed through the privacy
  notice at the start of the questionnaire, as Chapter 3 says.
- **Why:** Chapter 3 says the landlady and each tenant signed. The scans are the proof if the panel asks.
- **To do:**
  - [x] Scanned on 12 November: all ten, one PDF in `_CONSENT_FORMS (not in repo)/` on Lloyd's laptop.
    **Never into the repository.** Some of the ten did not agree to photos or to their face in the
    paper, so check a tenant's own form before any photo of them is used.

### [ ] 12. Fill in "Research team member present" on the 30 September forms

- **What:** the line on each form for the team member who ran that person's session is blank on all
  four forms of 30 September (the landlady and three tenants).
- **To do:**
  - [ ] Write the name on each paper original. It is blank on all ten second-round forms too.

---

## D. Before the defense day

### [ ] 13. Slide 1

- [ ] Fill in the team members' names, the adviser and the defense date on slide 1 of
  `FINAL/HIVELET DEFENSE SLIDES.pptx`.

### [ ] 14. Backup copy

- **What:** a copy of the slides, the paper and the defense video on a USB drive or the laptop, and a
  database backup (`npm run backup`), in case the internet or the projector fails.
- [ ] Make it the day before.

### [ ] 15. Printed copies (Form 2 item 23)

- [ ] Print the manuscript copies Form 2 asks for: one for each of the **three panelists** and one for
  each of the **two advisers**. Sir Jayvee is both advisers, so ask the FIC whether that is four
  copies or five.

### [ ] 16. The day-before steps in `FINAL/DEMO_SCRIPT.md`

- **What:** the checklist for the live demonstration: sign in once as the landlady and as the test
  tenant, open the installed app on the demonstration phone, reject one GCash test payment, put the
  offline fallback on the laptop, and remove test items.
- [ ] **Close the open test repair on unit PH** (one was still open on 10 November).
- [ ] Ask the landlady whether her screens may be shown. If not, demonstrate with the test tenant
  only.

---

## E. Sean only

### [x] 17. Two questions for the landlady (B-115): answered 12 November

- **What:** while checking the records, two things could not be confirmed from her workbook:
  - **F1, August rent:** no August receipt is recorded for unit F1. Did the tenant pay it?
  - **Unit 2c, water:** her receipt charges water for 4 people. Is 4 the right number of people in 2c?
- **Why:** the system shows exactly what is recorded. If something is missing or wrong, only she can
  say so, and then it is corrected by a numbered migration, never by hand.
- **Answers (the landlady, through Lloyd, 12 November):**
  - **F1 is paid through December.** August was paid; its receipt is just not entered. The landlady
    enters F1's missing receipts on Monthly Income from her receipt book, which also settles the
    August bill.
  - **2c has 4 people.** Her receipt (water for 4, ₱800) is right.
- **To do:**
  - [x] Ask the landlady.
  - [ ] The landlady enters F1's missing receipts (August onward) on Monthly Income.
  - [ ] Sean: correct the 2c bill of 26 September (water for 1 instead of 4) by a numbered
    migration if it is still open (B-115).

### [ ] 17b. The three technical evaluators of 12 November (Sean)

The panel may ask about them, since three people gave nearly every item 5 within eleven minutes, and
one comment quotes the 0.08 from our own Table M-31. Be ready to say:

- [ ] Who they are and why they count as technical evaluators (IT professional, developer or IT
  faculty), and that none is on the team. The paper says so (Section 4.4.1).
- [ ] What they reviewed: the live site or the demonstration copy with sample data. The paper does
  not say yet. If it was the live site, tell Claude, since Section 3.4 says no outside reviewer saw
  the landlady's records.
- [ ] How many were sent the form. Table 4-15 says "Not recorded" until you give the number.

### [x] 18. Small design and wording choices (B-121): done 12 November

- **What this means:** on 6 November every screen was clicked through. No errors were found, but
  some **small inconsistencies** were: two screens wording the same thing differently, or one button
  that asks "are you sure?" while a similar one does not. None is wrong. Each is a **choice about
  how the system should look or speak**, which is why it waits for Sean rather than being changed by
  Claude. The first two (the homepage GCash sentence and which bill GCash pays first) were fixed on 6
  November. These remain, each with Claude's suggestion:

  | | What was found | Suggestion |
  | :--- | :--- | :--- |
  | a | **Verify payment**, **Mark resolved** and **Send technician** save at once, while **Reject** asks "are you sure?" first | Keep: rejecting is the only one that is hard to undo |
  | b | When editing a payment, Water can be typed, but the server recalculates it from the number of people | Make the Water box read-only, so it never looks like a typed value was saved |
  | c | The same thing is worded two ways on different screens: "Occupants" and "How many people", "Record it" and "Record entry", "No active tenants", "Vacant" and "Nobody" | Pick one word for each and use it everywhere |
  | d | The address is written three slightly different ways on the public site | Use one spelling everywhere |
  | e | A repair shows 4 steps in its window (it adds Closed after Done) but 3 in its row | Show 3 in both |
  | f | Sign-in uses the browser's own "Please fill out this field" message | Replace with the system's own message, in its own style |
  | g | The inquiry form from a unit's page starts with text already typed in, but `/inquire` starts empty | Keep: the unit page knows which unit is asked about |
  | h | A Closed inquiry still shows the reply box | Hide the reply box once an inquiry is Closed |
  | i | 13 of the 33 tenancies have an anniversary date different from their move-in date | Keep: the anniversary comes from her workbook, and the system shows what is recorded |
  | j | Unit PH (the test tenant) has October and November bills still "Due" although test receipts cover them | Goes away when the test tenant is moved out (item 19) |

- **Done 12 November:** Sean chose the suggestions, and they are in the system. b, c, d, f and h
  were changed. a, g and i were kept. e was already fixed. j waits for item 19.

### [ ] 19. Move the test tenant out of unit PH (after the defense)

- **What:** since 1 October the team's test account has lived in unit PH so the demonstration can
  pay and request repairs without touching a real tenant. Because of it the public site shows 33 of
  33 units occupied, while the property really has 32.
- [ ] After the defense, move the test tenant out through Tenants, so PH shows as vacant again (B-106).

---

## Later, not now (Sean, 12 November)

| Item | What it is |
| :--- | :--- |
| **Mock defense** (Form 2 items 20 and 21) | A practice defense before a panel. Form 2 asks for its evaluation sheet and the list of what the team changed after it. When it is held, send Claude the panel's comments and it records what was done |
| **Front matter** | The title page, approval sheet, defense date and room, and each member's Curriculum Vitae, made in the team's Word file |
| **Turnover database script** (Proponent's Checklist item 31) | A copy of the live database's structure only (no records), for the turnover package. Claude can make it when asked: it only reads |
| **Forms 4 to 9** | The forms for scheduling, grading, revisions and editing. They come after the clearance. The blanks are in the defense folder |
