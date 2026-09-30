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
| T-01 | SE, US | FR-001 | 7:28 – 7:31 | PH | 2 | 8:08 – 8:10 | PH | 1 | 5:20 – 5:23 | P | 0 | |
| T-02 | SE, US | FR-001 | 7:31 – 7:32 | P | 0 | 8:10 – 8:12 | P | 0 | 5:23 – 5:25 | P | 0 | |
| T-03 | FS | FR-003 | 7:32 – 7:33 | P | 1 | 8:12 – 8:14 | PH | 1 | 5:25 – 5:27 | P | 0 | |
| T-04 | FS, US | FR-011, FR-013 | 7:34 – 7:36 | P | 0 | 8:14 – 8:15 | P | 0 | 5:27 – 5:29 | P | 0 | |
| T-05 | FS | FR-014 | 7:37 – 7:40 | P | 0 | 8:15 – 8:16 | P | 0 | 5:29 – 5:32 | P | 0 | |
| T-06 | US | FR-011 | 7:40 – 7:41 | P | 0 | 8:16 – 8:17 | P | 0 | 5:32 – 5:34 | P | 0 | |
| T-07 | US | NFR-002 | 7:32 – 7:35 | P | 0 | 8:13 – 8:15 | P | 0 | 5:34 – 5:36 | P | 0 | |
| T-08 | FS | FR-021, FR-023 | 7:41 – 7:43 | P | 0 | 8:14 – 8:16 | P | 0 | 5:36 – 5:38 | P | 0 | |
| T-09 | FS | FR-022 | 7:43 – 7:44 | P | 0 | 8:16 – 8:17 | P | 0 | 5:38 – 5:39 | P | 0 | |
| T-10 | FS | FR-026 | 7:44 – 7:45 | P | 0 | 8:18 – 8:20 | P | 0 | 5:39 – 5:40 | P | 0 | |
| T-11 | FS | FR-024 | 7:45 – 7:46 | P | 0 | 8:18 – 8:20 | P | 0 | 5:40 – 5:41 | P | 0 | |
| T-12 | FS | FR-010 | 7:46 – 7:47 | P | 0 | 8:20 – 8:21 | P | 0 | 5:41 – 5:44 | P | 0 | |
| T-13 | FS | FR-027 | 7:35 – 7:36 | P | 1 | 8:21 – 8:22 | P | 0 | 5:44 – 5:45 | P | 0 | |
| T-14 | FS | FR-015 | 7:47 – 7:48 | P | 0 | 8:14 – 8:16 | P | 0 | 5:45 – 5:46 | P | 0 | |
| T-15 | SE | FR-002 | 7:48 – 7:49 | P | 0 | 8:22 – 8:23 | P | 0 | 5:45 – 5:47 | P | 0 | |
| T-16 | SE | FR-001 | 7:49 – 7:50 | P | 0 | 8:12 – 8:14 | P | 0 | 5:48 – 5:50 | P | 0 | |
| T-17 | SE | FR-001 | 7:36 – 7:38 | P | 0 | 8:23 – 8:25 | P | 0 | 5:50 – 5:51 | P | 0 | |
| T-18 | US | NFR-002 | 7:50 – 7:52 | — | 0 | 8:25 – 8:27 | — | 0 | 5:51 – 5:53 | — | 0 | |

**T-18, "Was anything confusing?", in the testers' own words:**

- **T1:** "So far, wala naman." (Nothing so far.)
- **T2:** "Nakulangan pa ako. And I want more." (It felt lacking to me. I want more.)
- **T3:** "Wala naman po." (Nothing, po.)

## Points checked against the paper sheets

1. **Resolved from paper sheet:** T2's (marked 'G' on sheet) T-01 time was written at the top margin: **8:08 – 8:10**, Result **PH**, Errors **1** (correcting the earlier transcription that duplicated T1's 7:28–7:31).
2. **Overlapping times:** T1 T-03 (7:32 – 7:33) inside T-07 (7:32 – 7:35); T2 T-08 and T-14 both 8:14 – 8:16, overlapping T-03 (8:12 – 8:14) and T-16 (8:12 – 8:14); T2 T-10 and T-11 both 8:18 – 8:20.
3. **T-16 before T-08:** T2 performed T-16 (sign out, press Back) at 8:12 – 8:14, prior to the repair tasks at 8:14.
4. **Live system match:** T1 (unit F2F) signed in and sent repair at 7:34 PM; T2 (G) in F1 recorded repairs at 8:14–8:17 PM.
5. **Full session coverage:** All task times across T1, T2, and T3 are filled sequentially, including T1's 7:34–7:40 continuation and T3's 5:20–5:53 session.
