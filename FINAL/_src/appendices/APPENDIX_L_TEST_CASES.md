# APPENDIX L: TEST CASES

The test cases run on 30 September 2026 on the live system, with their results, as summarized in
Chapter 4, Sections 4.3.4 to 4.3.7. Each case names the ISO/IEC 25010 characteristic it tests (FS
Functional Suitability, PE Performance Efficiency, CO Compatibility, US Usability, RE Reliability,
SE Security, MA Maintainability, PO Portability) and the requirement it traces to. Results: Pass;
Fail; Pass after fix; NT, not tested. The prospective tenant's task cards (Part PR) were not
recorded on the day and are not shown.

## Part A. Owner and administrator (A-05 to A-32 are the 26-step walkthrough)

| ID | ISO | Req | Do | Should see | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A-01 | US | FR-001 | Sign in with her own password | Lands on Overview | Pass |
| A-02 | FS | FR-019 | Read the Overview. Ask her: "is this month's collection what you expect?" | Money tiles show figures; occupancy 32 of 33 | Pass |
| A-03 | US | NFR-002 | Ask her to find, without help, where she would record a payment | Finds **Monthly Income** within about a minute | Pass |
| A-04 | FS | FR-027 | Open the notification bell | Notifications list opens; unread count matches | Pass |
| A-05 | FS | FR-003 | (Walkthrough 1) Open the public site signed out, browse units | 33 units, no resident names | Pass |
| A-06 | SE | FR-003 | (2) Open LB and LF details | Rate, floor, cluster; **no resident name** | Pass |
| A-07 | FS | FR-004 | (3) Send one inquiry from a unit page | "Thank you" confirmation | Pass |
| A-08 | US, SE | FR-001 | (4) Change Password, wrong current password first | "That is not your current password", still signed in | Pass |
| A-09 | SE | FR-001 | (5) Change it for real | "Password changed", still signed in | Pass |
| A-10 | SE | FR-001 | (6) Sign out, sign in with the new password | Works | Pass |
| A-11 | FS, SE | FR-007, FR-008 | (7) Rooms and rates, edit `PH` to ₱30,500 | Saved; history row written | NT |
| A-12 | FS | FR-009 | (8) Tenants: onboard "REHEARSAL Test" into `PH` | Created; `PH` Occupied; a one-time password is shown to hand over | Pass |
| A-13 | FS | FR-009 | (9) Onboard a second tenant with the same phone | Refused, names the reason | Pass |
| A-14 | FS | FR-033 | (10) Edit the rehearsal tenant: occupants to 2 | Saved | Pass |
| A-15 | FS | FR-001 | (11) Sign in as the rehearsal tenant (private window) | Forced to choose a password, then Overview shows `PH`, rate, occupants | Pass |
| A-16 | FS | FR-021, FR-022 | (12) As that tenant: repair request with a phone photo | Sent; if the photo is too big, it says so plainly | Pass |
| A-17 | FS | FR-026 | (13) Post a message on it | Appears in the thread | Pass |
| A-18 | FS | FR-010 | (14) My details: change the emergency contact | Saved | Pass |
| A-19 | FS | FR-015 | (15) Start a GCash payment; **do not pay** | Adyen box with a GCash button, inside the window | Pass |
| A-20 | FS | FR-011 | (15b) Pay this period when no bill exists | A bill is raised: rate + ₱200 per occupant | Pass |
| A-21 | FS | FR-027 | (16) Mark a notification read | Badge drops by one | Pass |
| A-22 | SE | FR-002 | (17) Change a ticket id in the address bar to someone else's | Not found (404), never "forbidden" | Pass |
| A-23 | FS | FR-014, FR-032, FR-034 | (18) Monthly Income: record a collection for `PH`, receipt `REHEARSAL-001`, type a wrong water figure first | Warns about water; saved; bill settled | Pass |
| A-24 | RE | FR-017 | (19) Record the same receipt again | Refused: already recorded | Pass |
| A-25 | RE, FS | FR-017, FR-029 | (19b) Open Monthly Income in a second tab. In the first, **Edit** `REHEARSAL-001` > **Delete payment**; then do the same in the second tab without refreshing it (the screen calls a void "Delete payment", and the row leaves the first tab's list) | First works; second refused: "That income record was already voided on …" | Pass |
| A-26 | FS | FR-005 | (20) Inquiries: reply to A-07's inquiry, close it | Message posted; Closed | Pass |
| A-27 | FS | FR-025, FR-027 | (21) Repairs: In Progress, Resolved, delete | Each saves; tenant gets "repair is done" | Pass |
| A-28 | FS | FR-018, FR-038, FR-039 | (22, 22b) Monthly Expenses: ₱100 REHEARSAL, edit, split 60/40, delete | Saves; total stays ₱100 when split | NT |
| A-29 | FS, CO | FR-044, FR-028 | (23) Download the Monthly Income and Monthly Expenses workbooks, open in Excel. They save as "Monthly Income September 2026 - MI092026.xlsx" and "Monthly Expenses September 2026 - ME092026.xlsx" | Open correctly; her layout | Pass |
| A-30 | RE | NFR-006 | (23b) With Overview open, disconnect the laptop's internet, reload | Money tiles show "—", never ₱0.00 | Fail |
| A-31 | FS | FR-009 | (24) Vacate the rehearsal tenant | `PH` Available; account inactive | Pass |
| A-32 | FS | FR-007 | (26) Set `PH` back to ₱30,000 | Saved | NT |
| A-33 | FS | FR-029, NFR-009 | Open **Activity** | Today's actions listed with who and when | Pass |
| A-34 | FS | FR-016 | Monthly Income: the payment verification queue | Opens; shows pending items or says there are none | Pass |
| A-35 | US | NFR-002 | Ask: "What would you use first tomorrow morning?" Write the answer |  | Pass |
| A-36 | SE, FS | FR-009 | **Before A-31**, on the REHEARSAL tenant only: Tenants > Edit > Reset password > confirm; sign in as that tenant with the new password (private window) | Confirmation says their phone is signed out; the password is shown once; signing in forces a new password; the old one is refused; Activity shows the reset without the password | Pass |

## Part T. Tenant tasks (testers coded T1 to T3; P done alone, PH done with help, F not done, NT not tried)

| ID | ISO | Req | T1 Time | T1 Result | T1 Errors | T2 Time | T2 Result | T2 Errors | T3 Time | T3 Result | T3 Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| T-01 | SE, US | FR-001 | 7:28 – 7:31 | PH | 2 | 8:08 – 8:10 | PH | 1 | 8:12 (log) | P | 0 |
| T-02 | SE, US | FR-001 | 7:31 – 7:32 | P | 0 | 8:10 – 8:12 | P | 0 | 8:12 (log) | P | 0 |
| T-03 | FS | FR-003 | 7:32 – 7:33 | P | 1 | 8:12 – 8:14 | PH | 1 |  | NT |  |
| T-04 | FS, US | FR-011, FR-013 | 7:34 – 7:36 | P | 0 | 8:14 – 8:15 | P | 0 |  | NT |  |
| T-05 | FS | FR-014 | 7:37 – 7:40 | P | 0 | 8:15 – 8:16 | P | 0 |  | NT |  |
| T-06 | US | FR-011 | 7:40 – 7:41 | P | 0 | 8:16 – 8:17 | P | 0 |  | NT |  |
| T-07 | US | NFR-002 | 7:32 – 7:35 | P | 0 | 8:13 – 8:15 | P | 0 |  | NT |  |
| T-08 | FS | FR-021, FR-023 | 7:34 (log) | P | 0 | 8:17 (log) | P | 0 | 8:15 (log) | P | 0 |
| T-09 | FS | FR-022 | 7:43 – 7:44 | P | 0 | 8:16 – 8:17 | P | 0 |  | NT |  |
| T-10 | FS | FR-026 |  | NT |  | 8:18 – 8:20 | P | 0 |  | NT |  |
| T-11 | FS | FR-024 | 7:45 – 7:46 | P | 0 | 8:18 – 8:20 | P | 0 |  | NT |  |
| T-12 | FS | FR-010 | 7:46 – 7:47 | P | 0 | 8:18 (log) | P | 0 | 8:20 (log) | P | 0 |
| T-13 | FS | FR-027 | 7:35 – 7:36 | P | 1 | 8:21 – 8:22 | P | 0 |  | NT |  |
| T-14 | FS | FR-015 | 7:35 (log) | P | 0 | 8:14 – 8:16 | P | 0 |  | NT |  |
| T-15 | SE | FR-002 | 7:48 – 7:49 | P | 0 | 8:22 – 8:23 | P | 0 |  | NT |  |
| T-16 | SE | FR-001 | 7:36 (log) | P | 0 |  | NT |  |  | NT |  |
| T-17 | SE | FR-001 | 7:36 – 7:38 | P | 0 |  | NT |  |  | NT |  |
| T-18 | US | NFR-002 | 7:50 – 7:52 | — | 0 | 8:25 – 8:27 | — | 0 | not timed | — | 0 |

## Part P. Public site

| ID | ISO | Req | Do | Should see | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| P-01 | FS | FR-003 | Open `hivelet.vercel.app` on a phone | Landing page, building photo, "Inquire now" | Pass |
| P-02 | FS | FR-003 | Browse the categories and units | 33 units in five clusters; only `PH` available | Pass |
| P-03 | SE | FR-003 | Open any occupied unit | No tenant name, phone or email anywhere | Pass |
| P-04 | US | FR-004 | Inquiry form: press Send with everything empty | Each missing field says what it needs | Pass |
| P-05 | US | FR-004 | Type a bad email and a short phone number | Plain messages under the fields; nothing sent | Pass |
| P-06 | FS | FR-004 | Send one real-looking inquiry (a team member's own details) | Confirmation with **Open your conversation**, **Copy the link** and a reference code; the owner sees it in Inquiries (A-26) | Pass |
| P-06b | FS | FR-004 | After the owner replies to P-06: open the link on the same phone, then on another phone open `/inquiry` and type the reference code and the phone number used | Her reply shows in both; write back once and it appears in her conversation, with a notification. A wrong code or wrong phone says only "No inquiry matches that" | Pass |
| P-07 | US | none | Open `/privacy` and `/terms` | Both readable on a phone | Pass |
| P-08 | RE | none | Open a made-up address, `/this-does-not-exist` | A friendly "not found" page with a way back | Pass |

## Part C. Simultaneous use

| ID | ISO | Req | Do (at the same moment) | Should see | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| C-01 | PE, RE | NFR-004 | All tenants refresh Overview together | Every screen loads; note the slowest (seconds) | Pass |
| C-02 | SE | FR-002 | Everyone checks the unit and name on screen | Each sees **only their own** unit. Any other name: STOP (guide §9) | Pass |
| C-03 | FS, RE | FR-026 | Every tenant posts a note on their request within the same minute | Every note saved once, none lost, none doubled | NT |
| C-04 | FS | FR-025 | Owner opens Repairs while C-03 happens, then refreshes | All new notes visible, each on the right request | NT |
| C-05 | FS | FR-027 | Owner moves two requests to In Progress | Those two tenants get a notification; the others do not | NT |
| C-06 | RE | NFR-006 | Two tenants double-tap Send on a note | Only one copy saved (the button disables while sending) | NT |
| C-07 | PE | NFR-004 | Owner opens Monthly Income for the whole year while tenants are active | Loads; note the time | Pass |
| C-08 | CO | NFR-005 | Owner uses the laptop, tenants use phones, at once | No one's session affects another's | Pass |

## Part O. Offline, weak signal and installing

| ID | ISO | Req | Do | Should see | Android | iPhone |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| O-01 | PO | FR-030 | Android Chrome: menu ⋮ > **Install app** (or Add to Home screen) | Hivelet icon on the home screen | Pass | n/a |
| O-02 | PO | FR-030 | iPhone Safari: Share > **Add to Home Screen** | Hivelet icon on the home screen | n/a | Pass |
| O-03 | PO | FR-030 | Open it from the icon | Opens full screen, no address bar, green top bar | Pass | Pass |
| O-04 | RE | FR-030 | Sign in, open Overview, then switch on **airplane mode** | Banner: "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." | Pass | Pass |
| O-05 | RE | FR-030 | Still offline: move between the tenant pages | The app still opens each page, and says it cannot load data; **never shows ₱0.00 or an empty list as if true** | Pass | Pass |
| O-06 | RE | FR-021 | Still offline: try to send a note on a request | A message that it could not reach the server; the typed text is **kept** | Pass | Pass |
| O-07 | RE | FR-030 | Switch airplane mode off | "Back online" notice; send the note again: it works, once | Pass | Pass |
| O-08 | RE, SE | FR-030 | Close the app fully, airplane mode on, open it from the icon | App opens; the tenant is **not** signed out; banner shows | Pass | Pass |
| O-09 | SE | FR-030 | Sign out, airplane mode on, open the app | No personal data visible anywhere | Pass | Pass |
| O-10 | RE | FR-003 | Offline: open the public units page | Units shown from memory, or a notice that availability cannot be shown (never a made-up list) | Pass | Pass |
| O-11 | RE | NFR-006 | **Weak signal**: on the laptop, DevTools > Network > **Slow 3G**; open Repairs and send a note | It gets there, slowly; the button shows "Sending…" and cannot be pressed twice | Pass (laptop) | n/a |
| O-12 | RE | NFR-006 | Weak signal that stops answering (walk to a dead spot, or on the laptop DevTools > Network > throttling > **Add** a custom profile with **60000 ms** latency, select it, then send) | Within 45 seconds a message says it cannot tell whether it was saved and to **check before sending again** | Fail | Pass |

## Part S. Security

| ID | ISO | Req | Do | Should see | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| S-01 | SE | NFR-003 | Mozilla HTTP Observatory, `hivelet.vercel.app` | Grade (write it). The 30 Sep 00:04 run gave **B, 75/100, 11 of 12**, its one failure the Content Security Policy being report-only; the policy was switched to enforcing later that morning, and a scan at about 10:07 gave **A+, 115/100, 12 of 12**. Write the grade you get and the time | Pass |
| S-02 | SE | NFR-003 | securityheaders.com | Grade. Expect **A+** (30 Sep 10:05) | Pass |
| S-03 | SE | NFR-003 | SSL Labs, `hivelet.vercel.app` | Grade. Expect **A+** (run 30 Sep 00:10; one of two addresses A) | Pass |
| S-04 | SE | FR-001 | Rehearsal tenant only: 5 wrong passwords | Locked for 15 minutes with a clear message. **Never on a real account** | Pass |
| S-05 | SE | FR-002 | Tenant opens `/admin` (T-15) | Refused | Pass |
| S-06 | SE | FR-002 | Signed out, open `/tenant` | Sent to sign-in | Pass |
| S-07 | SE | FR-001 | Tenant signs out; Back button (T-16) | No data | Pass |
| S-08 | SE | FR-001 | Slip password after the tenant changed it (T-17) | Refused | Pass |
| S-09 | SE | FR-029 | Activity shows today's password changes and admin actions, without any password in it | As described | Pass |
| S-10 | SE | FR-003 | Public pages and unit details: no tenant names (P-03) | As described | Pass |
| S-11 | SE | FR-002 | Foreign ticket id (A-22) | Not found | Pass |
| S-12 | SE | NFR-003 | Ask the owner: "Who else knows your password?" | Only she does (after A-09) | Pass |

## Part CO. Browsers and devices

| ID | Device and browser | Sign-in | Tenant pages | Admin pages | Install |
| :--- | :--- | :--- | :--- | :--- | :--- |
| CO-01 | Android, Chrome | Pass | Pass | n/a | Pass |
| CO-02 | Android, Samsung Internet (if a tenant has it) | NT | NT | NT | NT |
| CO-03 | iPhone, Safari | Pass | Pass | n/a | Pass |
| CO-04 | Windows laptop, Chrome | Pass | Pass | Pass | Pass |
| CO-05 | Windows laptop, Edge | Pass | Pass | Pass | Pass |
| CO-06 | Any, Firefox | Pass | Pass | Pass | n/a |

## Part PF. Performance timings (seconds)

| ID | Screen | Table 11 row | How | Laptop (s) | Phone (s) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PF-01 | Public home, first load | Public home page, first load | Cache cleared | 1.85 | 2.42 |
| PF-02 | Public home, second load | (supporting) | Normal reload | 0.62 | 0.95 |
| PF-03 | Sign in to Overview | Sign-in to dashboard | Stopwatch from pressing Sign in to figures shown | 2.10 | 2.88 |
| PF-04 | Monthly Income, full year | Income ledger, one full year | Stopwatch to the last row visible | 1.45 | n/a |
| PF-05 | Monthly Income workbook export | Excel export of one year | Stopwatch from click to file saved | 2.30 | n/a |
| PF-06 | Tenant Overview, first load | Tenant portal, first load | Cache cleared | 2.15 | 3.05 |
| PF-07 | Tenant Payments | (supporting) | Stopwatch | 1.20 | 1.78 |
| PF-08 | Send a repair request | (supporting) | Stopwatch from Send to confirmation | 1.65 | 2.10 |
| PF-09 | PageSpeed Insights, mobile, `hivelet.vercel.app` | (supporting) | pagespeed.web.dev, note the four scores and LCP. Expect about **86 / 100 / 100 / 100, LCP about 3.5 s** (30 Sep 10:15, after the phone photos); a few points either way is the network | 88 / 100 / 100 / 100, LCP 3.4 s | 85 / 100 / 100 / 100, LCP 3.6 s |
| PF-10 | Lighthouse in DevTools on a signed-in page | (supporting) | DevTools > Lighthouse > Analyze, on the laptop. **Laptop column = Desktop mode; Phone column = Mobile mode** (Lighthouse's emulated phone, run on the laptop, not on a real phone) | 84 / 98 / 100 / 100, LCP 3.2 s | 82 / 96 / 100 / 100, LCP 3.7 s |

## Part N. Changes shipped on 30 September

| ID | ISO | Req | Do | Should see | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N-01 | FS, US | FR-011, FR-013 | On a tenant's own account (a testing tenant, with their permission, or during T-05): **Payments** > **Your rent, month by month** | A sentence "Paid up to …" with Up to date / Due soon / Overdue; a bar per month (Paid, Due, Nothing recorded, Not due yet); Months paid, Paid in these months, Due now; **Show each month as a list**. The months and amounts agree with the tenant's own receipts (ask them) | NT |
| N-02 | FS, RE | FR-003 | `/category/studio` (then one-bedroom, two-bedroom): tap units quickly one after another, across floors and on the same floor, then stop | The floor plan is always shown for the last unit tapped, never a blank box, without refreshing | Automated test, 30 Sep 14:36, headless Chrome on the live site, 390 px and 1280 px, all four categories (33 units): every unit tapped 60 ms apart, two units alternated 40 ms apart, first then last at once; plan visible and loaded after all 20 rounds (20/20). **Real phone: pending** |
| N-03 | FS, RE | FR-003 | Open `hivelet.vercel.app/public`; read the pop-up | "1 unit is vacant right now" (only `PH` is vacant), then "Viewings are by appointment…" and **Inquire now**. With no signal: the old text, never a number | Automated test, 30 Sep: the live pop-up said "1 unit is vacant right now", matching `/api/public/rooms` (32 Occupied, 1 Available, `PH`). **Real phone: pending** |
