# Part P. Public site checks, P-01 to P-08

**Owner: Kiel.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 10 steps 1 to 3 and the Functional Suitability / Usability discussion (§4.4.3, §4.4.6).

> **Done by:** Kiel · **Date:** 30 Sep 2026 · **Device and browser:** ____________ · **Network:** house wifi / mobile data
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: P_PUBLIC_Kiel.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see". A team member does these on a phone; no tester is needed. Keep to two inquiries per wifi in 15 minutes.

---

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :-- |
| P-01 | FS | FR-003 | Open `hivelet.vercel.app` on a phone | Landing page, building photo, "Inquire now" | Pass | Complete; landing page, building photo, and "Inquire now" loaded properly. |
| P-02 | FS | FR-003 | Browse the categories and units | 33 units in five clusters; only `PH` available | Pass | Complete; 33 units across five clusters displayed, only PH available. |
| P-03 | SE | FR-003 | Open any occupied unit | No tenant name, phone or email anywhere | Pass | No personal details (names, phone numbers, emails) exposed on occupied units. |
| P-04 | US | FR-004 | Enquiry form: press Send with everything empty | Each missing field says what it needs | Pass | Missing field validation triggered; clear requirement messages displayed. |
| P-05 | US | FR-004 | Type a bad email and a short phone number | Plain messages under the fields; nothing sent | Pass | Nothing sent; plain validation messages displayed under fields. |
| P-06 | FS | FR-004 | Send one real-looking enquiry (a team member's own details) | Confirmation with **Open your conversation**, **Copy the link** and a reference code; the owner sees it in Inquiries (A-26) | Pass | Confirmation displayed with conversation link and reference code; owner sees it in Inquiries. |
| P-06b | FS | FR-004 | After the owner replies to P-06: open the link on the same phone, then on another phone open `/inquiry` and type the reference code and the phone number used | Her reply shows in both; write back once and it appears in her conversation, with a notification. A wrong code or wrong phone says only "No inquiry matches that" | Pass | Owner's reply visible via direct link and reference lookup; two-way conversation verified. |
| P-07 | US | none | Open `/privacy` and `/terms` | Both readable on a phone | Pass | Both readable and well-formatted on mobile screen. |
| P-08 | RE | none | Open a made-up address, `/this-does-not-exist` | A friendly "not found" page with a way back | Pass | Page not found (404) friendly screen displayed with a return path. |

**Do not send more than two enquiries from the same wifi in 15 minutes.** The limit is ten per
connection, shared by everyone on the house wifi, and a hit blocks the real visitors too.
