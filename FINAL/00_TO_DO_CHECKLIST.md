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

### [ ] 4. The landlady's signature on the UAT form (Form 2 item 9)

- **What it is:** UAT means **User Acceptance Testing**: the client uses the system herself and signs
  that it does what she needs. Our form is Appendix O. The landlady did the walkthrough on 30
  September and used it again in the second round.
- **Why:** the course guide accepts acceptance results only with the client's signed form. Without
  it, Chapter 4 can say she tested the system but not that she accepted it.
- **Important:** she signs **only if she agrees.** Never sign it for her.
- **To do:**
  - [ ] Print `_DEFENSE CHECKLIST/Form 2 - 09 UAT sign-off/UAT sign-off form (blank, to print).docx`.
  - [ ] The landlady reads it and signs if she agrees.
  - [ ] Scan it into folder 09, and tell Claude: it adds one sentence to Section 4.3.7.

### [ ] 5. Acceptance form or MOA (Form 2 item 10)

- **What it is:** Form 2 item 10 asks for proof that the system was **deployed** where it is meant to
  be used, and that the client **accepted** it. It names two kinds of paper:
  - a **Client or End-User Acceptance Form**: a short letter or form, signed by the landlady, saying she
    received the system and accepts it; or
  - an **MOA (Memorandum of Agreement)**: a signed agreement between the team and the boarding house,
    saying the team gives the boarding house the system (free, as Section 4.5 says) and what each side
    does after.
- **Why:** the deployment report (already in folder 10) shows the system runs. This paper shows the
  boarding house agreed to receive it.
- **Where we stand:** neither exists yet. The UAT form of item 4 may be enough.
- **To do:**
  - [ ] Ask the FIC: "Does the signed UAT form count as the acceptance form for item 10, or do you
    need a separate acceptance form or MOA? Is there a template?"
  - [ ] If a separate one is needed, tell Claude which kind: it drafts it for the landlady to sign.
  - [ ] Scan the signed paper into folder 10.

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
  - [ ] Find the signed letter of request and scan it.
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
  - [ ] Lloyd: on his laptop, run `node scripts/ai-use/export-prompt-log.mjs` and send Sean the file.

### [x] 10. The year of Laudon et al. (done 12 November)

- Checked on Pearson's own page: the 18th edition was published on 6 February 2025 and carries
  **© 2026**. APA 7 cites the copyright year, so **"Laudon et al. (2026)" is correct**. Nothing changes.

---

## C. Consent forms (Sean)

### [ ] 11. Scan the second round's consent forms

- **What:** the ten tenants who did the tasks between 31 October and 10 November signed paper consent
  forms. Prospective tenants and technical evaluators signed none: they agreed through the privacy
  notice at the start of the questionnaire, as Chapter 3 says.
- **Why:** Chapter 3 says the landlady and each tenant signed. The scans are the proof if the panel asks.
- **To do:**
  - [ ] Scan the ten forms into `_CONSENT_FORMS (not in repo)/`. **Never into the repository.**

### [ ] 12. Fill in "Research team member present" on the 30 September forms

- **What:** the line on each form for the team member who ran that person's session is blank on all
  four forms of 30 September (the landlady and three tenants).
- **To do:**
  - [ ] Write the name on each paper original. Do the same on the ten new forms if it is blank there.

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

### [ ] 17. Two questions for the landlady (B-115)

- **What:** while checking the records, two things could not be confirmed from her workbook:
  - **F1, August rent:** no August receipt is recorded for unit F1. Did the tenant pay it?
  - **Unit 2c, water:** her receipt charges water for 4 people. Is 4 the right number of people in 2c?
- **Why:** the system shows exactly what is recorded. If something is missing or wrong, only she can
  say so, and then it is corrected by a numbered migration, never by hand.
- **To do:**
  - [ ] Ask Lloyd or the landlady, and tell Claude the answers.

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
