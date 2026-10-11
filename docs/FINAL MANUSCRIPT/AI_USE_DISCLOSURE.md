# Use of AI in the Hivelet project: what to disclose, and the evidence for it

> **TEAM NOTE (delete before pasting).** Written 11 October 2026. CHED Memorandum Order No. 21,
> s. 2026 (announced 22 September 2026) requires students to disclose AI use in academic
> submissions, theses included, and leaves the form of the disclosure to each school. **Bicol
> University's own rule has not been found, so ask the adviser two things:** where the statement
> goes (Chapter 3, the front matter, or an appendix) and whether a prompt log must be attached.
> Everything below is counted from the repository and from the Claude Code session logs on Sean's
> machine; each figure names its source. Rows marked **TEAM TO CONFIRM** are things only the team
> knows.

---

## 1. The statement (paste-ready)

Put it where the adviser says. As a front-matter page it is titled **Statement on the Use of
Artificial Intelligence**; as a section it fits at the end of Section 3.2.

> The researchers used generative AI coding assistants throughout the development of Hivelet,
> principally Claude Code (Anthropic), running the Claude Opus 5, Claude Sonnet 5 and Claude Opus
> 5.5 models, from 13 September 2026 onward. [TEAM TO CONFIRM: the tool used in the first
> iteration, 24 July to 28 August 2026.] The assistant generated most of the program code, the
> interface (which was prototyped directly in code, without a separate design tool), the database
> migrations, the automated checks, the diagrams in Figures 4 to 9, and first drafts of technical
> documents and of Chapters 4 and 5. Of the project's 1,631 recorded changes, 1,474 are marked in
> the version history as made with the assistant.
>
> The researchers directed the work and remain responsible for it. They gathered the requirements
> from the landlady, decided what the system should do, gave the assistant standing written
> instructions (including that the live database may never be reset and that every change to it is
> a reviewed, numbered migration taken after a backup), reviewed its output, approved every change
> to the live database, and carried out the testing with the landlady, the tenants and the technical
> evaluators. The assistant's output was verified, not assumed: twenty automated check suites run
> against the code and the live database; each new check was tested by deliberately breaking what it
> guards; and the second iteration was given over to checking the system and its documents against
> each other, which found and corrected 22 recorded errors, most of them claims written during the
> AI-assisted first iteration without being checked against the system. All survey responses, test results and client decisions reported in this study come
> from people, and none was produced by the assistant.

**Check the statement against what really happened before you sign off on it.** In particular,
the second paragraph says the team reviewed the output. If any member cannot explain a part they
are named against, that is what to fix before the defense (Section 6), not the sentence.

## 2. Tools, models and dates

| Period | Tool | Models | Where | Source |
| :--- | :--- | :--- | :--- | :--- |
| 24 Jul to 28 Aug 2026 (Iteration 1) | **TEAM TO CONFIRM.** The repository shows an `.agent/` folder created 8 August (a layout some agent tools use) and one commit mentions Lovable; only 1 of the 95 commits carries an AI trailer | | | `git log`; `.agent/` |
| 13 Sep 2026 onward | Claude Code (command line, VS Code extension, desktop app) | Claude Opus 5, Claude Sonnet 5, Claude Opus 5.5 | Sean's machine | Session logs; `ai-use-log/SUMMARY_*.md` |
| 17 Sep 2026 onward | Claude Code | **TEAM TO CONFIRM** (run the export on that machine) | Lloyd's machine | 369 commits by `jlmc2023-...` |

**Changes marked as made with the assistant**, by commit date (an author of "Claude" or a
"Co-Authored-By: Claude" line):

| Iteration | Marked | All commits |
| :--- | --: | --: |
| 1 (to 28 Aug) | 1 | 95 |
| 2 (29 Aug to 14 Sep) | 105 | 107 |
| 3 (15 Sep onward) | 1,368 | 1,429 |
| **All** | **1,474** | **1,631** |

The trailer was added by the tool, so the count is a floor: a change made with AI help and
committed by hand carries no mark.

## 3. The instructions given to the assistant

This is what the strictest reading ("the exact prompts or system instructions") asks for.

| What | Where |
| :--- | :--- |
| **Standing instructions**, read at the start of every session | `CLAUDE.md` (the five rules, verification, how to work); its history is in `git log -- CLAUDE.md` |
| **Hand-over notes** each session started from | `CONTINUE_HERE.md`, `HANDOFF_TO_*.md`, `BLOCKED_FOR_SEAN.md` |
| **Every prompt a person typed**, dated | `ai-use-log/PROMPT_LOG_<machine>.md`, made by `node scripts/ai-use/export-prompt-log.mjs`. On Sean's machine: **401 prompts in 8 sessions, 13 September to 11 October 2026** |

**The prompt log is not in the repository, on purpose.** The repository is public, and prompts
quote tenants' details and once quoted a credentials file. The script masks keys, passwords, emails
and phone numbers, but it cannot recognise a tenant's name. **Read the log before giving it to
anyone**, and hand it over only if the adviser asks for it, as a file, not in the manuscript.

