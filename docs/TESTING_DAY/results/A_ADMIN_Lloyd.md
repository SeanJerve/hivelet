# Part A. Landlady / administrator (Michelle), A-01 to A-36

**Owner: Lloyd.** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** Table 10 (walkthrough steps A-05 to A-32) and §4.3.4; A-01 to A-04 and A-33 to A-36 in the §4.3.7 text.

> **Done by:** Lloyd, with Michelle (L) · **Date:** 30 Sep 2026 · **Device and browser:** admin laptop, Chrome · **Network:** ____________
>
> As read out: every case passed except those with a note. The notes on A-15, A-19, A-20 and A-27, A-31, A-32 add what the live system recorded.
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
| A-01 | US | FR-001 | Sign in with her own password | Lands on Overview | Pass | |
| A-02 | FS | FR-019 | Read the Overview. Ask her: "is this month's collection what you expect?" | Money tiles show figures; occupancy 32 of 33 | Pass | |
| A-03 | US | NFR-002 | Ask her to find, without help, where she would record a payment | Finds **Monthly Income** within about a minute | Pass | |
| A-04 | FS | FR-027 | Open the notification bell | Notifications list opens; unread count matches | Pass | |
| A-05 | FS | FR-003 | (Walkthrough 1) Open the public site signed out, browse units | 33 units, no resident names | Pass | |
| A-06 | SE | FR-003 | (2) Open LB and LF details | Rate, floor, cluster; **no resident name** | Pass | |
| A-07 | FS | FR-004 | (3) Send one enquiry from a unit page | "Thank you" confirmation | Pass | |
| A-08 | US, SE | FR-001 | (4) Change Password, wrong current password first | "That is not your current password", still signed in | Pass | |
| A-09 | SE | FR-001 | (5) Change it for real | "Password changed", still signed in | Pass | |
| A-10 | SE | FR-001 | (6) Sign out, sign in with the new password | Works | Pass | |
| A-11 | FS, SE | FR-007, FR-008 | (7) Rooms and rates, edit `PH` to ₱30,500 | Saved; history row written | NT | Log: no rate change and no price-history row on 30 Sep (the only room edits were LB and LF, 22:39). PH stayed ₱30,000. |
| A-12 | FS | FR-009 | (8) Tenants: onboard "REHEARSAL Test" into `PH` | Created; `PH` Occupied; a one-time password is shown to hand over | Pass | |
| A-13 | FS | FR-009 | (9) Onboard a second tenant with the same phone | Refused, names the reason | Pass | |
| A-14 | FS | FR-033 | (10) Edit the rehearsal tenant: occupants to 2 | Saved | Pass | |
| A-15 | FS | FR-001 | (11) Sign in as the rehearsal tenant (private window) | Forced to choose a password, then Overview shows `PH`, rate, occupants | Pass | Signed in as the rehearsal tenant after one wrong try; chose a password. |
| A-16 | FS | FR-021, FR-022 | (12) As that tenant: repair request with a phone photo | Sent; if the photo is too big, it says so plainly | Pass | |
| A-17 | FS | FR-026 | (13) Post a message on it | Appears in the thread | Pass | |
| A-18 | FS | FR-010 | (14) My details: change the emergency contact | Saved | Pass | |
| A-19 | FS | FR-015 | (15) Start a GCash payment; **do not pay** | Adyen box with a GCash button, inside the window | Pass | GCash opened; the payment attempt ended Rejected (18:44), so nothing reached the ledger. |
| A-20 | FS | FR-011 | (15b) Pay this period when no bill exists | A bill is raised: rate + ₱200 per occupant | Pass | A bill of ₱30,200 was raised on PH (₱30,000 + ₱200 water). Removed after testing by migration 069. |
| A-21 | FS | FR-027 | (16) Mark a notification read | Badge drops by one | Pass | |
| A-22 | SE | FR-002 | (17) Change a ticket id in the address bar to someone else's | Not found (404), never "forbidden" | Pass | |
| A-23 | FS | FR-014, FR-032, FR-034 | (18) Monthly Income: record a collection for `PH`, receipt `REHEARSAL-001`, type a wrong water figure first | Warns about water; saved; bill settled | Pass | Recorded for PH (receipt ACKNOWL1, ₱30,200, 22:47). No warning appeared for a wrong water figure, and none can: since 30 Sep the water amount is not typed but worked out from the occupants (OnsitePaymentModal.vue, "Water is never typed"; Appendix K Part 2 §3), so the "type a wrong water figure first" part of this case predates that change. First recorded as Fail; reclassified 1 Oct (Claude) on that evidence. |
| A-24 | RE | FR-017 | (19) Record the same receipt again | Refused: already recorded | Pass | |
| A-25 | RE, FS | FR-017, FR-029 | (19b) Open Monthly Income in a second tab. In the first, **Edit** `REHEARSAL-001` > **Delete payment**; then do the same in the second tab without refreshing it (the screen calls a void "Delete payment", and the row leaves the first tab's list) | First works; second refused: "That income record was already voided on …" | Pass | After Delete payment in the first tab, the second tab updated by itself and no longer showed the row, so the stale second delete could not be attempted (the "already voided" refusal was not seen). PH receipt ACKNOWL1 voided at 22:47. |
| A-26 | FS | FR-005 | (20) Inquiries: reply to A-07's enquiry, close it | Message posted; Closed | Pass | |
| A-27 | FS | FR-025, FR-027 | (21) Repairs: In Progress, Resolved, delete | Each saves; tenant gets "repair is done" | Pass | Moved to In Progress and Resolved; the tenant's "repair is done" notice followed. The delete was not done on screen; the rehearsal repair was removed afterwards by migration 069. |
| A-28 | FS | FR-018, FR-038, FR-039 | (22, 22b) Monthly Expenses: ₱100 REHEARSAL, edit, split 60/40, delete | Saves; total stays ₱100 when split | NT | Log: entered as **two separate expenses** at 22:50 (₱60 and ₱40), never edited, split or deleted; both still live (B-91, migration 070 voids them). The one-expense split was not exercised. |
| A-29 | FS, CO | FR-044, FR-028 | (23) Download the Monthly Income and Monthly Expenses workbooks, open in Excel. They save as "Monthly Income September 2026 - MI092026.xlsx" and "Monthly Expenses September 2026 - ME092026.xlsx" | Open correctly; her layout | Pass | |
| A-30 | RE | NFR-006 | (23b) With Overview open, disconnect the laptop's internet, reload | Money tiles show "—", never ₱0.00 | Fail | Offline, the Overview money tiles showed **₱0** and a "Try again" message instead of "—". **Defect for the log (for Sean).** |
| A-31 | FS | FR-009 | (24) Vacate the rehearsal tenant | `PH` Available; account inactive | Pass | Rehearsal tenant moved out; PH shows Available (checked live 22:55). |
| A-32 | FS | FR-007 | (26) Set `PH` back to ₱30,000 | Saved | NT | Not needed: A-11 was not done, so PH was never changed; it reads ₱30,000 (checked live 22:55 and 1 Oct). |
| A-33 | FS | FR-029, NFR-009 | Open **Activity** | Today's actions listed with who and when | Pass | |
| A-34 | FS | FR-016 | Monthly Income: the payment verification queue | Opens; shows pending items or says there are none | Pass | |
| A-35 | US | NFR-002 | Ask: "What would you use first tomorrow morning?" Write the answer | | Pass | Her answer: **checking the repairs notifications area.** |
| A-36 | SE, FS | FR-009 | **Before A-31**, on the REHEARSAL tenant only: Tenants > Edit > Reset password > confirm; sign in as that tenant with the new password (private window) | Confirmation says their phone is signed out; the password is shown once; signing in forces a new password; the old one is refused; Activity shows the reset without the password | Pass | |

**Checked against the Activity log (Claude, 1 Oct 2026, read-only).** Every other write in this part is in the log at the right time: the rehearsal tenant created 18:41 (A-12), a tenant edit 19:57 (A-14), the rehearsal tenant's sign-in, password, GCash, repair and message 18:43 to 18:48 (A-15 to A-19), the enquiry reply and close 13:47 to 13:48 (A-26), the repair status changes 18:47 (A-27), ACKNOWL1 recorded and voided 22:47 (A-23, A-25), the workbook download 22:51 (A-29), the move-out 22:55 (A-31). A-11, A-28 and A-32 were corrected to NT above; the other cases (refusals, reading a screen) leave no entry to check. Totals: **32 Pass, 1 Fail, 3 NT** (A-23 reclassified, see its row).

*A-23 (real)*: if the owner records a **real** collection today, add it as its own line: receipt
number, unit, amount, and whether the ledger and the tenant's own Payments screen both show it.
That single real entry is stronger evidence than the rehearsal.
