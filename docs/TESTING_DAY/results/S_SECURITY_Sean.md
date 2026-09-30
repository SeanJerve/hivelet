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
| S-01 | SE | NFR-003 | Mozilla HTTP Observatory, `hivelet.vercel.app` | Grade (write it). The 30 Sep 00:04 run gave **B, 75/100, 11 of 12**, its one failure the Content Security Policy being report-only; the policy was switched to enforcing later that morning, and a scan at about 10:07 gave **A+, 115/100, 12 of 12**. Write the grade you get and the time | Pass | **A+, 115/100, 12 of 12 tests passed.** The report shows the scan time only as "2 minutes ago" (evening of 30 Sep; Sean to confirm the clock time). Informational recommendations, not failures: CSP `style-src` allows `unsafe-inline`; SRI, COEP, COOP and CORP not set. Screenshots: [summary](evidence/S-01_observatory_Aplus_115_12of12_summary.png), [scoring detail](evidence/S-01_observatory_scoring_detail.png). |
| S-02 | SE | NFR-003 | securityheaders.com | Grade. Expect **A+** (30 Sep 10:05) | Pass | **A+.** Report time 30 Sep 2026 14:18:03 UTC (22:18 Manila). All six headers present: Content-Security-Policy, Permissions-Policy, Referrer-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options. Screenshot: [S-02](evidence/S-02_securityheaders_Aplus_2026-09-30_1418UTC.png). |
| S-03 | SE | NFR-003 | SSL Labs, `hivelet.vercel.app` | Grade. Expect **A+** (run 30 Sep 00:10; one of two addresses A) | Pass | **A+ (216.198.79.131) and A (64.29.17.131).** Assessed 29 Sep 2026 16:06:13 UTC (00:06 Manila, 30 Sep); tests at 16:04:38 and 16:05:26 UTC. Screenshot: [S-03](evidence/S-03_ssllabs_Aplus_and_A_2026-09-29_1606UTC.png). |
| S-04 | SE | FR-001 | Rehearsal tenant only: 5 wrong passwords | Locked for 15 minutes with a clear message. **Never on a real account** | Pass | Rehearsal tenant only: after 5 wrong passwords the account locked for 15 minutes with a clear message. |
| S-05 | SE | FR-002 | Tenant opens `/admin` (T-15) | Refused | Pass | Seen in the tenant session (T-15): typing /admin was refused. (T_TENANTS_Vince.md, T-15: done by T1 and T2.) |
| S-06 | SE | FR-002 | Signed out, open `/tenant` | Sent to sign-in | Pass | Signed out, opening /tenant sent the browser to the sign-in page. |
| S-07 | SE | FR-001 | Tenant signs out; Back button (T-16) | No data | Pass | Seen in the tenant session (T-16): after signing out, Back showed no personal data. |
| S-08 | SE | FR-001 | Slip password after the tenant changed it (T-17) | Refused | Pass | Seen in the tenant session (T-17): the slip password was refused after the tenant chose their own; the password change itself worked. |
| S-09 | SE | FR-029 | Activity shows today's password changes and admin actions, without any password in it | As described | Pass | Activity listed today's password changes and admin actions, with no password shown anywhere. |
| S-10 | SE | FR-003 | Public pages and unit details: no tenant names (P-03) | As described | Pass | No tenant names on the public pages or unit details. |
| S-11 | SE | FR-002 | Foreign ticket id (A-22) | Not found | Pass | Another tenant's repair id in the address bar gave "not found". |
| S-12 | SE | NFR-003 | Ask the owner: "Who else knows your password?" | Only she does (after A-09) | Pass | Michelle is the only one who knows her password (she changed it in the walkthrough, A-08/A-09). |
