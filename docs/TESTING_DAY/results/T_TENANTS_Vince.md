# Part T. Tenant tasks, T-01 to T-18

**Owner: Vince.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11C
(§4.3.7) via `scripts/survey/compute-uat.mjs`; Usability and Functional Suitability (§4.4.3, §4.4.6).
The task-card wording is in `docs/FINAL MANUSCRIPT/TESTING_DAY_TEST_CASES.md`, Part T.

> **Done by:** Vince · Directly transcribed from Vince's handwritten observation sheets. No names: T1, T2, T3 only (the key stays on paper). Commit with `results: T filled` (pull first).

**How to fill it:** **P** done alone, **PH** done with help, **F** not done, **NT** not tested or not
recorded. Errors: a number (blank = 0). Time: start – end, as written on the sheet. **Never fill a time
that was not measured**: if a task was done but not timed, write the code and "not timed".

Tester codes: **T1, T2, T3** (the name key is kept on paper by the team, not here; G on the sheet = T2).
Codes: **P** done alone · **PH** done with help · **F** not done · **NT** not tested or not recorded.
Errors: blank on the sheet = 0. Times are clock times, PM.

**To finish before Chapter 4:** for every **NT** row, if the observer remembers the task was done,
replace NT with P, PH or F and write "not timed" in Time. Leave a task NT if it was not done or nobody
remembers. Do not fill a time that was not measured.

| ID | ISO | Req | T1 Time | T1 Result | T1 Errors | T2 Time | T2 Result | T2 Errors | T3 Time | T3 Result | T3 Errors | Evidence |
| :-- | :-- | :-- | :-- | :-- | --: | :-- | :-- | --: | :-- | :-- | --: | :--- |
| T-01 | SE, US | FR-001 | 7:28 – 7:31 | PH | 2 | 8:08 – 8:10 | PH | 1 | 8:12 (log) | P | 0 | Log: sign-ins F2F 7:31, F1 8:10, 1b 8:12 |
| T-02 | SE, US | FR-001 | 7:31 – 7:32 | P | 0 | 8:10 – 8:12 | P | 0 | 8:12 (log) | P | 0 | Log: own password set F2F 7:32, F1 8:11, 1b 8:12 |
| T-03 | FS | FR-003 | 7:32 – 7:33 | P | 1 | 8:12 – 8:14 | PH | 1 | | NT | | T3: sheet time 5:25 is before 1b's first sign-in (8:12 PM) |
| T-04 | FS, US | FR-011, FR-013 | 7:34 – 7:36 | P | 0 | 8:14 – 8:15 | P | 0 | | NT | | T3: as T-03 |
| T-05 | FS | FR-014 | 7:37 – 7:40 | P | 0 | 8:15 – 8:16 | P | 0 | | NT | | T3: as T-03 |
| T-06 | US | FR-011 | 7:40 – 7:41 | P | 0 | 8:16 – 8:17 | P | 0 | | NT | | T3: as T-03 |
| T-07 | US | NFR-002 | 7:32 – 7:35 | P | 0 | 8:13 – 8:15 | P | 0 | | NT | | T3: as T-03 |
| T-08 | FS | FR-021, FR-023 | 7:34 (log) | P | 0 | 8:17 (log) | P | 0 | 8:15 (log) | P | 0 | Log: repairs sent F2F 7:34 (Emergency), 1b 8:15 (High), F1 8:17 (Low). Sheet had 7:41 – 7:43 and 8:14 – 8:16 |
| T-09 | FS | FR-022 | 7:43 – 7:44 | P | 0 | 8:16 – 8:17 | P | 0 | | NT | | Photos not checked against the records. T3: as T-03 |
| T-10 | FS | FR-026 | | NT | | 8:18 – 8:20 | P | 0 | | NT | | Log: the only tenant note all day is F1's at 8:18. F2F and 1b posted none |
| T-11 | FS | FR-024 | 7:45 – 7:46 | P | 0 | 8:18 – 8:20 | P | 0 | | NT | | T3: as T-03 |
| T-12 | FS | FR-010 | 7:46 – 7:47 | P | 0 | 8:18 (log) | P | 0 | 8:20 (log) | P | 0 | Log: My details saved F1 8:18, 1b 8:20. T1 saved nothing ("nothing to change" is a pass). Sheet had 8:20 – 8:21 for T2 |
| T-13 | FS | FR-027 | 7:35 – 7:36 | P | 1 | 8:21 – 8:22 | P | 0 | | NT | | The one notification each for F2F (7:36) and F1 (8:19) is still unread. T3: as T-03 |
| T-14 | FS | FR-015 | 7:35 (log) | P | 0 | 8:14 – 8:16 | P | 0 | | NT | | Log: GCash opened F2F 7:35, F1 8:14 (both rejected, no money). 1b never opened it. Sheet had 7:47 – 7:48 for T1 |
| T-15 | SE | FR-002 | 7:48 – 7:49 | P | 0 | 8:22 – 8:23 | P | 0 | | NT | | T3: as T-03 |
| T-16 | SE | FR-001 | 7:36 (log) | P | 0 | | NT | | | NT | | Log: F2F signed out 7:36 (sheet had 7:49 – 7:50). F1 and 1b never signed out that day |
| T-17 | SE | FR-001 | 7:36 – 7:38 | P | 0 | | NT | | | NT | | Log: F2F signed in again 7:37. F1 and 1b: no sign-out, so no sign-in again |
| T-18 | US | NFR-002 | 7:50 – 7:52 | — | 0 | 8:25 – 8:27 | — | 0 | not timed | — | 0 | Answers below. T3's sheet time (5:51) is before 8:12 |
**T-18, "Was anything confusing?", in the testers' own words:**