**Run the export on every machine that used Claude Code** (Lloyd's especially). Each machine keeps
its own logs, and they are deleted when the tool's history is cleared, so do it soon:

```bash
node scripts/ai-use/export-prompt-log.mjs
```

## 4. Who did what

From the records. **The team should correct this table where it is wrong**; it is the part a panel
is most likely to probe.

| Work | Done by | Evidence |
| :--- | :--- | :--- |
| Interviews and observation of the landlady; her workbook | The team | Chapter 4 §4.1; `docs/09_`, `docs/10_` |
| Questions put to the owner, and her answers | The team asked; the owner decided | `CLIENT_MEETING_QUESTIONS.md`, `CLIENT_ANSWERS_2026-09-17.md` |
| What to build, and what not to (for example, no automatic rent increase) | The team and the owner | `docs/12_ITERATION_HISTORY.md` §2.2 |
| Program code, interface, migrations, check suites, diagrams | Generated by the assistant at the team's direction, reviewed by the team | Commit trailers (Section 2) |
| Applying changes to the live database | Each is a numbered migration in `database/migrations/`, taken after a backup. On Sean's machine the assistant applied **16** itself, in sessions Sean was directing (13 to 14 September and 30 September); the tool's own safety check refused **4** attempts: three that deleted records (17 and 26 September) and one on 13 September that went through on a retry. The rest were run by Sean. A change that deletes records is now prepared by the assistant and applied by Sean (`BLOCKED_FOR_SEAN.md`) | Session logs (`apply_migration` calls and their results) |
| Testing day, walkthrough, device timings | The team, with the owner and three tenants | `docs/TESTING_DAY/results/` |
| Technical evaluators' review and the survey | The team distributed it; people answered | Chapter 4 Tables 12 to 22; the CSV export |
| Survey arithmetic | `scripts/survey/compute-survey.mjs` (written by the assistant), on the team's data | Chapter 4 §4.4 |
| First drafts of Chapters 4 and 5, the abstract, the fixes to Chapters 1 to 3 | The assistant, from the data above | Commit trailers on `docs/FINAL MANUSCRIPT/` |
| Final wording in the manuscript, and the defense | The team | |

## 5. How the output was checked

The point CMO No. 21 and every school policy rest on is human review. This project's record of it:

1. **Twenty automated check suites** (`npm run check:all`), against the code and the live
   database. Chapter 4, Table 8.
2. **Every new check broken on purpose** to prove it fails (`CLAUDE.md`, "Mutation-test a new
   check").
3. **Iteration 2 was a verification pass**: 22 recorded errors corrected, including performance
   figures that had never been measured and a claimed database transaction that did not exist.
   `docs/12_ITERATION_HISTORY.md` §3.2.
4. **The screen-versus-database audit** compared what each screen showed with what the database
   held: six defects no check had caught. Chapter 4, Table 9.
5. **People used it**: the testing day (30 September), the technical evaluators (3 October), the
   survey.
6. **The live database was guarded**: no reset, every change a numbered migration with a backup
   first. The assistant applied some migrations itself while Sean directed the session (Section 4),
   and its tool refused the ones that deleted records, which Sean now applies himself.

## 6. What the panel will actually test

A disclosure covers the paperwork; the defense tests understanding. Under CMO No. 21 and most
school policies, the line is between AI as an assistant and AI doing work nobody on the team
understands. **Each member should be able to explain, without notes, the part of the system they
are named against**: the architecture (Figure 5), the database (Figure 9, `docs/PROJECT_DOCUMENTS/05`),
how a payment is recorded and verified, how sign-in and roles work, and why the results in
Chapter 4 can be trusted. `docs/DEFENSE_STUDY_GUIDE.md` is the starting point.

## 7. Data that passed through the assistant

CMO No. 21 also asks that sensitive material not go into unsecured AI platforms. **Tell the adviser
this plainly, before a panelist raises it:** during development the assistant read the owner's real
financial records and tenants' personal details, through database queries and backups, because the
system has no separate copy of the data (`CLAUDE.md`). What limited it: the tool runs under the
team's own account rather than a free public chatbot; credentials were kept in gitignored files
and never written into documents; screenshots in the manuscript use sample records; and survey
names were removed before analysis. **TEAM TO CONFIRM:** the data-use setting on the Claude account
used (whether conversations may be used for training), and say which it is.

## 8. To do

| # | What | Who |
| :--- | :--- | :--- |
| 1 | Ask the adviser where the statement goes and whether the prompt log is wanted | Anyone |
| 2 | Name the tool used in Iteration 1 (Section 2) | Whoever built it |
| 3 | Run `node scripts/ai-use/export-prompt-log.mjs` on Lloyd's machine, and any other that used Claude Code | Lloyd |
| 4 | Read each prompt log through before it goes anywhere | Sean, Lloyd |
| 5 | Check the account's data-use setting (Section 7) | Sean |
| 6 | Correct Section 4 where it is wrong, then paste Section 1 into the manuscript | The team |
