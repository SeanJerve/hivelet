# Part S. Security, S-01 to S-12

**Owner: Sean.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** §4.4.8 (supporting evidence) and Security (Table 19 discussion).

> **Done by:** Sean · **Date:** 30 Sep 2026 · **Device and browser:** ____________ · **Network:** house wifi / mobile data
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: S_SECURITY_Sean.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see". For S-01 to S-03 write the **grade and the date/time** of the scan, and keep a screenshot. Passive scanners only. S-04 only on the rehearsal tenant, never a real account.

---

**Passive only.** Record grade, date and a screenshot of each. Never an active scan (guide §6).

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| S-01 | SE | NFR-003 | Mozilla HTTP Observatory, `hivelet.vercel.app` | Grade (write it). The 30 Sep 00:04 run gave **B, 75/100, 11 of 12**, its one failure the Content Security Policy being report-only; the policy was switched to enforcing later that morning, and a scan at about 10:07 gave **A+, 115/100, 12 of 12**. Write the grade you get and the time | | |
| S-02 | SE | NFR-003 | securityheaders.com | Grade. Expect **A+** (30 Sep 10:05) | | |
| S-03 | SE | NFR-003 | SSL Labs, `hivelet.vercel.app` | Grade. Expect **A+** (run 30 Sep 00:10; one of two addresses A) | | |
| S-04 | SE | FR-001 | Rehearsal tenant only: 5 wrong passwords | Locked for 15 minutes with a clear message. **Never on a real account** | | |
| S-05 | SE | FR-002 | Tenant opens `/admin` (T-15) | Refused | | |
| S-06 | SE | FR-002 | Signed out, open `/tenant` | Sent to sign-in | | |
| S-07 | SE | FR-001 | Tenant signs out; Back button (T-16) | No data | | |
| S-08 | SE | FR-001 | Slip password after the tenant changed it (T-17) | Refused | | |
| S-09 | SE | FR-029 | Activity shows today's password changes and admin actions, without any password in it | As described | | |
| S-10 | SE | FR-003 | Public pages and unit details: no tenant names (P-03) | As described | | |
| S-11 | SE | FR-002 | Foreign ticket id (A-22) | Not found | | |
| S-12 | SE | NFR-003 | Ask the owner: "Who else knows your password?" | Only she does (after A-09) | | |
