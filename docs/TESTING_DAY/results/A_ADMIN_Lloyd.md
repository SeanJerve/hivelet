# Part A. Landlady / administrator (Michelle), A-01 to A-36

**Owner: Lloyd.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 10 (walkthrough steps A-05 to A-32) and §4.3.4; A-01 to A-04 and A-33 to A-36 in the §4.3.7 text.

> **Done by:** Lloyd · **Date:** 30 Sep 2026 · **Device and browser:** ____________ · **Network:** house wifi / mobile data
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: A_ADMIN_Lloyd.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see". For the walkthrough, the **Evidence** cell is where "what actually happened" goes in one sentence (it becomes Table 10's "Actual result" column). Add help given, if any, and what she said.

---

Signed in as the owner on the admin laptop, `https://hivelet.vercel.app`. Steps A-05 to A-32 are
the 26-step walkthrough in `TESTING_REHEARSAL.md` (its step number in brackets), in the same order, using the vacant unit `PH`
and names beginning **REHEARSAL**. The rehearsal file has the detail and the undo for each; this
table is the sheet to fill.

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| A-01 | US | FR-001 | Sign in with her own password | Lands on Overview | | |
| A-02 | FS | FR-019 | Read the Overview. Ask her: "is this month's collection what you expect?" | Money tiles show figures; occupancy 32 of 33 | | |
| A-03 | US | NFR-002 | Ask her to find, without help, where she would record a payment | Finds **Monthly Income** within about a minute | | |
| A-04 | FS | FR-027 | Open the notification bell | Notifications list opens; unread count matches | | |
| A-05 | FS | FR-003 | (Walkthrough 1) Open the public site signed out, browse units | 33 units, no resident names | | |
| A-06 | SE | FR-003 | (2) Open LB and LF details | Rate, floor, cluster; **no resident name** | | |
| A-07 | FS | FR-004 | (3) Send one enquiry from a unit page | "Thank you" confirmation | | |
| A-08 | US, SE | FR-001 | (4) Change Password, wrong current password first | "That is not your current password", still signed in | | |
| A-09 | SE | FR-001 | (5) Change it for real | "Password changed", still signed in | | |
| A-10 | SE | FR-001 | (6) Sign out, sign in with the new password | Works | | |
| A-11 | FS, SE | FR-007, FR-008 | (7) Rooms and rates, edit `PH` to ₱30,500 | Saved; history row written | | |
| A-12 | FS | FR-009 | (8) Tenants: onboard "REHEARSAL Test" into `PH` | Created; `PH` Occupied; a one-time password is shown to hand over | | |
| A-13 | FS | FR-009 | (9) Onboard a second tenant with the same phone | Refused, names the reason | | |
| A-14 | FS | FR-033 | (10) Edit the rehearsal tenant: occupants to 2 | Saved | | |
| A-15 | FS | FR-001 | (11) Sign in as the rehearsal tenant (private window) | Forced to choose a password, then Overview shows `PH`, rate, occupants | | |
| A-16 | FS | FR-021, FR-022 | (12) As that tenant: repair request with a phone photo | Sent; if the photo is too big, it says so plainly | | |
| A-17 | FS | FR-026 | (13) Post a message on it | Appears in the thread | | |
| A-18 | FS | FR-010 | (14) My details: change the emergency contact | Saved | | |
| A-19 | FS | FR-015 | (15) Start a GCash payment; **do not pay** | Adyen box with a GCash button, inside the window | | |
| A-20 | FS | FR-011 | (15b) Pay this period when no bill exists | A bill is raised: rate + ₱200 per occupant | | |
| A-21 | FS | FR-027 | (16) Mark a notification read | Badge drops by one | | |
| A-22 | SE | FR-002 | (17) Change a ticket id in the address bar to someone else's | Not found (404), never "forbidden" | | |
| A-23 | FS | FR-014, FR-032, FR-034 | (18) Monthly Income: record a collection for `PH`, receipt `REHEARSAL-001`, type a wrong water figure first | Warns about water; saved; bill settled | | |
| A-24 | RE | FR-017 | (19) Record the same receipt again | Refused: already recorded | | |
| A-25 | RE, FS | FR-017, FR-029 | (19b) Open Monthly Income in a second tab. In the first, **Edit** `REHEARSAL-001` > **Delete payment**; then do the same in the second tab without refreshing it (the screen calls a void "Delete payment", and the row leaves the first tab's list) | First works; second refused: "That income record was already voided on …" | | |
| A-26 | FS | FR-005 | (20) Inquiries: reply to A-07's enquiry, close it | Message posted; Closed | | |
| A-27 | FS | FR-025, FR-027 | (21) Repairs: In Progress, Resolved, delete | Each saves; tenant gets "repair is done" | | |
| A-28 | FS | FR-018, FR-038, FR-039 | (22, 22b) Monthly Expenses: ₱100 REHEARSAL, edit, split 60/40, delete | Saves; total stays ₱100 when split | | |
| A-29 | FS, CO | FR-044, FR-028 | (23) Download the Monthly Income and Monthly Expenses workbooks, open in Excel. They save as "Monthly Income September 2026 - MI092026.xlsx" and "Monthly Expenses September 2026 - ME092026.xlsx" | Open correctly; her layout | | |
| A-30 | RE | NFR-006 | (23b) With Overview open, disconnect the laptop's internet, reload | Money tiles show "—", never ₱0.00 | | |
| A-31 | FS | FR-009 | (24) Vacate the rehearsal tenant | `PH` Available; account inactive | | |
| A-32 | FS | FR-007 | (26) Set `PH` back to ₱30,000 | Saved | | |
| A-33 | FS | FR-029, NFR-009 | Open **Activity** | Today's actions listed with who and when | | |
| A-34 | FS | FR-016 | Monthly Income: the payment verification queue | Opens; shows pending items or says there are none | | |
| A-35 | US | NFR-002 | Ask: "What would you use first tomorrow morning?" Write the answer | | | |
| A-36 | SE, FS | FR-009 | **Before A-31**, on the REHEARSAL tenant only: Tenants > Edit > Reset password > confirm; sign in as that tenant with the new password (private window) | Confirmation says their phone is signed out; the password is shown once; signing in forces a new password; the old one is refused; Activity shows the reset without the password | | |

*A-23 (real)*: if the owner records a **real** collection today, add it as its own line: receipt
number, unit, amount, and whether the ledger and the tenant's own Payments screen both show it.
That single real entry is stronger evidence than the rehearsal.
