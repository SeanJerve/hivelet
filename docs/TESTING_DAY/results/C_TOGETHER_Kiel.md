# Part C. Everyone at once, C-01 to C-08

**Owner: Kiel.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11D and its paragraph (§4.3.7).

> **Done by:** Kiel · **Date:** 30 Sep 2026 · **Device and browser:** tenants' own phones; landlady's laptop · **Network:** not recorded
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: C_TOGETHER_Kiel.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see". Also write, above the table: start time ____, number of tenants ____, landlady present yes/no, network ____. If Part C was not done, mark every row NT and say so here.

---

## Session details (from the Activity log, 1 Oct 2026; Kiel to correct if the sheet says otherwise)

- **Start:** about **8:10 PM** (T2, unit F1, signed in at 8:10; T3, unit 1b, at 8:12).
- **Tenants at the same time: 2** (F1 and 1b, 8:12 to 8:20 PM). T1 (F2F) had finished by 7:37 PM,
  so Part C ran with two tenants, not all three.
- **Landlady present:** yes (she set 1b's repair to In Progress at 8:15 and replied to F1 at 8:19).
- **Devices:** the tenants' own phones; the landlady on the laptop. **Network:** not recorded.

## Corrected against the live records (Claude, 1 Oct 2026, with Sean's go-ahead)

The log was read, never changed. Kiel's entries as pushed are in git (commit `da42465`). Rows the
log cannot see (loading, what is on screen) keep Kiel's result. Rows it contradicts are **NT**:
only **one** tenant note was posted all day (F1, 8:18 PM), so C-03, C-04 and C-06 did not happen as
written. **C-05's expected result was wrong**: by the owner's decision (B-47, 26 Sep) a tenant is
notified when a repair is **done**, not when it moves to In Progress, and the log shows no
notification to F2F or 1b for their In Progress changes (7:34 and 8:15). It is reported as a
test-case error, not a system defect.
Session 3 of the guide. Write down: start time, number of tenants, the owner, and the network
(house wifi / mobile data).

| ID | ISO | Req | Do (at the same moment) | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :-- |
| C-01 | PE, RE | NFR-004 | All tenants refresh Overview together | Every screen loads; note the slowest (seconds) | Pass | Two tenants (F1, 1b). Slowest screen loaded in 1 second. |
| C-02 | SE | FR-002 | Everyone checks the unit and name on screen | Each sees **only their own** unit. Any other name: STOP (guide §9) | Pass | No error; each tenant saw only their own unit and account details. |
| C-03 | FS, RE | FR-026 | Every tenant posts a note on their request within the same minute | Every note saved once, none lost, none doubled | NT | Only one tenant note was posted all day (F1, 8:18 PM); the simultaneous notes did not happen. |
| C-04 | FS | FR-025 | Owner opens Repairs while C-03 happens, then refreshes | All new notes visible, each on the right request | NT | Depends on C-03. The owner did see and reply to F1's note (8:19 PM). |
| C-05 | FS | FR-027 | Owner moves two requests to In Progress | Those two tenants get a notification; the others do not | NT | Case invalid: In Progress does not notify a tenant (B-47, only "done" does). F2F and 1b were set In Progress at 7:34 and 8:15; no notification, as designed. |
| C-06 | RE | NFR-006 | Two tenants double-tap Send on a note | Only one copy saved (the button disables while sending) | NT | Only one tenant note exists (F1); no double-tap by two tenants took place. |
| C-07 | PE | NFR-004 | Owner opens Monthly Income for the whole year while tenants are active | Loads; note the time | Pass | Loaded in 3 seconds while tenants were active. |
| C-08 | CO | NFR-005 | Owner uses the laptop, tenants use phones, at once | No one's session affects another's | Pass | No session affected; concurrent laptop and mobile usage operated seamlessly. |