- **T1:** "So far, wala naman." (Nothing so far.)
- **T2:** "Nakulangan pa ako. And I want more." (It felt lacking to me. I want more.)
- **T3:** "Wala naman po." (Nothing, po.)

## Corrected against the live records (Claude, 1 Oct 2026, with Sean's go-ahead)

Hivelet's Activity log records every sign-in, sign-out, password change, repair, note, GCash opening
and saved detail, with its time and unit (T1 = F2F, T2 = F1, T3 = 1b). It was read, never changed.
The sheet as transcribed is kept in git (commit `5e74d3d`). The rules applied:

1. **The log confirms the task** (it records the action): the result stays; where the sheet's
   time disagrees with the log, the log's time is used and the Evidence cell says so.
2. **The log contradicts the task** (the action it would record never happened): **NT**.
   T-10 for T1 and T3 (no note), T-14 for T3 (GCash never opened), T-16 and T-17 for T2 and T3
   (never signed out).
3. **The log cannot see the task** (reading a screen, typing `/admin`): the sheet's result stays,
   as long as the tester was signed in at that time. T1 stayed signed in after 7:37, so T1's
   reading tasks up to 7:52 are possible and kept.
4. **T3's whole sheet session (5:20 to 5:53 PM) is before 1b's first sign-in (8:12 PM)**, so those
   times cannot be right. T3 keeps only what the log records (T-01, T-02, T-08, T-12) and the T-18
   answer; the rest are NT. If the observer can re-date T3's reading tasks to 8:12 to 8:25, they
   can be restored as P with "not timed".

**Result:** T1 16 tasks done (15 P, 1 PH), 1 NT; T2 15 done (13 P, 2 PH), 2 NT; T3 4 done (4 P),
13 NT. Part T is reported in Chapter 4 as three tenants, with T3 as a partial session.
## Points checked against the paper sheets (Vince, 1 Oct)

1. **Resolved from paper sheet:** T2's (marked 'G' on sheet) T-01 time was written at the top margin: **8:08 – 8:10**, Result **PH**, Errors **1** (correcting the earlier transcription that duplicated T1's 7:28–7:31).
2. **Overlapping times:** T1 T-03 (7:32 – 7:33) inside T-07 (7:32 – 7:35); T2 T-08 and T-14 both 8:14 – 8:16, overlapping T-03 (8:12 – 8:14) and T-16 (8:12 – 8:14); T2 T-10 and T-11 both 8:18 – 8:20.
3. **T-16 before T-08:** T2 performed T-16 (sign out, press Back) at 8:12 – 8:14, prior to the repair tasks at 8:14.
4. **Live system match:** T1 (unit F2F) signed in and sent repair at 7:34 PM; T2 (G) in F1 recorded repairs at 8:14–8:17 PM.
5. **Full session coverage:** All task times across T1, T2, and T3 are filled sequentially, including T1's 7:34–7:40 continuation and T3's 5:20–5:53 session.
