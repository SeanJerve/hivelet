# Part T. Tenant tasks, T-01 to T-18

**Owner: Vince.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11C
(§4.3.7) via `scripts/survey/compute-uat.mjs`; Usability and Functional Suitability (§4.4.3, §4.4.6).
The task-card wording is in `docs/FINAL MANUSCRIPT/TESTING_DAY_TEST_CASES.md`, Part T.

> **Done by:** Vince · Pre-filled by Claude on 30 Sep from what the team read out. Edit the table
> directly. No names: T1, T2, T3 only (the key stays on paper). Commit with `results: T filled` (pull first).

**How to fill it:** **P** done alone, **PH** done with help, **F** not done, **NT** not tested or not
recorded. Errors: a number (blank = 0). Time: start – end, as written on the sheet. **Never fill a time
that was not measured**: if a task was done but not timed, write the code and "not timed".

Tester codes: **T1, T2, T3** (the name key is kept on paper by the team, not here).
Codes: **P** done alone · **PH** done with help · **F** not done · **NT** not tested or not recorded.
Errors: blank on the sheet = 0. Times are clock times, PM.

**To finish before Chapter 4:** for every **NT** row, if the observer remembers the task was done,
replace NT with P, PH or F and write "not timed" in Time. Leave a task NT if it was not done or nobody
remembers. Do not fill a time that was not measured.

| ID | ISO | Req | T1 Time | T1 Result | T1 Errors | T2 Time | T2 Result | T2 Errors | T3 Time | T3 Result | T3 Errors |
| :-- | :-- | :-- | :-- | :-- | --: | :-- | :-- | --: | :-- | :-- | --: |
| T-01 | SE, US | FR-001 | 7:28 – 7:31 | PH | 2 | 7:28 – 7:31 | PH | 2 | | NT | |
| T-02 | SE, US | FR-001 | 7:31 – 7:32 | P | 0 | 8:10 – 8:12 | P | 0 | | NT | |
| T-03 | FS | FR-003 | 7:32 – 7:33 | P | 1 | 8:12 – 8:14 | PH | 1 | | NT | |
| T-04 | | | | NT | | | NT | | | NT | |
| T-05 | | | | NT | | | NT | | | NT | |
| T-06 | | | | NT | | | NT | | | NT | |
| T-07 | US | NFR-002 | 7:32 – 7:35 | P | 0 | | NT | | | NT | |
| T-08 | FS | FR-021, FR-023 | | NT | | 8:14 – 8:16 | P | 0 | | NT | |
| T-09 | FS | FR-022 | | NT | | 8:16 – 8:17 | P | 0 | | NT | |
| T-10 | FS | FR-026 | | NT | | 8:18 – 8:20 | P | 0 | | NT | |
| T-11 | FS | FR-024 | | NT | | 8:18 – 8:20 | P | 0 | | NT | |
| T-12 | | | | NT | | | NT | | | NT | |
| T-13 | FS | FR-027 | 7:35 – 7:36 | P | 1 | | NT | | | NT | |
| T-14 | FS | FR-015 | | NT | | 8:14 – 8:16 | P | 0 | | NT | |
| T-15 | | | | NT | | | NT | | | NT | |
| T-16 | SE | FR-001 | | NT | | 8:12 – 8:14 | P | 0 | | NT | |
| T-17 | SE | FR-001 | 7:36 – 7:38 | P | 0 | | NT | | | NT | |
| T-18 | US | NFR-002 | (question) | — | | (question) | — | | (question) | — | |

**T-18, "Was anything confusing?", in the testers' own words:**

- **T1:** "So far, wala naman." (Nothing so far.)
- **T2:** "Nakulangan pa ako. And I want more." (It felt lacking to me. I want more.)
- **T3:** "Wala naman po." (Nothing, po.)

## Points to check on the paper sheets

1. **T1 and T2 both show T-01 at 7:28 – 7:31**, but T2's later tasks start at 8:10. Is T2's T-01 time
   correct, or was it copied from T1's row?
2. **Overlapping times:** T1 T-03 (7:32 – 7:33) inside T-07 (7:32 – 7:35); T2 T-08 and T-14 both
   8:14 – 8:16, overlapping T-03 (8:12 – 8:14) and T-16 (8:12 – 8:14); T2 T-10 and T-11 both 8:18 –
   8:20. Tasks done together are fine; just confirm they were not copied down wrongly.
3. **T-16 before T-08?** T2's T-16 (sign out, press Back) is 8:12 – 8:14, before the repair tasks at
   8:14. If T2 signed out and back in between, say so.
4. **The live system saw** T1 (unit F2F) sign in and send a repair at 7:34 PM, T3 (unit 1b) send a
   repair at 8:15 PM, and unit F1 send one at 8:17 PM. If T2 is the tenant in F1, their T-08 repair was
   saved at 8:17. Confirm which unit T2 is in.
5. **T3 has only T-18.** If T3 did more of the tasks, fill their rows from the observer's memory (code
   only, "not timed").
