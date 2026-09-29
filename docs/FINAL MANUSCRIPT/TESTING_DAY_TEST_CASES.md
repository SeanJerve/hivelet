# Testing Day Test Cases, 30 September 2026

**Written 2026-09-29.** The test cases for the first test of Hivelet by the owner and real tenants.
How to run the day is in `TESTING_DAY_GUIDE.md`; read that first.

**How to use this file.** Print it. Each case has an ID, the quality it tests (ISO/IEC 25010), the
requirement it traces to (`docs/03_REQUIREMENTS.md`), what to do, and what should happen. Fill
**Result** with **P** (pass), **PH** (pass with help), **F** (fail) or **NT** (not tested), and put
the evidence file name in **Evidence**. A fail always gets a line in the defect log.

**Where each part goes in Chapter 4**

| Part | Cases | Chapter 4 |
| :--- | :--- | :--- |
| A. Owner / administrator | A-01 to A-36 | §4.3.4, Table 10 (the walkthrough steps are A-05 to A-32) |
| T. Tenant tasks | T-01 to T-18 | §4.3.7, Table 11C |
| P. Public site | P-01 to P-08 | §4.3.4, Table 10 steps 1 to 3 |
| C. Simultaneous use | C-01 to C-08 | §4.3.7, Table 11D |
| O. Offline, weak signal, install | O-01 to O-12 | §4.3.7, compared with §4.3.6, Table 11A (measured 29 Sep) |
| PF. Performance timings | PF-01 to PF-10 | §4.3.5, Table 11 |
| S. Security | S-01 to S-12 | §4.4.8 supporting evidence |
| CO. Compatibility | CO-01 to CO-06 | §4.4.5 supporting evidence |

**ISO/IEC 25010 characteristics used below:** FS Functional Suitability, PE Performance
Efficiency, CO Compatibility, US Usability, RE Reliability, SE Security, MA Maintainability, PO
Portability. Quality in use (ISO/IEC 25010's second model) is measured in part T by task success
(effectiveness), time on task (efficiency) and the survey (satisfaction).

---

## Part A. Owner / administrator

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
| A-25 | RE, FS | FR-017, FR-029 | (19b) Void `REHEARSAL-001`, then void it again | First works; second refused | | |
| A-26 | FS | FR-005 | (20) Inquiries: reply to A-07's enquiry, close it | Message posted; Closed | | |
| A-27 | FS | FR-025, FR-027 | (21) Repairs: In Progress, Resolved, delete | Each saves; tenant gets "repair is done" | | |
| A-28 | FS | FR-018, FR-038, FR-039 | (22, 22b) Monthly Expenses: ₱100 REHEARSAL, edit, split 60/40, delete | Saves; total stays ₱100 when split | | |
| A-29 | FS, CO | FR-044, FR-028 | (23) Download income.xlsx and expenses.xlsx, open in Excel | Open correctly; her layout | | |
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

---

## Part T. Tenant tasks (read aloud; English, then Filipino)

On the tenant's **own phone**. The observer writes: start and end time, **success** (P, PH with
help, F), number of **errors** (wrong taps that led somewhere unintended), and what they said.
These three numbers per task are the quality-in-use measures Chapter 4 reports.

| ID | ISO | Req | Task card (read aloud) | Should happen | Time | Result | Errors | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :-- | :-- | :--- |
| T-01 | SE, US | FR-001 | "Sign in with the slip we gave you." *Mag-sign in po gamit ang slip na ibinigay namin.* | Asked to choose a new password straight away | | | | |
| T-02 | SE, US | FR-001 | "Choose your own password." *Gumawa po ng sariling password.* | Rules shown (10+ characters, a letter, a number); a weak one is refused with a reason; a good one lands on Overview | | | | |
| T-03 | FS | FR-003 | "Which unit is yours and how much is the rent?" *Anong unit ninyo at magkano ang upa?* | Their correct unit and rate | | | | |
| T-04 | FS, US | FR-011, FR-013 | "Do you owe anything right now?" *May utang po ba kayo ngayon?* | The answer is clear on screen, and matches what they believe | | | | |
| T-05 | FS | FR-014 | "Find your payments this year." *Hanapin po ang mga bayad ninyo ngayong taon.* | Their receipts listed; **ask them if the list is right** and write the answer | | | | |
| T-06 | US | FR-011 | "How is your bill made up?" *Paano po nabuo ang bill ninyo?* | Rent and water (₱200 per occupant) visible | | | | |
| T-07 | US | NFR-002 | "Find where to report something broken." *Hanapin po kung saan magre-report ng sira.* | Finds Repairs | | | | |
| T-08 | FS | FR-021, FR-023 | "Report it, and say how urgent it is." *I-report po at sabihin kung gaano kaapurahan.* (real problem, or title starting TEST) | "was sent to the landlady"; appears in their list | | | | |
| T-09 | FS | FR-022 | "Add a photo of it." *Maglagay po ng litrato.* | Attached, or a plain message that it is too big | | | | |
| T-10 | FS | FR-026 | "Add a note to your request." *Magdagdag po ng mensahe sa request.* | Note appears in the thread | | | | |
| T-11 | FS | FR-024 | "What is its status now?" *Ano po ang status nito?* | Status visible (Open / In Progress / Resolved) | | | | |
| T-12 | FS | FR-010 | "Check your contact details and fix anything wrong." *Tingnan po ang contact details ninyo.* | Saved, or nothing to change | | | | |
| T-13 | FS | FR-027 | "Do you have any notifications?" *May notification po ba kayo?* | Bell opens; marking one read lowers the count | | | | |
| T-14 | FS | FR-015 | "Open the GCash payment, but **do not pay**. Close it." *Buksan po ang GCash pero huwag magbayad. Isara.* | GCash option appears; closing it changes nothing | | | | |
| T-15 | SE | FR-002 | "Type `/admin` at the end of the address." *I-type po ang /admin sa dulo ng address.* | Not allowed in; sent back to their own pages | | | | |
| T-16 | SE | FR-001 | "Sign out, then press Back." *Mag-sign out po, tapos pindutin ang Back.* | No personal data shown after sign-out | | | | |
| T-17 | SE | FR-001 | "Sign in again with your **new** password." *Mag-sign in po ulit gamit ang bagong password.* | Works; the slip password no longer works | | | | |
| T-18 | US | NFR-002 | "Was anything confusing?" *May nakalito po ba?* Write their words exactly | | | | | |

