# Part C. Everyone at once, C-01 to C-08

**Owner: Kiel.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 11D and its paragraph (§4.3.7).

> **Done by:** Kiel · **Date:** 30 Sep 2026 · **Device and browser:** ____________ · **Network:** house wifi / mobile data
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: C_TOGETHER_Kiel.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see". Also write, above the table: start time ____, number of tenants ____, landlady present yes/no, network ____. If Part C was not done, mark every row NT and say so here.

---

Session 3 of the guide. Write down: start time, number of tenants, the owner, and the network
(house wifi / mobile data).

| ID | ISO | Req | Do (at the same moment) | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| C-01 | PE, RE | NFR-004 | All tenants refresh Overview together | Every screen loads; note the slowest (seconds) | | |
| C-02 | SE | FR-002 | Everyone checks the unit and name on screen | Each sees **only their own** unit. Any other name: STOP (guide §9) | | |
| C-03 | FS, RE | FR-026 | Every tenant posts a note on their request within the same minute | Every note saved once, none lost, none doubled | | |
| C-04 | FS | FR-025 | Owner opens Repairs while C-03 happens, then refreshes | All new notes visible, each on the right request | | |
| C-05 | FS | FR-027 | Owner moves two requests to In Progress | Those two tenants get a notification; the others do not | | |
| C-06 | RE | NFR-006 | Two tenants double-tap Send on a note | Only one copy saved (the button disables while sending) | | |
| C-07 | PE | NFR-004 | Owner opens Monthly Income for the whole year while tenants are active | Loads; note the time | | |
| C-08 | CO | NFR-005 | Owner uses the laptop, tenants use phones, at once | No one's session affects another's | | |