**After the tenant's last task**, the survey (Section 3 of the form).

**Quality in use, computed afterwards per task and overall** (Claude does this from the sheets):
task success rate = tasks passed without help ÷ tasks attempted; time on task = median seconds;
errors per task = mean.

---

## Part P. Public site (no sign-in)

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| P-01 | FS | FR-003 | Open `hivelet.vercel.app` on a phone | Landing page, building photo, "Inquire now" | | |
| P-02 | FS | FR-003 | Browse the categories and units | 33 units in five clusters; only `PH` available | | |
| P-03 | SE | FR-003 | Open any occupied unit | No tenant name, phone or email anywhere | | |
| P-04 | US | FR-004 | Enquiry form: press Send with everything empty | Each missing field says what it needs | | |
| P-05 | US | FR-004 | Type a bad email and a short phone number | Plain messages under the fields; nothing sent | | |
| P-06 | FS | FR-004 | Send one real-looking enquiry (a team member's own details) | Confirmation; the owner sees it in Inquiries (A-26) | | |
| P-07 | US | none | Open `/privacy` and `/terms` | Both readable on a phone | | |
| P-08 | RE | none | Open a made-up address, `/this-does-not-exist` | A friendly "not found" page with a way back | | |

**Do not send more than two enquiries from the same wifi in 15 minutes.** The limit is ten per
connection, shared by everyone on the house wifi, and a hit blocks the real visitors too.

---

## Part C. Simultaneous use (everyone at once)

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

---

## Part O. Offline, weak signal and installing the app

At least one Android phone with Chrome and one iPhone with Safari. The system is designed so that
**the app itself opens offline, public unit information is shown from the phone's memory, and
personal and financial data is never kept on the phone** (Chapter 4, §4.2.7; the delimitation in
§1.4). These cases check exactly that promise, no more.

| ID | ISO | Req | Do | Should see | Android | iPhone | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :-- | :--- |
| O-01 | PO | FR-030 | Android Chrome: menu ⋮ > **Install app** (or Add to Home screen) | Hivelet icon on the home screen | | n/a | |
| O-02 | PO | FR-030 | iPhone Safari: Share > **Add to Home Screen** | Hivelet icon on the home screen | n/a | | |
| O-03 | PO | FR-030 | Open it from the icon | Opens full screen, no address bar, green top bar | | | |
| O-04 | RE | FR-030 | Sign in, open Overview, then switch on **airplane mode** | Banner: "No connection. You can read what is already loaded, but nothing can be saved or paid until it is back." | | | |
| O-05 | RE | FR-030 | Still offline: move between the tenant pages | The app still opens each page, and says it cannot load data; **never shows ₱0.00 or an empty list as if true** | | | |
| O-06 | RE | FR-021 | Still offline: try to send a note on a request | A message that it could not reach the server; the typed text is **kept** | | | |
| O-07 | RE | FR-030 | Switch airplane mode off | "Back online" notice; send the note again: it works, once | | | |
| O-08 | RE, SE | FR-030 | Close the app fully, airplane mode on, open it from the icon | App opens; the tenant is **not** signed out; banner shows | | | |
| O-09 | SE | FR-030 | Sign out, airplane mode on, open the app | No personal data visible anywhere | | | |
| O-10 | RE | FR-003 | Offline: open the public units page | Units shown from memory, or a notice that availability cannot be shown (never a made-up list) | | | |
| O-11 | RE | NFR-006 | **Weak signal**: on the laptop, DevTools > Network > **Slow 3G**; open Repairs and send a note | It gets there, slowly; the button shows "Sending…" and cannot be pressed twice | | | |
| O-12 | RE | NFR-006 | Weak signal that stops answering (walk to a dead spot, or DevTools **Offline** right after pressing Send) | Within 45 seconds a message says it cannot tell whether it was saved and to **check before sending again** | | | |

O-12 depends on the request deadline added on 29 September (`frontend/src/lib/api.ts`). If that
change is not live yet, a save on a dead connection spins until the browser gives up; record what
happens either way.

---

## Part PF. Performance timings (Table 11)

On the **Table 2 laptop** and the **Table 3 phone**. Write the model, browser, network and date on
the timing sheet. **Three runs each, report the middle one.** First load = cache cleared (laptop:
DevTools > Network > Disable cache; phone: a private tab). Laptop times from DevTools' Network tab
(**DOMContentLoaded** and **Load** at the bottom); "usable" = stopwatch until the figures you came
for are on screen.

| ID | Screen | Table 11 row | How | Laptop (s) | Phone (s) |
| :-- | :--- | :--- | :--- | :-- | :-- |
| PF-01 | Public home, first load | Public home page, first load | Cache cleared | | |
| PF-02 | Public home, second load | (supporting) | Normal reload | | |
| PF-03 | Sign in to Overview | Sign-in to dashboard | Stopwatch from pressing Sign in to figures shown | | |
| PF-04 | Monthly Income, full year | Income ledger, one full year | Stopwatch to the last row visible | | n/a |
| PF-05 | income.xlsx export | Excel export of one year | Stopwatch from click to file saved | | n/a |
| PF-06 | Tenant Overview, first load | Tenant portal, first load | Cache cleared | | |
| PF-07 | Tenant Payments | (supporting) | Stopwatch | | |
| PF-08 | Send a repair request | (supporting) | Stopwatch from Send to confirmation | | |
| PF-09 | PageSpeed Insights, mobile, `hivelet.vercel.app` | (supporting) | pagespeed.web.dev, note the four scores and LCP | | |
| PF-10 | Lighthouse in DevTools on a signed-in page | (supporting) | DevTools > Lighthouse > Mobile > Analyze | | |

---

## Part S. Security

**Passive only.** Record grade, date and a screenshot of each. Never an active scan (guide §6).

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| S-01 | SE | NFR-003 | Mozilla HTTP Observatory, `hivelet.vercel.app` | Grade (write it); note that the Content Security Policy is still in report-only mode | | |
| S-02 | SE | NFR-003 | securityheaders.com | Grade | | |
| S-03 | SE | NFR-003 | SSL Labs, `hivelet.vercel.app` | Grade | | |
| S-04 | SE | FR-001 | Rehearsal tenant only: 5 wrong passwords | Locked for 15 minutes with a clear message. **Never on a real account** | | |
| S-05 | SE | FR-002 | Tenant opens `/admin` (T-15) | Refused | | |
| S-06 | SE | FR-002 | Signed out, open `/tenant` | Sent to sign-in | | |
| S-07 | SE | FR-001 | Tenant signs out; Back button (T-16) | No data | | |
| S-08 | SE | FR-001 | Slip password after the tenant changed it (T-17) | Refused | | |
| S-09 | SE | FR-029 | Activity shows today's password changes and admin actions, without any password in it | As described | | |
| S-10 | SE | FR-003 | Public pages and unit details: no tenant names (P-03) | As described | | |
| S-11 | SE | FR-002 | Foreign ticket id (A-22) | Not found | | |
| S-12 | SE | NFR-003 | Ask the owner: "Who else knows your password?" | Only she does (after A-09) | | |

---

## Part CO. Compatibility matrix

Tick each browser and device the system was actually used on tomorrow, with the result.

| ID | Device and browser | Sign-in | Tenant pages | Admin pages | Install | Notes |
| :-- | :--- | :-- | :-- | :-- | :-- | :--- |
| CO-01 | Android, Chrome | | | n/a | | |
| CO-02 | Android, Samsung Internet (if a tenant has it) | | | n/a | | |
| CO-03 | iPhone, Safari | | | n/a | | |
| CO-04 | Windows laptop, Chrome | | | | | |
| CO-05 | Windows laptop, Edge | | | | | |
| CO-06 | Any, Firefox | | | | n/a | |

---

## Summary to fill at the end of the day

| Part | Cases run | Passed | Passed with help | Failed | Not tested |
| :--- | --: | --: | --: | --: | --: |
| A | | | | | |
| T (all tenants together) | | | | | |
| P | | | | | |
| C | | | | | |
| O | | | | | |
| S | | | | | |

Tested on build `_______` (live commit), by `____________`, on 30 September 2026.
